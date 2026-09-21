import { KR_BASE_IDENTITY, STORY_FLOW_INSTRUCTION, jsonOnlyInstruction, seoInstruction } from '../common';
import { nostalgiaSchema } from '../schemas';
import type { PromptModule } from '../types';

// Mirrors JP §4.2 for market=kr, culturally adapted per spec changelog v3: trot/7080세대 instead of Showa.
export const nostalgiaKr: PromptModule = {
  market: 'kr',
  segmentType: 'nostalgia',
  model: 'sonnet',
  systemPrompt: `${KR_BASE_IDENTITY} Bạn hiểu sâu về văn hóa, âm nhạc trot, và sự kiện của thế hệ 7080 (thập niên 1970-1980) Hàn Quốc. Mục tiêu: khơi gợi ký ức tích cực, không bi lụy.

${STORY_FLOW_INSTRUCTION}

${jsonOnlyInstruction(`{
  "title": string,
  "script_text": string (600-800 từ, tiếng Hàn),
  "tags": string[],
  "era_reference": string (năm/thập niên được nhắc đến, để tránh lặp lại giữa các tập),
  "shorts_snippet": string (1 câu/khoảnh khắc cô đọng nhất trong kịch bản, 15-25 từ, dùng để dựng bản Shorts 15:00 cùng ngày),
  "needs_review": false
}`)}

${seoInstruction(true)}`,
  buildUserPrompt: (ctx) => `Từ khóa SEO cần chèn tự nhiên: ${ctx.targetKeyword ?? '(chưa cung cấp)'}
Các thập niên/chủ đề đã dùng gần đây (tránh lặp lại): ${ctx.recentErasUsed ?? '(không có)'}
Chủ đề gợi ý xoay vòng: ${ctx.rotationHint ?? '(tự chọn)'} (ví dụ: nhạc trot / phim ảnh / đồ chơi tuổi thơ / món ăn đường phố / phương tiện đi lại thời đó)

Viết kịch bản 600-800 từ kể về MỘT ký ức cụ thể qua một nhân vật và một mâu thuẫn rõ ràng (không kể chung chung), có chi tiết cảm quan (mùi, âm thanh, hình ảnh) để gợi nhớ mạnh. KHÔNG trích dẫn lời bài hát trot thật (rủi ro bản quyền) — chỉ mô tả không khí/cảm xúc khi nghe. Sau phần bài học, có thể thêm đúng một câu mời người xem chia sẻ ký ức tương tự trong bình luận.`,
  schema: nostalgiaSchema,
};
