import ExcelJS from 'exceljs';
import { IMPORTABLE_TIME_SLOTS } from '@komorebi/shared-types';

/**
 * Column layout used by both this generator and excelImport.ts.
 * Keep the two in sync — see WEEKLY_SCHEDULE_COLUMNS / QUIZ_QUESTIONS_COLUMNS below.
 */
export const WEEKLY_SCHEDULE_COLUMNS = [
  'market',
  'scheduled_date',
  'time_slot',
  'segment_type',
  'title',
  'script_text',
  'tags',
  'needs_review',
  'shorts_snippet',
  'target_keyword',
  'seo_title',
  'seo_description',
  'seo_tags',
  'hashtags',
] as const;

export const QUIZ_QUESTIONS_COLUMNS = [
  'market',
  'date',
  'question',
  'choice_1',
  'choice_2',
  'choice_3',
  'choice_4',
  'answer',
  'fun_fact',
] as const;

const SEGMENT_TYPES = [
  'morning_news',
  'nostalgia',
  'letter_reading',
  'quiz',
  'bedtime_story',
  'companionship',
  'gratitude_ritual',
];

export async function buildWeeklyTemplateWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'komorebi-haetsal-pipeline';
  wb.created = new Date();

  // --- Huong_dan (instructions) ---
  const guide = wb.addWorksheet('Huong_dan');
  guide.columns = [{ width: 28 }, { width: 90 }];
  const guideRows: [string, string][] = [
    ['Sheet', 'Ý nghĩa'],
    [
      'Weekly_Schedule',
      '1 dòng = 1 content_item dài (long_form). KHÔNG nhập Shorts trực tiếp — Shorts (quiz→10:00, ' +
        'nostalgia→15:00) được tạo từ cột shorts_snippet của dòng dài tương ứng. Lưu ý: bước tạo+render ' +
        'Shorts hiện vẫn là thao tác thủ công (TICKET-014 orchestrator tự động hoá chưa được xây), không ' +
        'tự chạy chỉ vì video dài đã rendered.',
    ],
    ['Quiz_Questions', 'Câu hỏi con cho các dòng có segment_type = quiz, liên kết theo market + date với Weekly_Schedule.'],
    ['', ''],
    ['Cột Weekly_Schedule', 'Ghi chú'],
    ['market', `Bắt buộc. Giá trị hợp lệ: jp, kr`],
    ['scheduled_date', 'Bắt buộc. Định dạng YYYY-MM-DD'],
    ['time_slot', `Bắt buộc. Giá trị hợp lệ: ${IMPORTABLE_TIME_SLOTS.join(', ')} (10:00 và 15:00 dành riêng cho Shorts tự động, không nhập ở đây)`],
    ['segment_type', `Bắt buộc. Giá trị hợp lệ: ${SEGMENT_TYPES.join(', ')}`],
    ['title', 'Bắt buộc.'],
    [
      'script_text',
      'Bắt buộc. Kịch bản đầy đủ. Với nostalgia và bedtime_story, luôn theo flow: hook gây tò mò trong 10 giây đầu → mở đầu ngắn → diễn biến có mâu thuẫn/lựa chọn → kết bài và bài học ý nghĩa. Viết liền mạch, không đọc tên các phần; dùng [PAUSE] ở điểm chuyển lớn.',
    ],
    ['tags', 'Tuỳ chọn. Danh sách tag cách nhau bởi dấu phẩy.'],
    ['needs_review', 'Tuỳ chọn: TRUE/FALSE. Với segment_type = letter_reading hoặc companionship, hệ thống LUÔN ép needs_review = TRUE bất kể giá trị ở đây.'],
    [
      'shorts_snippet',
      'Chỉ áp dụng cho segment_type = quiz (nguồn cho Shorts 10:00) hoặc nostalgia (nguồn cho Shorts 15:00). ' +
        'Đây LÀ script_text đầy đủ của bản Shorts (không phải toàn bộ script_text dài bị cắt) — hệ thống tổng hợp ' +
        'giọng đọc riêng cho đúng đoạn này. Nhắm khoảng 100-140 ký tự tiếng Nhật để ra video 15-30 giây. Bỏ trống ' +
        'với các segment_type khác (chưa hỗ trợ tạo Shorts).',
    ],
    ['target_keyword', 'Tuỳ chọn. Từ khoá chính theo đúng ngôn ngữ market; để trống để hệ thống chọn từ seo-keywords.json.'],
    ['seo_title', 'Tuỳ chọn. Dưới 60 ký tự và đặt target_keyword gần đầu; để trống để hệ thống tạo bản an toàn từ title.'],
    ['seo_description', 'Tuỳ chọn. 150 ký tự đầu mô tả rõ nội dung và chứa target_keyword. Quiz sẽ được bổ sung timestamp sau TTS.'],
    ['seo_tags', 'Tuỳ chọn. 5-8 tag, phân cách bằng dấu phẩy.'],
    ['hashtags', 'Tuỳ chọn. 3 hashtag hiển thị cuối description, phân cách bằng dấu phẩy; ví dụ #脳トレ,#シニアライフ,#こもれび便り.'],
    ['', ''],
    ['Cột Quiz_Questions', 'Ghi chú'],
    ['market + date', 'Phải khớp với market + scheduled_date của dòng Weekly_Schedule tương ứng (segment_type = quiz).'],
    ['question / choice_1..4 / answer', 'choice_1..4 tuỳ chọn (bỏ trống nếu không phải trắc nghiệm).'],
    ['fun_fact', 'Tuỳ chọn, giải thích thêm sau đáp án.'],
    ['', ''],
    ['Lưu ý', 'Xoá dòng ví dụ (màu xám) trong Weekly_Schedule trước khi tải lên nếu không muốn nó được import.'],
  ];
  guideRows.forEach((row, idx) => {
    const r = guide.addRow(row);
    if (idx === 0 || idx === 4 || idx === 14) r.font = { bold: true };
  });

  // --- Weekly_Schedule ---
  const schedule = wb.addWorksheet('Weekly_Schedule');
  schedule.columns = WEEKLY_SCHEDULE_COLUMNS.map((key) => ({
    header: key,
    key,
    width: key === 'script_text' ? 60 : 20,
  }));
  schedule.getRow(1).font = { bold: true };
  const exampleRow = schedule.addRow({
    market: 'jp',
    scheduled_date: '2026-09-21',
    time_slot: '07:00',
    segment_type: 'morning_news',
    title: '【ví dụ — xoá dòng này trước khi upload】朝の便り',
    script_text: 'おはようございます。今日も一日、穏やかに過ごせますように。',
    tags: 'morning,weather',
    needs_review: 'FALSE',
    shorts_snippet: '',
    target_keyword: '',
    seo_title: '',
    seo_description: '',
    seo_tags: '',
    hashtags: '',
  });
  exampleRow.font = { italic: true, color: { argb: 'FF888888' } };

  // --- Quiz_Questions ---
  const quiz = wb.addWorksheet('Quiz_Questions');
  quiz.columns = QUIZ_QUESTIONS_COLUMNS.map((key) => ({
    header: key,
    key,
    width: key === 'question' || key === 'fun_fact' ? 40 : 18,
  }));
  quiz.getRow(1).font = { bold: true };

  return wb;
}
