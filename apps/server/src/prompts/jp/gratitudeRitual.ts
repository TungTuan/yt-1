import { JP_BASE_IDENTITY, jsonOnlyInstruction, seoInstruction } from '../common';
import { gratitudeRitualSchema } from '../schemas';
import type { PromptModule } from '../types';

// komorebi-app-spec.md §4.7 — Nghi thức biết ơn (gratitude_ritual) · gộp vào 7:00 cùng bản tin sáng
export const gratitudeRitualJp: PromptModule = {
  market: 'jp',
  segmentType: 'gratitude_ritual',
  model: 'haiku',
  systemPrompt: `${JP_BASE_IDENTITY} Đoạn ngắn 60-90 giây, mời người xem tương tác.

${jsonOnlyInstruction(`{
  "script_text": string (100-150 từ),
  "comment_prompt": string (câu hỏi mời để lại bình luận),
  "tags": string[],
  "needs_review": false
}`)}

${seoInstruction(false)}`,
  buildUserPrompt: () => `Viết đoạn dẫn ngắn mời người xem nghĩ về "một điều nhỏ khiến hôm nay đáng nhớ" và để lại bình luận chia sẻ. Giọng nhẹ nhàng, không ép buộc.`,
  schema: gratitudeRitualSchema,
};
