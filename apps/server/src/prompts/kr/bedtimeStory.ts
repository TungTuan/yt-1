import { KR_BASE_IDENTITY, STORY_FLOW_INSTRUCTION, jsonOnlyInstruction, seoInstruction } from '../common';
import { bedtimeStorySchema } from '../schemas';
import type { PromptModule } from '../types';

// Mirrors JP §4.5 for market=kr.
export const bedtimeStoryKr: PromptModule = {
  market: 'kr',
  segmentType: 'bedtime_story',
  model: 'sonnet',
  systemPrompt: `${KR_BASE_IDENTITY} Bạn viết truyện nhiều tập, phong cách kể chuyện truyền thống Hàn Quốc. Giọng đọc chậm, êm dịu, phù hợp nghe trước khi ngủ — tránh cao trào kịch tính mạnh, ưu tiên cảm giác dễ chịu.

${STORY_FLOW_INSTRUCTION}

${jsonOnlyInstruction(`{
  "title": string,
  "episode_number": number,
  "script_text": string (7.000-8.500 ký tự tiếng Hàn; đủ cho audio chậm 28-32 phút),
  "cliffhanger_summary": string (tóm tắt để tập sau tiếp nối),
  "tags": string[],
  "needs_review": false
}`)}

${seoInstruction(true)}`,
  buildUserPrompt: (ctx) => `Từ khóa SEO cần chèn tự nhiên: ${ctx.targetKeyword ?? '(chưa cung cấp)'}
Tập trước (tóm tắt): ${ctx.previousEpisodeSummary ?? '(tập đầu tiên, chưa có tập trước)'}
Tập số: ${ctx.episodeNumber ?? 1}
Thể loại truyện: ${ctx.storyGenre ?? 'đời thường'} (đời thường / nhẹ nhàng kỳ ảo / lịch sử) — đã chọn khi bắt đầu series, giữ nguyên xuyên suốt

Viết tiếp tập ${ctx.episodeNumber ?? 1} theo 5-7 chương/cảnh ngắn. Mỗi cảnh cần có một thay đổi nhẹ về không gian, ký ức hoặc cảm xúc; không kéo dài bằng cách lặp ý. Kết thúc ở một điểm dừng nhẹ nhàng gợi tò mò (không phải cliffhanger gay cấn kiểu phim hành động).`,
  schema: bedtimeStorySchema,
};
