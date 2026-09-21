import { KR_BASE_IDENTITY, dateContextLines, jsonOnlyInstruction, seoInstruction } from '../common';
import { morningNewsSchema } from '../schemas';
import type { PromptModule } from '../types';

// Mirrors JP §4.1 for market=kr — see prompts/common.ts for the KR_BASE_IDENTITY note.
export const morningNewsKr: PromptModule = {
  market: 'kr',
  segmentType: 'morning_news',
  model: 'sonnet',
  systemPrompt: `${KR_BASE_IDENTITY}

${jsonOnlyInstruction(`{
  "title": string (tiêu đề video, dưới 40 ký tự, viết bằng tiếng Hàn),
  "script_text": string (kịch bản đầy đủ, tiếng Hàn, 400-600 từ, có đánh dấu [PAUSE] ở chỗ cần ngắt nhịp),
  "tags": string[],
  "needs_review": false
}`)}

${seoInstruction(false)}`,
  buildUserPrompt: (ctx) => `${dateContextLines(ctx)}

Viết kịch bản bản tin buổi sáng gồm:
1. Lời chào buổi sáng ấm áp
2. Nhắc đến thời tiết/mùa hiện tại
3. Một câu "hôm nay là ngày này năm xưa..." (chọn 1 sự kiện lịch sử/văn hóa Hàn Quốc phù hợp, có thật)
4. Một câu động viên ngắn gọn, chân thành (không sáo rỗng)
5. Kết thúc bằng câu chào quen thuộc của kênh`,
  schema: morningNewsSchema,
};
