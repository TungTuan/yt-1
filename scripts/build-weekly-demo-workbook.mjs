import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const projectRoot = '/Users/tung/Documents/youtube-1';
const sourcePath = `${projectRoot}/exports/week1-komorebi-v2.xlsx`;
const outputDir = `${projectRoot}/outputs/weekly-flow-demo`;
const outputPath = `${outputDir}/komorebi-weekly-content-demo.xlsx`;
const font = 'Arial';

const source = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sourceSchedule = source.worksheets.getItem('Weekly_Schedule').getUsedRange().values;
const sourceQuiz = source.worksheets.getItem('Quiz_Questions').getUsedRange().values;

const sourceHeaders = sourceSchedule[0].map(String);
const wantedSegments = new Set(['morning_news', 'quiz', 'nostalgia', 'bedtime_story']);
const selected = sourceSchedule.slice(1).filter((row) => {
  const record = Object.fromEntries(sourceHeaders.map((key, index) => [key, row[index]]));
  const rawDate = record.scheduled_date;
  const date = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate).slice(0, 10);
  return record.market === 'jp' && date === '2026-09-21' && wantedSegments.has(String(record.segment_type));
});

const headers = [
  'market', 'scheduled_date', 'time_slot', 'segment_type', 'title', 'script_text', 'tags',
  'needs_review', 'shorts_snippet', 'target_keyword', 'seo_title', 'seo_description', 'seo_tags', 'hashtags',
];
const hashtagsBySegment = {
  morning_news: '#朝の習慣,#シニアライフ,#こもれび便り',
  quiz: '#脳トレ,#漢字クイズ,#こもれび便り',
  nostalgia: '#昭和の思い出,#昭和レトロ,#こもれび便り',
  bedtime_story: '#朗読,#眠れない夜,#こもれび便り',
};
const keywordBySegment = {
  morning_news: '朝の一言',
  quiz: '脳トレ 漢字クイズ',
  nostalgia: '昭和レトロ',
  bedtime_story: '朗読 睡眠',
};
const titlePrefixBySegment = {
  morning_news: '朝の一言',
  quiz: '脳トレ漢字クイズ',
  nostalgia: '昭和レトロ',
  bedtime_story: '朗読 睡眠',
};
const descriptionLeadBySegment = {
  morning_news: '季節の便りと、今日を穏やかに始めるための短いお話をお届けします。',
  quiz: '読み方が難しい漢字に、楽しみながら挑戦する脳トレクイズです。',
  nostalgia: '昭和の学校給食と脱脂粉乳の記憶を、懐かしい教室の風景とともに振り返ります。',
  bedtime_story: '眠れない夜にゆっくり聴ける、静かな連続朗読「小さな駅の物語」です。',
};

const rows = selected.map((row) => {
  const record = Object.fromEntries(sourceHeaders.map((key, index) => [key, row[index]]));
  return headers.map((key) => {
    if (key === 'hashtags') return hashtagsBySegment[record.segment_type] ?? '#こもれび便り';
    if (key === 'target_keyword') return keywordBySegment[record.segment_type] ?? '';
    if (key === 'seo_title') return `${titlePrefixBySegment[record.segment_type] ?? ''}｜${record.title}`;
    if (key === 'seo_description') {
      return `${descriptionLeadBySegment[record.segment_type] ?? ''}\n\n青い小鳥の「こまち」と一緒に、焦らず、自分のペースでお楽しみください。`;
    }
    if (key === 'seo_tags') return `${record.tags ?? ''},こもれび便り,シニア`;
    return record[key] ?? '';
  });
});

const workbook = Workbook.create();
const flow = workbook.worksheets.add('Flow');
const schedule = workbook.worksheets.add('Weekly_Schedule');
const quiz = workbook.worksheets.add('Quiz_Questions');

