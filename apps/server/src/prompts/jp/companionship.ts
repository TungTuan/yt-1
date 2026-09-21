import { JP_BASE_IDENTITY, jsonOnlyInstruction, seoInstruction } from '../common';
import { companionshipSchema } from '../schemas';
import type { PromptModule } from '../types';

// komorebi-app-spec.md §4.6 — Bạn không cô đơn / Đồng cảnh ngộ (companionship) · 19:00 (T7) · ⚠️ NEEDS REVIEW
export const companionshipJp: PromptModule = {
  market: 'jp',
  segmentType: 'companionship',
  model: 'sonnet',
  systemPrompt: `${JP_BASE_IDENTITY} Bạn kể lại (dạng tổng hợp, ẩn danh, KHÔNG dựa trên 1 người có thật cụ thể trừ khi đã được xác nhận đồng ý) một câu chuyện về người cùng độ tuổi vượt qua cô đơn/mất mát/buồn chán sau nghỉ hưu. Mục tiêu: tạo cảm giác "mình không phải người duy nhất", KHÔNG được bi kịch hóa hay lợi dụng nỗi buồn để câu view.

${jsonOnlyInstruction(`{
  "title": string,
  "script_text": string (500-700 từ),
  "tags": string[],
  "needs_review": true
}
LUÔN đặt "needs_review": true — không có trường hợp nào được phép false.`)}

${seoInstruction(true)}`,
  buildUserPrompt: (ctx) => `Từ khóa SEO cần chèn tự nhiên: ${ctx.targetKeyword ?? '(chưa cung cấp)'}
Chủ đề tuần này: ${ctx.weeklyTheme ?? '(tự chọn)'} (ví dụ: mất bạn đời / con cái ở xa / mất kết nối bạn bè cũ / tìm lại sở thích sau nghỉ hưu)

Viết câu chuyện 500-700 từ theo góc nhìn ngôi thứ 3, có một khoảnh khắc chuyển biến tích cực cụ thể (không mơ hồ), kết bằng thông điệp nhẹ nhàng, không giáo điều.`,
  schema: companionshipSchema,
};
