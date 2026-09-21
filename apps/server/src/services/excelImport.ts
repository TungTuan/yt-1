import ExcelJS from 'exceljs';
import { prisma } from '../db';
import { containsCrisisKeyword } from '../config';
import {
  IMPORTABLE_TIME_SLOTS,
  REVIEW_REQUIRED_SEGMENT_TYPES,
  type ExcelImportResult,
  type ExcelImportRowError,
  type Market,
  type ScriptMetadata,
  type SegmentType,
} from '@komorebi/shared-types';
import { QUIZ_QUESTIONS_COLUMNS, WEEKLY_SCHEDULE_COLUMNS } from './excelTemplate';
import { buildFallbackSeo, validateSeoTitle } from './seo';
import { findRiskyClaim } from './contentQuality';

const VALID_MARKETS: Market[] = ['jp', 'kr'];
const VALID_SEGMENT_TYPES: SegmentType[] = [
  'morning_news',
  'nostalgia',
  'letter_reading',
  'quiz',
  'bedtime_story',
  'companionship',
  'gratitude_ritual',
];

interface RawRow {
  rowNumber: number;
  cells: Record<string, unknown>;
}

function unwrapExcelCellValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const cellValue = value as {
    result?: unknown;
    text?: unknown;
    richText?: Array<{ text?: unknown }>;
  };
  if ('result' in cellValue) return unwrapExcelCellValue(cellValue.result);
  if ('text' in cellValue) return unwrapExcelCellValue(cellValue.text);
  if (Array.isArray(cellValue.richText)) {
    return cellValue.richText.map((part) => String(part.text ?? '')).join('');
  }
  return value;
}

function readSheetRows(sheet: ExcelJS.Worksheet, columns: readonly string[]): RawRow[] {
  const rows: RawRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const cells: Record<string, unknown> = {};
    let hasAnyValue = false;
    columns.forEach((key, idx) => {
      const cell = row.getCell(idx + 1);
      // ExcelJS returns objects for formulas, hyperlinks and rich text. Normalize
      // every supported representation before validation and persistence.
      const value = unwrapExcelCellValue(cell.value);
      if (value !== null && value !== undefined && value !== '') hasAnyValue = true;
      cells[key] = value;
    });
    if (hasAnyValue) rows.push({ rowNumber, cells });
  });
  return rows;
}

function toTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function parseBoolean(value: unknown): boolean {
  const s = toTrimmedString(value).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'x';
}

