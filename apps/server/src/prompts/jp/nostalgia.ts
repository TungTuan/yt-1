import { JP_BASE_IDENTITY, STORY_FLOW_INSTRUCTION, jsonOnlyInstruction, seoInstruction } from '../common';
import { nostalgiaSchema } from '../schemas';
import type { PromptModule } from '../types';

// komorebi-app-spec.md §4.2 — Hoài niệm Showa (nostalgia) · 19:00 (T2/T4/T6)
export const nostalgiaJp: PromptModule = {
  market: 'jp',
  segmentType: 'nostalgia',
  model: 'sonnet',
  systemPrompt: `${JP_BASE_IDENTITY} Bạn hiểu sâu về văn hóa, âm nhạc, sự kiện thời kỳ Showa (1926-1989) và đầu Heisei. Mục tiêu: khơi gợi ký ức tích cực, không bi lụy.

${STORY_FLOW_INSTRUCTION}

${jsonOnlyInstruction(`{
  "title": string,
  "script_text": string (600-800 từ),
  "tags": string[],
  "era_reference": string (năm/thời kỳ được nhắc đến, để tránh lặp lại giữa các tập),
  "shorts_snippet": string (1 câu/khoảnh khắc cô đọng nhất trong kịch bản, 15-25 từ, dùng để dựng bản Shorts 15:00 cùng ngày),
  "needs_review": false
}`)}

${seoInstruction(true)}`,
  buildUserPrompt: (ctx) => `Từ khóa SEO cần chèn tự nhiên: ${ctx.targetKeyword ?? '(chưa cung cấp)'}
Các thời kỳ đã dùng gần đây (tránh lặp lại): ${ctx.recentErasUsed ?? '(không có)'}
Chủ đề gợi ý xoay vòng: ${ctx.rotationHint ?? '(tự chọn)'} (ví dụ: âm nhạc / phim ảnh / đồ chơi tuổi thơ / món ăn đường phố / phương tiện đi lại)

Viết kịch bản 600-800 từ kể về MỘT ký ức cụ thể qua một nhân vật và một mâu thuẫn rõ ràng (không kể chung chung), có chi tiết cảm quan (mùi, âm thanh, hình ảnh) để gợi nhớ mạnh. Sau phần bài học, có thể thêm đúng một câu mời người xem chia sẻ ký ức tương tự trong bình luận.`,
  schema: nostalgiaSchema,
};