flow.showGridLines = false;
flow.getRange('A2:F2').merge();
flow.getRange('A2').values = [['Weekly content production flow']];
flow.getRange('A2').format.font = { name: font, size: 16, bold: true, color: '#263238' };
flow.getRange('A3:F3').format.borders = { bottom: { style: 'thin', color: '#9FB8AC' } };
flow.getRange('A5:D8').values = [
  ['Step', 'Input', 'Output', 'Gate'],
  [1, 'Weekly brief + content memory', 'Excel content package', 'Review title, script, description and hashtags'],
  [2, 'Approved Excel rows', 'Rendered MP4', 'TTS duration and render must pass'],
  [3, 'Successful MP4 + selected assets', 'Thumbnail A/B/C', 'Thumbnail is never generated before video success'],
];
flow.getRange('A5:D5').format = { fill: '#38594C', font: { name: font, bold: true, color: '#FFFFFF' } };
flow.getRange('A6:D8').format.font = { name: font, size: 10, color: '#263238' };
flow.getRange('A5:D8').format.borders = { insideHorizontal: { style: 'thin', color: '#D7E1DC' }, bottom: { style: 'thin', color: '#9FB8AC' } };
flow.getRange('A10:D10').values = [['Weekly batch', '4 long-form', '3 derived Shorts', 'Thumbnail after render']];
flow.getRange('A10:D10').format = { fill: '#EAF2EE', font: { name: font, bold: true, color: '#38594C' } };
flow.getRange('A1:F12').format.verticalAlignment = 'center';
flow.getRange('A:A').format.columnWidth = 12;
flow.getRange('B:B').format.columnWidth = 32;
flow.getRange('C:C').format.columnWidth = 32;
flow.getRange('D:D').format.columnWidth = 52;
flow.tabColor = '#38594C';

schedule.showGridLines = false;
schedule.getRange('A1').write([headers, ...rows]);
schedule.freezePanes.freezeRows(1);
schedule.getRange(`A1:N1`).format = { fill: '#38594C', font: { name: font, size: 10, bold: true, color: '#FFFFFF' }, wrapText: true };
schedule.getRange(`A2:N${rows.length + 1}`).format.font = { name: font, size: 10, color: '#263238' };
schedule.getRange(`A1:N${rows.length + 1}`).format.verticalAlignment = 'top';
schedule.getRange(`A2:N${rows.length + 1}`).format.borders = { bottom: { style: 'thin', color: '#E1E7E4' } };
schedule.getRange(`B2:B${rows.length + 1}`).setNumberFormat('yyyy-mm-dd');
for (const [col, width] of Object.entries({ A: 9, B: 13, C: 10, D: 18, E: 34, F: 70, G: 22, H: 13, I: 50, J: 24, K: 42, L: 70, M: 34, N: 36 })) {
  schedule.getRange(`${col}:${col}`).format.columnWidth = width;
}
schedule.getRange(`E2:E${rows.length + 1}`).format.wrapText = true;
schedule.getRange(`F2:F${rows.length + 1}`).format.wrapText = false;
schedule.getRange(`G2:N${rows.length + 1}`).format.wrapText = true;
schedule.getRange(`2:${rows.length + 1}`).format.rowHeight = 72;
schedule.tabColor = '#6E9C87';

const quizHeaders = sourceQuiz[0].map(String);
const quizRows = sourceQuiz.slice(1).filter((row) => {
  const record = Object.fromEntries(quizHeaders.map((key, index) => [key, row[index]]));
  const rawDate = record.date;
  const date = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate).slice(0, 10);
  return record.market === 'jp' && date === '2026-09-21';
});
quiz.showGridLines = false;
quiz.getRange('A1').write([quizHeaders, ...quizRows]);
quiz.freezePanes.freezeRows(1);
const quizEndCol = String.fromCharCode(64 + quizHeaders.length);
quiz.getRange(`A1:${quizEndCol}1`).format = { fill: '#A66E35', font: { name: font, size: 10, bold: true, color: '#FFFFFF' }, wrapText: true };
quiz.getRange(`A2:${quizEndCol}${quizRows.length + 1}`).format.font = { name: font, size: 10, color: '#263238' };
quiz.getRange(`A1:${quizEndCol}${quizRows.length + 1}`).format.verticalAlignment = 'top';
quiz.getRange(`B2:B${quizRows.length + 1}`).setNumberFormat('yyyy-mm-dd');
quiz.getRange(`C:${quizEndCol}`).format.columnWidth = 28;
quiz.getRange(`A:B`).format.columnWidth = 13;
quiz.getRange(`C2:${quizEndCol}${quizRows.length + 1}`).format.wrapText = true;

workbook.recalculate();
await fs.mkdir(outputDir, { recursive: true });
for (const sheetName of ['Flow', 'Weekly_Schedule', 'Quiz_Questions']) {
  const preview = await workbook.render({ sheetName, autoCrop: 'all', scale: 1, format: 'png' });
  await fs.writeFile(`${outputDir}/preview-${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
const check = await workbook.inspect({ kind: 'table', range: `Weekly_Schedule!A1:N${rows.length + 1}`, include: 'values,formulas', tableMaxRows: 8, tableMaxCols: 14 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 100 }, summary: 'final formula error scan' });
console.log(errors.ndjson);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