function parseDateOnly(value: unknown): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const s = toTrimmedString(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Maps a plain '07:00' style value to the Prisma TimeSlot enum member name. */
function toTimeSlotEnum(value: string): 'SLOT_0700' | 'SLOT_1000' | 'SLOT_1200' | 'SLOT_1500' | 'SLOT_1900' | 'SLOT_2100' | null {
  const map: Record<string, any> = {
    '07:00': 'SLOT_0700',
    '10:00': 'SLOT_1000',
    '12:00': 'SLOT_1200',
    '15:00': 'SLOT_1500',
    '19:00': 'SLOT_1900',
    '21:00': 'SLOT_2100',
  };
  return map[value] ?? null;
}

export async function importWeeklyExcel(buffer: Buffer): Promise<ExcelImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);

  const scheduleSheet = wb.getWorksheet('Weekly_Schedule');
  if (!scheduleSheet) {
    return {
      successCount: 0,
      errorCount: 1,
      errors: [{ row: 0, message: "Không tìm thấy sheet 'Weekly_Schedule' trong file." }],
      createdIds: [],
    };
  }
  const quizSheet = wb.getWorksheet('Quiz_Questions');

  const scheduleRows = readSheetRows(scheduleSheet, WEEKLY_SCHEDULE_COLUMNS);
  const quizRows = quizSheet ? readSheetRows(quizSheet, QUIZ_QUESTIONS_COLUMNS) : [];

  const errors: ExcelImportRowError[] = [];
  const createdIds: string[] = [];

  for (const row of scheduleRows) {
    const rowErrors: string[] = [];
    const market = toTrimmedString(row.cells.market).toLowerCase() as Market;
    const segmentType = toTrimmedString(row.cells.segment_type).toLowerCase() as SegmentType;
    const timeSlotRaw = toTrimmedString(row.cells.time_slot);
    const title = toTrimmedString(row.cells.title);
    const scriptText = toTrimmedString(row.cells.script_text);
    const date = parseDateOnly(row.cells.scheduled_date);

    if (!VALID_MARKETS.includes(market)) {
      rowErrors.push(`market không hợp lệ: "${row.cells.market}" (chỉ chấp nhận jp/kr)`);
    }
    if (!date) {
      rowErrors.push(`scheduled_date không hợp lệ: "${row.cells.scheduled_date}" (định dạng YYYY-MM-DD)`);
    }
    const timeSlotEnum = toTimeSlotEnum(timeSlotRaw);
    if (!timeSlotEnum || !IMPORTABLE_TIME_SLOTS.includes(timeSlotRaw as any)) {
      rowErrors.push(
        `time_slot không hợp lệ: "${row.cells.time_slot}" (chỉ chấp nhận ${IMPORTABLE_TIME_SLOTS.join(', ')})`,
      );
    }
    if (!VALID_SEGMENT_TYPES.includes(segmentType)) {
      rowErrors.push(`segment_type không hợp lệ: "${row.cells.segment_type}"`);
    }
    if (!title) rowErrors.push('title là bắt buộc');
    if (!scriptText) rowErrors.push('script_text là bắt buộc');

    if (rowErrors.length > 0) {
      errors.push({ row: row.rowNumber, message: rowErrors.join('; ') });
      continue;
    }

    const tags = toTrimmedString(row.cells.tags)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const requestedKeyword = toTrimmedString(row.cells.target_keyword);
    const fallbackSeo = buildFallbackSeo({
      market,
      segmentType,
      title,
      scriptText,
      tags,
      targetKeyword: requestedKeyword || undefined,
      dayIndex: Math.floor((date as Date).getTime() / 86_400_000),
    });
    const seoTitle = toTrimmedString(row.cells.seo_title) || fallbackSeo.seoTitle;
    const seoDescription = toTrimmedString(row.cells.seo_description) || fallbackSeo.seoDescription;
    const seoTags = (toTrimmedString(row.cells.seo_tags) || fallbackSeo.seoTags.join(','))
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
    const hashtags = toTrimmedString(row.cells.hashtags)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
      .slice(0, 3);
    const descriptionWithHashtags = hashtags.length > 0
      ? `${seoDescription.replace(/\s+$/, '')}\n\n${hashtags.join(' ')}`
      : seoDescription;
    if (!validateSeoTitle(market, seoTitle, fallbackSeo.targetKeyword ?? '')) {
      errors.push({ row: row.rowNumber, message: 'seo_title phải chứa target_keyword gần đầu tiêu đề.' });
      continue;
    }

    // letter_reading / companionship ALWAYS need review — no bypass via Excel (TICKET-003b AC).
    let needsReview =
      REVIEW_REQUIRED_SEGMENT_TYPES.includes(segmentType) || parseBoolean(row.cells.needs_review);

    const scriptMetadata: ScriptMetadata = { tags, hashtags };

    if (segmentType === 'quiz') {
      const matching = quizRows.filter((qr) => {
        const qMarket = toTrimmedString(qr.cells.market).toLowerCase();
        const qDate = parseDateOnly(qr.cells.date);
        return qMarket === market && qDate && date && dateKey(qDate) === dateKey(date);
      });
      scriptMetadata.questions = matching.map((qr) => ({
        question: toTrimmedString(qr.cells.question),
        choices: [
          toTrimmedString(qr.cells.choice_1),
          toTrimmedString(qr.cells.choice_2),
          toTrimmedString(qr.cells.choice_3),
          toTrimmedString(qr.cells.choice_4),
        ].filter(Boolean),
        answer: toTrimmedString(qr.cells.answer),
        fun_fact: toTrimmedString(qr.cells.fun_fact) || undefined,
      }));
    }

    // shorts_snippet only means something for quiz (-> Shorts 10:00) / nostalgia (-> Shorts 15:00)
    // per spec (TICKET-004 schemas); ignored for other segment_types even if a cell has stray text.
    const shortsSnippet = toTrimmedString(row.cells.shorts_snippet);
    if (shortsSnippet && (segmentType === 'quiz' || segmentType === 'nostalgia')) {
      scriptMetadata.shorts_snippet = shortsSnippet;
    }

    if (containsCrisisKeyword(market, scriptText)) {
      scriptMetadata.crisis_flagged = true;
      scriptMetadata.priority = 'high';
    }

    const claimWarning = findRiskyClaim(market, scriptText);
    if (claimWarning) {
      needsReview = true;
      scriptMetadata.medical_claim_warning = claimWarning;
      scriptMetadata.priority = 'high';
    }

    try {
      const created = await prisma.contentItem.create({
        data: {
          market,
          segmentType,
          scheduledDate: date as Date,
          timeSlot: timeSlotEnum as any,
          format: 'long_form',
          source: 'excel_import',
          status: needsReview ? 'needs_review' : 'scripted',
          title,
          scriptText,
          targetKeyword: fallbackSeo.targetKeyword,
          seoTitle,
          seoDescription: descriptionWithHashtags,
          seoTags,
          scriptMetadata: scriptMetadata as any,
        },
      });
      createdIds.push(created.id);
    } catch (err) {
      errors.push({
        row: row.rowNumber,
        message: `Lỗi khi ghi vào database: ${(err as Error).message}`,
      });
    }
  }

  return {
    successCount: createdIds.length,
    errorCount: errors.length,
    errors,
    createdIds,
  };
}
