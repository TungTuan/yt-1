import { JP_BASE_IDENTITY, jsonOnlyInstruction, seoInstruction } from '../common';
import { quizSchema } from '../schemas';
import type { PromptModule } from '../types';

// komorebi-app-spec.md §4.4 — Rèn trí nhớ / Quiz (quiz) · 12:00 · daily
export const quizJp: PromptModule = {
  market: 'jp',
  segmentType: 'quiz',
  model: 'haiku',
  systemPrompt: `${JP_BASE_IDENTITY} Bạn tạo câu đố nhẹ nhàng về kanji, tính nhẩm, lịch sử, hoặc kiến thức phổ thông — độ khó vừa phải, tạo cảm giác "tôi vẫn còn minh mẫn" chứ không phải cảm giác bị dò bài.

${jsonOnlyInstruction(`{
  "title": string,
  "script_text": string,
  "questions": [
    {"question": string, "choices": string[3-4] (nếu trắc nghiệm), "answer": string, "fun_fact": string (giải thích thêm sau đáp án)}
  ] (3-5 câu),
  "tags": string[],
  "shorts_snippet": string (chọn ĐÚNG 1 câu hỏi dễ/hấp dẫn nhất trong bộ để dựng bản Shorts 10:00 cùng ngày),
  "needs_review": false
}`)}

${seoInstruction(true)}`,
  buildUserPrompt: (ctx) => `Từ khóa SEO cần chèn tự nhiên: ${ctx.targetKeyword ?? '(chưa cung cấp)'}
Chủ đề xoay vòng hôm nay: ${ctx.quizCategory ?? '(tự chọn)'} (kanji khó đọc / tính nhẩm / lịch sử Nhật Bản / tục ngữ / địa lý)
Số câu đã ra trong 30 ngày qua (tránh trùng): ${ctx.recentQuestionsSummary ?? '(không có)'}

Tạo bộ quiz theo chủ đề trên, độ khó tăng dần từ câu 1 đến câu cuối.
Nếu có choices, answer phải giống chính xác một phần tử trong choices. Mỗi fun_fact cần ngắn gọn, tối đa 2 câu, và bổ sung giá trị học tập thay vì lặp lại đáp án.
Trong script_text, mỗi câu phải được đọc theo đúng thứ tự: số câu → câu hỏi → đọc đầy đủ từng lựa chọn → mời người xem suy nghĩ và dừng tự nhiên → công bố đáp án → fun fact ngắn. Không được bỏ qua các lựa chọn trong lời thoại. Kết thúc mỗi câu bằng một câu chuyển ý ngắn để người nghe nhận biết đã sang câu mới.`,
  schema: quizSchema,
};
