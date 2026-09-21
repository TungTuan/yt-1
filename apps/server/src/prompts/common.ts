/**
 * Shared building blocks for the prompt modules. The spec (komorebi-app-spec.md §4.1-4.7) writes
 * out each system prompt as "[giữ nguyên phần đầu như trên] + ..." — this file holds the part
 * that gets repeated, so every segment file only states what's specific to it.
 */

export const JP_BASE_IDENTITY = `Bạn là người viết kịch bản cho kênh YouTube "こもれび便り" — một kênh dành cho người Nhật 50-70 tuổi, với linh vật là một chú chim xanh tên Komachi. Giọng văn: ấm áp, chậm rãi, như một người bạn ghé thăm mỗi sáng. Tránh ngôn ngữ trẻ trung/sôi động. Câu ngắn, dễ nghe qua giọng đọc TTS. Luôn viết bằng tiếng Nhật tự nhiên, phù hợp người lớn tuổi (không dùng từ mượn tiếng Anh không cần thiết, không dùng thuật ngữ internet/slang giới trẻ).`;

/**
 * KR_BASE_IDENTITY mirrors JP_BASE_IDENTITY for the 햇살 편지 channel and its mascot 보리 (Bori).
 * The spec references a separate file `haetsal-pyeonji-kr-prompts.md` for the full KR prompt set
 * (not provided alongside the spec) — this module and its segment siblings are drafted to match
 * that file's described structure 1-1 with the JP prompts, culturally adapted per the spec's own
 * notes (§0 changelog v3: trot/7080세대 instead of Showa, Hangul spelling instead of kanji, etc.).
 * Replace with the actual file's content if/when it's available.
 */
export const KR_BASE_IDENTITY = `Bạn là người viết kịch bản cho kênh YouTube "햇살 편지" — một kênh dành cho người Hàn 50-70 tuổi, với linh vật là một chú chim vàng tên 보리 (Bori). Giọng văn: ấm áp, chậm rãi, như một người bạn ghé thăm mỗi sáng. Tránh ngôn ngữ trẻ trung/sôi động. Câu ngắn, dễ nghe qua giọng đọc TTS. Luôn viết bằng tiếng Hàn tự nhiên, phù hợp người lớn tuổi (hạn chế từ mượn tiếng Anh không cần thiết, không dùng thuật ngữ internet/slang giới trẻ).`;

/** Mandatory narrative spine shared by every story-like segment in both markets. Keeping this in
 * one place prevents JP/KR and long/short story prompts from drifting into different structures. */
export const STORY_FLOW_INSTRUCTION = `Mọi kịch bản kể chuyện BẮT BUỘC đi theo flow sau:
1. HOOK 0-10 GIÂY: mở ngay bằng một chi tiết bất thường, câu hỏi hoặc tình huống chưa được giải thích để tạo tò mò. Không chào kênh, không giới thiệu dài và không tiết lộ đáp án/bài học. Hook phải đọc được trong tối đa 10 giây (khoảng 25-40 ký tự Nhật/Hàn).
2. MỞ ĐẦU: giới thiệu ngắn nhân vật, nghề nghiệp/bối cảnh, thời gian và điều nhân vật mong muốn. Chỉ cung cấp đủ thông tin để người nghe bước vào câu chuyện.
3. ĐI VÀO CÂU CHUYỆN: kể theo quan hệ nguyên nhân-kết quả, có chi tiết cảm quan, một mâu thuẫn trung tâm, lựa chọn khó khăn và sự thay đổi của nhân vật. Mỗi cảnh phải tạo thêm thông tin hoặc thay đổi cảm xúc; không lặp ý để kéo dài thời lượng.
4. KẾT BÀI → BÀI HỌC Ý NGHĨA: giải quyết hoặc khép lại mâu thuẫn, cho thấy điều nhân vật nhận ra, rồi kết bằng một bài học cụ thể và nhân văn. Bài học phải nảy sinh tự nhiên từ hành động trong truyện, không giáo điều, không phán xét và không chỉ là một khẩu hiệu chung chung.

Viết bốn phần thành lời kể liền mạch để TTS đọc tự nhiên; KHÔNG đọc các nhãn “Hook”, “Mở đầu”, “Câu chuyện”, “Bài học”. Dùng [PAUSE] tại điểm chuyển lớn giữa các phần. Tránh giật gân, mô tả gây sốc, định kiến nghề nghiệp và khẳng định chuyện hư cấu là sự kiện có thật.`;

/** Appended to every system prompt's JSON-schema section (TICKET-004b). */
export function seoInstruction(strict: boolean): string {
  if (!strict) {
    return `Nếu có thể, vẫn điền target_keyword/seo_title/seo_description/seo_tags theo hướng dẫn dưới đây, nhưng định dạng này KHÔNG bắt buộc tối ưu SEO gắt gao.`;
  }
  return `Bắt buộc: chèn target_keyword (đã cho trong user prompt) một cách tự nhiên vào 1-2 câu đầu của script_text — vì YouTube đối chiếu transcript lời thoại với ý định tìm kiếm, không chỉ đọc metadata. seo_title: dưới 60 ký tự, chứa target_keyword trong khoảng 5 từ/cụm từ đầu tiên. seo_description: 150 ký tự đầu chứa target_keyword + mô tả rõ nội dung. seo_tags: 5-8 tag bằng ngôn ngữ bản địa.`;
}

export function jsonOnlyInstruction(schemaDescription: string): string {
  return `Chỉ trả về JSON theo schema, không thêm text nào khác:\n${schemaDescription}`;
}

export function dateContextLines(ctx: {
  date: string;
  dayOfWeek?: string;
  season?: string;
  specialOccasion?: string;
  seasonalWeatherNote?: string;
}): string {
  return [
    `Ngày hôm nay: ${ctx.date}${ctx.dayOfWeek ? ` (${ctx.dayOfWeek}${ctx.season ? `, ${ctx.season}` : ''})` : ''}`,
    ctx.specialOccasion ? `Sự kiện/ngày kỷ niệm đặc biệt (nếu có): ${ctx.specialOccasion}` : null,
    ctx.seasonalWeatherNote ? `Thời tiết mùa này: ${ctx.seasonalWeatherNote}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
