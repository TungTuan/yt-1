# こもれび便り × 햇살 편지 — Content Pipeline App
## Tài liệu đặc tả kỹ thuật & Ticket breakdown (2 kênh: Nhật + Hàn, dùng chung 1 app)

**Stack:** Node.js (backend/API) + React (frontend dashboard)
**Mục tiêu:** Tự động hóa pipeline sản xuất nội dung YouTube từ kịch bản (Claude API **hoặc** Excel import cho MVP) → giọng đọc (VOICEVOX/Typecast tùy market) → hình ảnh (asset library dùng chung + riêng) → video (Remotion) → đăng tải (YouTube Data API, 2 kênh riêng), có điểm dừng kiểm duyệt thủ công cho nội dung nhạy cảm.

> **v6 — mới nhất:** thêm TICKET-013 (cross-posting Shorts sang TikTok/Facebook-Instagram Reels/Naver Band/LINE VOOM) — phân biệt rõ nền tảng tự động hóa được (TikTok, Reels) và nền tảng cần thao tác bán thủ công vì chưa xác minh được API công khai (Naver Band, LINE VOOM). Xem mục Changelog cuối file để biết đầy đủ lịch sử v1-v6.

---

## 0. Kiến trúc tổng quan

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌───────────┐     ┌──────────────┐
│  Content    │────▶│   Claude     │────▶│  VOICEVOX   │────▶│ Remotion  │────▶│  YouTube     │
│  Calendar   │     │   API        │     │  (voice)    │     │ (render)  │     │  Data API    │
│  (React UI) │     │  (script)    │     │             │     │           │     │  (upload)    │
└─────────────┘     └──────────────┘     └─────────────┘     └───────────┘     └──────────────┘
                            │                                       ▲
                            ▼                                       │
                     ┌──────────────┐                        ┌─────────────┐
                     │  Database    │◀───────────────────────│Asset Library│
                     │ (trạng thái) │                         │ (hình ảnh)  │
                     └──────────────┘                        └─────────────┘
```

**Nguyên tắc thiết kế:**
- Mỗi nội dung là 1 record đi qua state machine: `queued → scripted → needs_review (nếu nhạy cảm) → approved → voiced → rendered → uploaded → published`
- Backend Node.js xử lý toàn bộ pipeline (job queue), React chỉ là lớp giám sát/điều khiển/duyệt nội dung
- Voice + Asset selection chạy song song sau khi có script

---

## EPIC 1 — Hạ tầng dự án

### TICKET-001: Khởi tạo monorepo
**Mô tả:** Dựng cấu trúc dự án Node.js (Express/Fastify) cho backend + React (Vite) cho frontend, dùng workspace chung (npm workspaces hoặc Turborepo).

**Cấu trúc thư mục đề xuất:**
```
/apps
  /server      → Node.js API + job queue
  /dashboard   → React frontend
/packages
  /shared-types → TypeScript types dùng chung (ContentItem, AssetItem, PipelineStatus)
```

**Acceptance Criteria:**
- [ ] `npm run dev` chạy được cả server + dashboard song song
- [ ] TypeScript strict mode bật ở cả 2 app
- [ ] ESLint + Prettier cấu hình chung

---

### TICKET-002: Thiết kế database schema
**Mô tả:** Dùng PostgreSQL (khuyến nghị) hoặc SQLite cho quy mô nhỏ. ORM: Prisma.

**Bảng `content_items`:**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid | PK |
| market | enum | `jp`, `kr` — **mới (v3)**: phân biệt kênh Nhật/Hàn, dùng chung 1 bảng thay vì 2 hệ thống riêng |
| segment_type | enum | `morning_news`, `nostalgia`, `letter_reading`, `quiz`, `bedtime_story`, `companionship`, `gratitude_ritual` |
| scheduled_date | date | |
| time_slot | enum | `07:00`, `10:00`, `12:00`, `15:00`, `19:00`, `21:00` |
| format | enum | `long_form`, `shorts` — phân biệt video dài vs Shorts |
| parent_content_id | uuid | nullable, tự tham chiếu — Shorts (10:00, 15:00) trỏ về content_item dài đã tạo cùng ngày mà nó được cắt ra từ đó |
| source | enum | `claude_api`, `excel_import`, `claude_code_headless` — **v4**: thêm `claude_code_headless` cho nội dung do Claude Code tự động sinh rồi ghi vào Excel (TICKET-003c), phân biệt với `excel_import` (người thật gõ tay) |
| status | enum | `queued`, `scripted`, `needs_review`, `approved`, `voiced`, `rendered`, `uploaded`, `published`, `failed` |
| title | text | |
| script_text | text | |
| script_metadata | jsonb | tags, mood, continuity_ref (truyện nhiều tập), `shorts_snippet` (đoạn rút gọn để tạo Shorts — xem TICKET-004) |
| audio_path | text | nullable |
| video_path | text | nullable |
| thumbnail_path | text | nullable |
| youtube_video_id | text | nullable |
| youtube_publish_at | timestamp | nullable |
| reviewed_by | text | nullable, chỉ điền khi needs_review |
| created_at / updated_at | timestamp | |

**Bảng `asset_library`** *(thêm `asset_type` để phân biệt 3 nhóm tài sản: nền / pose linh vật / thẻ overlay; thêm `market` cho kiến trúc đa thị trường)*:
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid | PK |
| market | enum | `jp`, `kr`, `shared` — **mới (v3)**: `shared` cho asset dùng chung được cả 2 kênh (xem TICKET-007c) |
| asset_type | enum | `background`, `mascot_pose`, `overlay_card` |
| file_path | text | |
| time_of_day_tag | enum | `morning`, `afternoon`, `evening`, `night`, `any` — chỉ áp dụng khi `asset_type = background` |
| season_tag | enum | `spring`, `summer`, `autumn`, `winter`, `any` — chỉ áp dụng khi `asset_type = background` |
| setting_tag | enum | `outdoor_porch`, `indoor` — chỉ áp dụng khi `asset_type = background` (đổi tên từ `outdoor_engawa` vì giờ dùng chung cho cả toenmaru Hàn) |
| pose_name | text | nullable — chỉ áp dụng khi `asset_type = mascot_pose` (`standing`, `tilt_head`, `wing_flap`, `sleeping`, `looking_down`, `looking_up`, `preening`, `puffed_up`) |
| overlay_role | text | nullable — chỉ áp dụng khi `asset_type = overlay_card` (`quiz_card`, `qmark_badge`) |
| mood_tag | text | `warm`, `nostalgic`, `calm`, `playful` |
| aspect_safe_crop | boolean | true nếu bố cục đủ an toàn để center-crop sang 9:16 cho Shorts |

**Acceptance Criteria:**
- [ ] Migration chạy được, seed 1 ít dữ liệu mẫu (tối thiểu 1 asset mỗi loại × mỗi market)
- [ ] Index trên `market`, `status`, `scheduled_date`, và `parent_content_id`
- [ ] Constraint: `format = shorts` bắt buộc phải có `parent_content_id` khác null
- [ ] Constraint: `parent_content_id` (nếu có) phải cùng `market` với content_item hiện tại

**Bảng `audio_library`** *(BGM + SFX — xem TICKET-006b)*:
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid | PK |
| market | enum | `jp`, `kr`, `shared` — SFX dùng `shared`, BGM luôn thuộc 1 market cụ thể |
| audio_type | enum | `bgm`, `sfx` |
| file_path | text | |
| mood_tag | text | `warm`, `curious`, `nostalgic`, `somber`, `calm` |
| segment_type_tags | text[] | định dạng nào dùng được track này |
| sfx_trigger | text | nullable, chỉ áp dụng khi `audio_type = sfx` (`bird_chirp_intro`, `chime_transition`, `page_turn`) |
| duration_seconds | number | |
| loop_safe | boolean | true nếu có thể loop liền mạch không nghe rõ điểm nối |
| license_source | text | nguồn + loại license, phục vụ đối chiếu khi cần |

---

## EPIC 2 — Module sinh nội dung (Claude API)

### TICKET-003: Claude API service wrapper
**Mô tả:** Viết service `contentGenerator.ts` gọi Claude API (model: Sonnet cho nội dung cảm xúc sâu, Haiku cho quiz/bản tin đơn giản), trả về JSON có cấu trúc. Nhận thêm tham số `market` (`jp`/`kr`) để chọn đúng bộ prompt tương ứng.

**Acceptance Criteria:**
- [ ] Service nhận `market` + `segment_type` + context (ngày, tập trước nếu có) → trả về object `{title, script_text, tags, needs_review}`
- [ ] Có retry logic khi API lỗi/rate limit
- [ ] Log token usage mỗi lần gọi (phục vụ theo dõi chi phí), tách riêng theo `market` để so sánh chi phí 2 kênh
- [ ] Dùng prompt caching cho phần system prompt/style guide lặp lại mỗi lần gọi

---

### TICKET-003b: MVP — Import Excel thay thế Claude API tạm thời *(mới)*
**Mô tả:** Để launch MVP nhanh mà **chưa cần cấu hình/trả phí Claude API key**, cho phép người vận hành soạn kịch bản thủ công trong Excel theo mẫu tuần, upload lên để hệ thống tạo `content_items` trực tiếp — bỏ qua hoàn toàn bước `queued → gọi API`. Toàn bộ pipeline phía sau (review, voice, asset, render, upload) **không đổi gì**, chỉ khác điểm khởi đầu.

**File mẫu tham khảo:** `weekly-content-upload-template.xlsx` — gồm 3 sheet:
- `Huong_dan`: giải thích từng cột, quy tắc bắt buộc
- `Weekly_Schedule`: 1 dòng = 1 content_item dài (Shorts vẫn tự động derive như TICKET-014, không nhập tay)
- `Quiz_Questions`: bảng câu hỏi con, liên kết theo `market` + `date`

**Acceptance Criteria:**
- [ ] API endpoint `POST /content/import-excel` nhận file `.xlsx`, parse bằng thư viện `exceljs` (Node.js)
- [ ] Mỗi dòng hợp lệ → tạo `content_item` với `source = 'excel_import'`, `status = 'scripted'` (bỏ qua `queued`)
- [ ] Validate bắt buộc: `market`, `segment_type` phải thuộc enum hợp lệ; `letter_reading`/`companionship` **luôn ép `needs_review = true`** bất kể giá trị trong Excel (không cho phép bypass qua đường Excel)
- [ ] Dòng lỗi (thiếu cột bắt buộc, sai enum) → KHÔNG import, trả về báo cáo lỗi rõ ràng theo số dòng, không làm hỏng các dòng hợp lệ khác
- [ ] Với `segment_type = quiz`: đọc kèm sheet `Quiz_Questions` khớp `market` + `date`, gộp vào `script_metadata.questions`
- [ ] React UI (bổ sung vào TICKET-017): nút "Tải mẫu Excel" + "Upload file tuần" + hiển thị kết quả import (bao nhiêu dòng thành công/lỗi)
- [ ] Cờ cấu hình toàn cục `CONTENT_SOURCE_MODE=excel|api` — khi `excel`, hệ thống không gọi Claude API ở bước tạo nội dung (tiết kiệm chi phí hoàn toàn trong giai đoạn MVP); chuyển sang `api` khi sẵn sàng dùng TICKET-003

---

### TICKET-003c: Tự động hóa sinh nội dung qua Claude Code headless *(mới — giải pháp cầu nối)*
**Mô tả:** Phương án trung gian giữa TICKET-003b (nhập tay hoàn toàn) và TICKET-003 (gọi API trực tiếp từ app, trả theo token) — dùng **Claude Code ở chế độ headless** (`claude -p`, có thể chạy từ VS Code/CLI) theo lịch cron, tự sinh nội dung tuần và ghi thẳng vào file Excel mẫu, sau đó vẫn đi qua luồng import Excel (TICKET-003b) như bình thường. Phù hợp khi đã có sẵn gói Claude Pro/Max (không cần cấu hình/trả thêm theo token qua API key riêng).

**Cách vận hành:**
```bash
# Chạy mỗi Chủ nhật qua cron/Task Scheduler
claude -p "Đọc bộ prompt trong komorebi-app-spec.md (mục 4.1-4.7, market=jp)
và haetsal-pyeonji-kr-prompts.md (market=kr). Tham chiếu nội dung tuần
trước (continuity truyện, tránh lặp quiz/nostalgia). Sinh kịch bản tuần
này cho cả 2 market, ghi trực tiếp vào weekly-content-upload-template.xlsx
đúng định dạng cột đã quy ước." \
  --allowedTools "Read" "Write" \
  --max-turns 20 \
  --max-budget-usd 2 \
  --output-format json >> logs/claude-code-weekly.log 2>&1
```

**Acceptance Criteria:**
- [ ] Cron chạy thành công, file Excel sinh ra đúng định dạng cột (validate được bởi TICKET-003b)
- [ ] `content_items.source` bổ sung giá trị enum: `claude_code_headless` (phân biệt với `excel_import` nhập tay thủ công và `claude_api` gọi trực tiếp từ app) — phục vụ theo dõi/debug
- [ ] Giới hạn quyền tường minh khi chạy headless: chỉ `Read`/`Write` trong thư mục project, không cho chạy lệnh hệ thống ngoài ý muốn
- [ ] Đặt `--max-budget-usd` + `--max-turns` để tránh chạy runaway ngoài giám sát
- [ ] Log riêng mỗi lần chạy cron (thành công/lỗi) để debug khi output sai định dạng
- [ ] Ghi rõ trong README: đây là giải pháp cầu nối — khi khối lượng/tần suất vượt rate limit của gói Pro/Max, chuyển hẳn sang TICKET-003 (API trực tiếp, trả theo token, không giới hạn theo khung giờ xoay vòng)

---

### TICKET-004: Prompt templates cho toàn bộ 7 định dạng nội dung — 2 thị trường (JP/KR)

**Mô tả:** Đây là "bộ não" nội dung — mỗi định dạng có 1 system prompt cố định (giữ giọng văn nhất quán) + user prompt template có biến số. **Chỉ áp dụng khi `CONTENT_SOURCE_MODE=api`** (xem TICKET-003b cho giai đoạn MVP dùng Excel).

> Prompt thị trường Nhật (`market=jp`) nằm ngay trong ticket này (mục 4.1-4.7 bên dưới). Prompt thị trường Hàn (`market=kr`) nằm trong file riêng **`haetsal-pyeonji-kr-prompts.md`** — cấu trúc song song 1-1 với 7 định dạng, đã điều chỉnh văn hóa (trot/7080세대 thay Showa, chính tả Hangul thay kanji, v.v.)

> Toàn bộ output nên yêu cầu Claude trả về **JSON thuần**, không kèm text ngoài JSON, để backend parse trực tiếप.

> **Cấu trúc thư mục:** `/apps/server/prompts/{market}/{segment_type}.ts` — ví dụ `/apps/server/prompts/jp/morning_news.ts` và `/apps/server/prompts/kr/morning_news.ts` tách biệt hoàn toàn, `contentGenerator.ts` (TICKET-003) chỉ cần `import` đúng file theo tham số `market` truyền vào.

#### 4.1 — Bản tin sáng ấm áp (`morning_news`) · 7:00 · daily

```
SYSTEM PROMPT:
Bạn là người viết kịch bản cho kênh YouTube "こもれび便り" — một kênh
dành cho người Nhật 50-70 tuổi, với linh vật là một chú chim xanh tên
Komachi. Giọng văn: ấm áp, chậm rãi, như một người bạn ghé thăm mỗi
sáng. Tránh ngôn ngữ trẻ trung/sôi động. Câu ngắn, dễ nghe qua giọng
đọc TTS. Luôn viết bằng tiếng Nhật tự nhiên, phù hợp người lớn tuổi
(không dùng từ mượn tiếng Anh không cần thiết, không dùng thuật ngữ
internet/slang giới trẻ).

Chỉ trả về JSON theo schema, không thêm text nào khác:
{
  "title": string (tiêu đề video, dưới 40 ký tự),
  "script_text": string (kịch bản đầy đủ, tiếng Nhật, 400-600 từ,
                          có đánh dấu [PAUSE] ở chỗ cần ngắt nhịp),
  "tags": string[],
  "needs_review": false
}

USER PROMPT TEMPLATE:
Ngày hôm nay: {date} ({day_of_week}, {season})
Sự kiện/ngày kỷ niệm đặc biệt (nếu có): {special_occasion}
Thời tiết mùa này: {seasonal_weather_note}

Viết kịch bản bản tin buổi sáng gồm:
1. Lời chào buổi sáng ấm áp
2. Nhắc đến thời tiết/mùa hiện tại
3. Một câu "hôm nay là ngày này năm xưa..." (chọn 1 sự kiện lịch sử/
   văn hóa Nhật phù hợp, có thật)
4. Một câu động viên ngắn gọn, chân thành (không sáo rỗng)
5. Kết thúc bằng câu chào quen thuộc của kênh
```

#### 4.2 — Hoài niệm Showa (`nostalgia`) · 19:00 (T2/T4/T6)

```
SYSTEM PROMPT:
[giữ nguyên phần đầu như trên] + Bạn hiểu sâu về văn hóa, âm nhạc,
sự kiện thời kỳ Showa (1926-1989) và đầu Heisei. Mục tiêu: khơi gợi
ký ức tích cực, không bi lụy.

Schema JSON: như trên, thêm field:
  "era_reference": string (năm/thời kỳ được nhắc đến, để tránh lặp
                            lại giữa các tập),
  "shorts_snippet": string (1 câu/khoảnh khắc cô đọng nhất trong
                             kịch bản, 15-25 từ, dùng để dựng bản
                             Shorts 15:00 cùng ngày — xem TICKET-013b)

USER PROMPT TEMPLATE:
Các thời kỳ đã dùng gần đây (tránh lặp lại): {recent_eras_used}
Chủ đề gợi ý xoay vòng: {rotation_hint} (ví dụ: âm nhạc / phim ảnh /
đồ chơi tuổi thơ / món ăn đường phố / phương tiện đi lại)

Viết kịch bản 600-800 từ kể về MỘT ký ức cụ thể (không kể chung
chung), có chi tiết cảm quan (mùi, âm thanh, hình ảnh) để gợi nhớ
mạnh. Kết bằng câu hỏi mời người xem chia sẻ ký ức tương tự trong
bình luận.
```

#### 4.3 — Đọc thư tâm sự (`letter_reading`) · 19:00 (T3/T5) · ⚠️ NEEDS REVIEW

```
SYSTEM PROMPT:
[giữ nguyên phần đầu] + Đây là định dạng NHẠY CẢM nhất của kênh —
người xem gửi tâm sự thật về cô đơn, mất mát, khó khăn tuổi già.
Vai trò của bạn: viết lời HỒI ĐÁP đồng cảm, KHÔNG phán xét, KHÔNG
đưa lời khuyên y tế/tài chính/pháp lý cụ thể, KHÔNG giả vờ hiểu hết
hoàn cảnh người viết. Nếu nội dung thư có dấu hiệu khủng hoảng tâm
lý nghiêm trọng (ý định tự hại), PHẢI đặt needs_review = true và
KHÔNG viết kịch bản, chỉ ghi chú "flagged_for_human" trong output.

Schema JSON: như phần 4.1, LUÔN đặt "needs_review": true
(mọi output của định dạng này đều bắt buộc người thật duyệt lại)

USER PROMPT TEMPLATE:
Nội dung thư người xem gửi (đã ẩn danh thông tin cá nhân):
"""
{submitted_letter_text}
"""

Viết lời hồi đáp 300-500 từ: xác nhận cảm xúc của họ, chia sẻ góc
nhìn nhẹ nhàng, KHÔNG đưa ra "giải pháp" cụ thể trừ khi là gợi ý tìm
kết nối cộng đồng/chuyên gia phù hợp. Giọng văn như đang nói chuyện
trực tiếp với một người bạn.
```

#### 4.4 — Rèn trí nhớ / Quiz (`quiz`) · 12:00 · daily

```
SYSTEM PROMPT:
[giữ nguyên phần đầu] + Bạn tạo câu đố nhẹ nhàng về kanji, tính nhẩm,
lịch sử, hoặc kiến thức phổ thông — độ khó vừa phải, tạo cảm giác
"tôi vẫn còn minh mẫn" chứ không phải cảm giác bị dò bài.

Schema JSON:
{
  "title": string,
  "script_text": string,
  "questions": [
    {"question": string, "choices": string[3-4] (nếu trắc nghiệm),
     "answer": string, "fun_fact": string (giải thích thêm sau đáp án)}
  ] (3-5 câu),
  "tags": string[],
  "shorts_snippet": string (chọn ĐÚNG 1 câu hỏi dễ/hấp dẫn nhất
                             trong bộ để dựng bản Shorts 10:00 cùng
                             ngày — xem TICKET-013b),
  "needs_review": false
}

USER PROMPT TEMPLATE:
Chủ đề xoay vòng hôm nay: {quiz_category}
(kanji khó đọc / tính nhẩm / lịch sử Nhật Bản / tục ngữ / địa lý)
Số câu đã ra trong 30 ngày qua (tránh trùng): {recent_questions_summary}

Tạo bộ quiz theo chủ đề trên, độ khó tăng dần từ câu 1 đến câu cuối.
```

#### 4.5 — Truyện kể trước khi ngủ (`bedtime_story`) · 21:00 Chủ nhật · weekly, serialized · 28-32 phút

```
SYSTEM PROMPT:
[giữ nguyên phần đầu] + Bạn viết truyện nhiều tập (giống tiểu thuyết
kỳ báo truyền thống Nhật). Giọng đọc chậm, êm dịu, phù hợp nghe trước
khi ngủ — tránh cao trào kịch tính mạnh, ưu tiên cảm giác dễ chịu.

Schema JSON:
{
  "title": string,
  "episode_number": number,
  "script_text": string (đủ cho 28-32 phút audio thực tế; mục tiêu ban đầu:
                          JP 6.500-8.000 ký tự, KR 7.000-8.500 ký tự;
                          ưu tiên duration TTS thực tế hơn số ký tự),
  "cliffhanger_summary": string (tóm tắt để tập sau tiếp nối),
  "tags": string[],
  "needs_review": false
}

USER PROMPT TEMPLATE:
Tập trước (tóm tắt): {previous_episode_summary}
Tập số: {episode_number}
Thể loại truyện: {story_genre} (đời thường / nhẹ nhàng kỳ ảo / lịch
sử) — đã chọn khi bắt đầu series, giữ nguyên xuyên suốt

Viết tiếp tập {episode_number} theo 5-7 chương/cảnh ngắn, mỗi cảnh có
một thay đổi nhẹ về không gian, ký ức hoặc cảm xúc để giữ nhịp nghe.
Không kéo dài bằng cách lặp ý hay mô tả rỗng. Kết thúc ở một điểm dừng
nhẹ nhàng gợi tò mò (không phải cliffhanger gay cấn kiểu phim hành động).
```

#### 4.6 — Bạn không cô đơn / Đồng cảnh ngộ (`companionship`) · 19:00 (T7) · ⚠️ NEEDS REVIEW

```
SYSTEM PROMPT:
[giữ nguyên phần đầu] + Bạn kể lại (dạng tổng hợp, ẩn danh, KHÔNG
dựa trên 1 người có thật cụ thể trừ khi đã được xác nhận đồng ý)
một câu chuyện về người cùng độ tuổi vượt qua cô đơn/mất mát/buồn
chán sau nghỉ hưu. Mục tiêu: tạo cảm giác "mình không phải người
duy nhất", KHÔNG được bi kịch hóa hay lợi dụng nỗi buồn để câu view.

Schema JSON: như 4.1, LUÔN đặt "needs_review": true

USER PROMPT TEMPLATE:
Chủ đề tuần này: {weekly_theme}
(ví dụ: mất bạn đời / con cái ở xa / mất kết nối bạn bè cũ /
 tìm lại sở thích sau nghỉ hưu)

Viết câu chuyện 500-700 từ theo góc nhìn ngôi thứ 3, có một khoảnh
khắc chuyển biến tích cực cụ thể (không mơ hồ), kết bằng thông điệp
nhẹ nhàng, không giáo điều.
```

#### 4.7 — Nghi thức biết ơn (`gratitude_ritual`) · gộp vào 7:00 cùng bản tin sáng

```
SYSTEM PROMPT:
[giữ nguyên phần đầu] + Đoạn ngắn 60-90 giây, mời người xem tương tác.

Schema JSON:
{
  "script_text": string (100-150 từ),
  "comment_prompt": string (câu hỏi mời để lại bình luận),
  "tags": string[],
  "needs_review": false
}

USER PROMPT TEMPLATE:
Viết đoạn dẫn ngắn mời người xem nghĩ về "một điều nhỏ khiến hôm nay
đáng nhớ" và để lại bình luận chia sẻ. Giọng nhẹ nhàng, không ép buộc.
```

**Acceptance Criteria (chung cho TICKET-004):**
- [ ] Mỗi định dạng có file prompt riêng trong `/apps/server/prompts/{market}/{segment_type}.ts` — cả 2 market (jp, kr)
- [ ] Test snapshot: gọi thử mỗi prompt (cả 2 market) 1 lần, xác nhận JSON parse được đúng schema
- [ ] Định dạng `letter_reading` và `companionship` LUÔN set `needs_review = true` — có test đảm bảo không thể bypass, áp dụng cho cả 2 market

---

### TICKET-004b: Sinh SEO metadata (title/description/tags) đi kèm script *(mới)*
**Mô tả:** Mở rộng output của TICKET-004 để sinh kèm metadata tối ưu SEO cùng lúc với script — không tách thành bước gọi API riêng (tiết kiệm token, giữ nhất quán ngữ cảnh giữa script và metadata).

**Mở rộng schema JSON output (áp dụng cho cả 7 định dạng, cả 2 market):**
```
{
  ... (các field đã có của từng định dạng),
  "target_keyword": string (1 cụm từ khóa chính, tra từ bảng cấu hình
                             theo market+segment_type — xem file
                             seo-keywords.json bên dưới),
  "seo_title": string (dưới 60 ký tự, chứa target_keyword trong 5 từ
                        đầu — theo công thức đã thống nhất),
  "seo_description": string (150 ký tự đầu chứa target_keyword +
                              mô tả rõ nội dung; phần sau liệt kê
                              timestamp nếu là quiz),
  "seo_tags": string[] (5-8 tag, tiếng bản địa theo market)
}
```

**Yêu cầu bắt buộc trong system prompt (bổ sung cho mọi định dạng):** script_text phải tự nhiên nhắc đến `target_keyword` trong 1-2 câu đầu — vì AI của YouTube đối chiếu nội dung lời thoại (transcript) với ý định tìm kiếm, không chỉ đọc metadata.

**File cấu hình `seo-keywords.json`** (quản lý thủ công, cập nhật định kỳ theo nghiên cứu từ khóa — KHÔNG hardcode trong prompt):
```json
{
  "jp": {
    "quiz": ["脳トレ", "認知症予防", "漢字クイズ"],
    "nostalgia": ["昭和 懐かしい", "昭和レトロ"],
    "bedtime_story": ["眠れない夜", "朗読 睡眠"]
  },
  "kr": {
    "quiz": ["치매 예방", "두뇌 퀴즈", "맞춤법 퀴즈"],
    "nostalgia": ["7080세대 추억", "복고"],
    "bedtime_story": ["잠이 안 올 때", "낭독"]
  }
}
```

**Schema `content_items` bổ sung:** cột `seo_title` (text), `seo_description` (text), `seo_tags` (text[]), `target_keyword` (text) — dùng trực tiếp khi upload (TICKET-012), không cần bước xử lý riêng.

**Acceptance Criteria:**
- [ ] `target_keyword` luôn lấy từ `seo-keywords.json` theo đúng `market` + `segment_type` (xoay vòng, không lặp lại keyword giống hệt 2 ngày liên tiếp nếu bảng có nhiều lựa chọn)
- [ ] `seo_title` chứa `target_keyword` trong 5 từ đầu — có validation tự động, reject/regenerate nếu không đạt
- [ ] Với `segment_type = quiz`: `seo_description` bao gồm timestamp từng câu hỏi (dùng `timing_data` từ VOICEVOX — TICKET-006 — để tính giây chính xác)
- [ ] `morning_news`/`gratitude_ritual`: KHÔNG bắt buộc tối ưu SEO gắt gao (giá trị SEO thấp theo phân tích đã thống nhất) — vẫn sinh đủ field nhưng không cần validation chặt

---

### TICKET-005: Hàng đợi kiểm duyệt (review queue)
**Mô tả:** Khi `needs_review = true`, item chuyển trạng thái `needs_review` và KHÔNG tự động chạy tiếp sang bước voice. Cần UI riêng (xem TICKET-013) để người thật duyệt/sửa/approve.

**Acceptance Criteria:**
- [ ] API endpoint `PATCH /content/:id/review` nhận `{approved: boolean, edited_script?: string}`
- [ ] Nếu approved=false, item chuyển `status: failed` + ghi lý do
- [ ] Có safeguard: nếu script chứa các từ khóa cảnh báo khủng hoảng tâm lý (danh sách cấu hình được), tự động gắn cờ ưu tiên cao trong queue duyệt

---

## EPIC 3 — Module âm thanh (giọng đọc, nhạc nền, hiệu ứng)

### TICKET-006: TTS service — trừu tượng hóa theo market *(cập nhật v3)*
**Mô tả:** Service gọi engine giọng đọc phù hợp theo `market`: `jp` → VOICEVOX Engine (self-host qua Docker); `kr` → Typecast API (lưu ý: free tier giới hạn + cần ghi nguồn, dùng thương mại cần plan trả phí — khác VOICEVOX free hoàn toàn).

**Acceptance Criteria:**
- [ ] Interface chung `ttsService.synthesize(market, script_text) → {audio_path, timing_data}`, ẩn chi tiết triển khai từng engine phía sau
- [ ] `jp`: gọi VOICEVOX qua `POST /audio_query` → `POST /synthesis`, chọn 1 speaker_id cố định cho Komachi
- [ ] `kr`: gọi Typecast API, chọn 1 voice cố định cho Bori; xử lý riêng giới hạn ký tự/phút của gói đang dùng, log cảnh báo khi gần chạm hạn mức
- [ ] Lưu file audio vào storage (local/S3), path ghi vào `content_items.audio_path`
- [ ] Trích xuất timing (mora/phoneme cho jp, tương đương cho kr) → lưu riêng để Remotion đồng bộ phụ đề
- [ ] Xử lý `[PAUSE]` marker thành khoảng lặng phù hợp — nhất quán giữa 2 engine dù cơ chế native khác nhau

---

### TICKET-006b: Thư viện nhạc nền & hiệu ứng âm thanh (BGM/SFX) *(cập nhật — market-aware)*
**Mô tả:** Task tuyển chọn (không phải code) — cần bộ nhạc nền + hiệu ứng riêng cho từng market, vì dùng chung nhạc sẽ mất bản sắc văn hóa (nhạc kiểu Nhật nghe lạc quẻ trên kênh Hàn và ngược lại). SFX "chữ ký âm thanh" (tiếng chim, chuông, lật trang) có thể **dùng chung cho cả 2 market** vì mang tính phổ quát, không đặc thù văn hóa.

**Danh sách cần có — nhân đôi phần BGM theo market:**
- **BGM (4-5 track/market, `market = jp` hoặc `kr`, loop_safe):**
  - `jp`: như đã liệt kê ở bản v2 (ấm áp, tò mò, hoài niệm phong cách Showa, trầm-đồng cảm, êm dịu)
  - `kr`: tương tự về vai trò cảm xúc, nhưng nhóm hoài niệm nên mang hơi hướng trot/발라드 nhẹ — **sáng tác mới, không dùng bản ghi âm trot thật** (rủi ro bản quyền tương tự Showa)
- **SFX (`market = shared`, dùng chung):** `bird_chirp_intro`, `chime_transition`, `page_turn` — giữ nguyên như bản v2

**Acceptance Criteria:**
- [ ] Tối thiểu 4 BGM/market (8 tổng) + 3 SFX dùng chung được import vào `audio_library` (bảng cũng cần thêm cột `market` enum `jp/kr/shared`, tương tự `asset_library`)
- [ ] Mỗi file có `license_source` ghi rõ
- [ ] BGM nhóm `nostalgia` ở CẢ 2 market được double-check thủ công: xác nhận sáng tác mới, không phải bản ghi âm gốc (Showa hoặc trot)

---

## EPIC 4 — Module thư viện hình ảnh

### TICKET-007: Sản xuất bộ tài sản hình ảnh gốc *(cập nhật v3 — market-aware)*
**Mô tả:** Task sản xuất (không phải code) — tạo tài sản hình ảnh bằng AI image generation. Phần lớn dùng chung được cho cả 2 market (`market = shared`), chỉ 1 nhóm nhỏ cần vẽ riêng.

**Dùng chung (`market = shared`) — theo `komorebi-asset-prompts.md`:**
- 8 pose linh vật (chỉ là hình chim + dáng, không mang yếu tố văn hóa riêng)
- 16 ảnh nền thiên nhiên theo mùa/thời điểm (hoa anh đào, lá đỏ, tuyết, biển hè...) — cảnh tự nhiên không đặc thù quốc gia
- 2 tài sản overlay Quiz (thẻ giấy + icon dấu hỏi)

**Cần vẽ riêng theo market:**
- `jp`: 4 ảnh nền hiên nhà kiểu **engawa** (đã có, xem `komorebi-asset-prompts.md` mục 2)
- `kr`: 4 ảnh nền hiên nhà kiểu **toenmaru** (툇마루) — cùng góc máy/bố cục với bản engawa để asset tương thích với cùng 1 Remotion composition, chỉ khác chi tiết kiến trúc (mái ngói cong hanok, không có khung cửa shoji giấy)

**Acceptance Criteria:**
- [ ] Toàn bộ asset dùng chung "khối phong cách gốc" để Bori/Komachi không lệch hình dạng giữa các ảnh (2 nhân vật dùng chung 1 thiết kế gốc, chỉ khác tên hiển thị trong metadata)
- [ ] 8 pose linh vật tạo trước, dùng làm character reference cho cả 2 bộ ảnh nền (chung + riêng theo market)
- [ ] Mỗi ảnh nền đánh dấu `aspect_safe_crop` như bản v2
- [ ] Import vào `asset_library` với đúng `market` (`shared` hoặc `jp`/`kr` cụ thể) + `asset_type` + tag tương ứng

### TICKET-008: Asset selection service
**Mô tả:** Logic chọn tài sản phù hợp dựa trên `segment_type` + `time_slot`, xử lý riêng theo từng `asset_type`.

**Acceptance Criteria:**
- [ ] Chọn `background`: lọc theo `market` (`shared` HOẶC đúng market của content_item) + `time_of_day_tag` + `season_tag` (mùa lấy theo `scheduled_date` thực tế), round-robin tránh lặp ảnh 2 ngày liên tiếp
- [ ] Chọn `mascot_pose`: mapping cố định theo `segment_type`, luôn lấy từ `market = shared`
- [ ] Chọn `overlay_card`: CHỈ áp dụng khi `segment_type = quiz`, luôn lấy asset `market = shared` có `overlay_role = quiz_card` + `qmark_badge`
- [ ] Chọn BGM/SFX (`audio_library`): BGM lọc theo đúng `market` của content_item; SFX luôn lấy `market = shared`
- [ ] Khi chọn asset cho content_item có `format = shorts`: chỉ được chọn `background` có `aspect_safe_crop = true`
- [ ] Admin UI (TICKET-016) để upload ảnh mới + gắn tag thủ công (bổ sung/thay thế ảnh theo thời gian mà không cần sửa code)

---

## EPIC 5 — Module dựng video (Remotion)

### TICKET-009: Remotion composition templates (video dài)
**Mô tả:** Xây 7 Composition tương ứng 7 định dạng (hoặc 1 Composition tham số hóa theo `segment_type`). Khổ 16:9.

**Acceptance Criteria:**
- [ ] Input props: `{audio_path, timing_data, background_image, mascot_pose, script_text, title, tag_color, overlay_card?, bgm_path, sfx_cues}` — `overlay_card` chỉ truyền khi `segment_type = quiz`
- [ ] Composition dựng theo layer: background → mascot_pose (composited) → overlay_card (nếu có, render kanji/số động vào khung thẻ trống) → phụ đề → tiêu đề
- [ ] Layer âm thanh: giọng đọc (voice) + BGM loop nền + SFX theo `sfx_cues` (mảng `{trigger, timestamp_seconds}`, tối thiểu luôn có `bird_chirp_intro` ở giây 0 và `chime_transition` khi tiêu đề xuất hiện)
- [ ] BGM tự động duck (giảm) xuống ~15-20% volume trong lúc có giọng đọc, tăng về ~40-50% ở đoạn `[PAUSE]` — dùng `interpolate()` theo timing_data của VOICEVOX, không hardcode thời điểm
- [ ] Hiệu ứng Ken Burns (pan/zoom chậm) trên ảnh nền tĩnh
- [ ] Phụ đề đồng bộ theo timing_data từ VOICEVOX
- [ ] Áp dụng đúng template màu tag đã thống nhất (amber/sage/indigo theo loại nội dung)

### TICKET-009b: Remotion composition — bản Shorts
**Mô tả:** *(mới)* Composition riêng, khổ dọc 9:16, dùng cho content_item có `format = shorts`.

**Acceptance Criteria:**
- [ ] Input: `parent_content_id` → lấy `shorts_snippet` từ `script_metadata` của item cha, KHÔNG lấy toàn bộ `script_text`
- [ ] Ảnh nền: center-crop ảnh nền của item cha sang 9:16 (chỉ dùng ảnh có `aspect_safe_crop = true`)
- [ ] Giọng đọc: đồng bộ hóa lại — gọi VOICEVOX riêng cho đoạn `shorts_snippet` (không cắt trực tiếp từ audio dài, vì timing/nhịp thở sẽ không tự nhiên)
- [ ] Thời lượng đầu ra: 15-30 giây
- [ ] Có 1 khung hình mở đầu dùng pose `wing_flap` để tạo cảm giác "bắt đầu" ngay giây đầu (giữ retention Shorts)
- [ ] Dùng cùng BGM + `bird_chirp_intro` như bản gốc (giữ "chữ ký âm thanh" nhất quán dù là Shorts), duck volume tương tự bản dài

### TICKET-010: Render pipeline (Node.js worker)
**Mô tả:** Worker gọi `@remotion/renderer` để render MP4 (cả 2 Composition dài/Shorts). Phần thumbnail **không còn dùng cách cắt frame ngẫu nhiên** — xem TICKET-010b để có logic sinh thumbnail thông minh hơn.

**Acceptance Criteria:**
- [ ] Render chạy background job (không block API), cập nhật `status: rendered` khi xong
- [ ] Log lỗi render rõ ràng (thiếu asset, audio lỗi, v.v.)
- [ ] Job Shorts chỉ bắt đầu render sau khi job video dài cùng ngày đã `rendered` thành công (tránh render song song gây tranh chấp tài nguyên)

---

### TICKET-010b: Sinh thumbnail dựa trên nội dung video *(mới)*
**Mô tả:** Thay vì cắt 1 frame ngẫu nhiên từ video đã render (chất lượng thấp hơn vì đã nén, bố cục không kiểm soát được), sinh thumbnail **từ chính asset gốc + nội dung script** — nhất quán với template màu tag đã thống nhất và tối ưu CTR (yếu tố xếp hạng #1 theo nghiên cứu SEO ở trên).

**Cách vận hành:**
1. **Nền thumbnail**: dùng lại chính `background_image` + `mascot_pose` đã chọn cho video đó (TICKET-008) ở độ phân giải gốc — không lấy từ frame video đã render/nén
2. **Hook text riêng biệt với title**: sinh 1 câu ngắn (dưới 20 ký tự), giật gân/gợi tò mò hơn `seo_title` (TICKET-004b) — lấy cảm hứng từ script chứ không copy nguyên title. Ví dụ script quiz có câu hỏi khó → thumbnail hook chỉ lấy phần "?"/từ khóa chính, không nhồi cả câu
3. **Sinh 2-3 biến thể** (khác cách đặt câu hook hoặc bố cục chữ) bằng Remotion Still, cùng 1 nền — phục vụ A/B test

**Acceptance Criteria:**
- [ ] Output: 2-3 file thumbnail candidate/video, đặt tên rõ ràng (`{content_id}_thumb_a.png`, `_b`, `_c`)
- [ ] Thumbnail chính (`_a`) được set tự động qua `thumbnails.set` (TICKET-012) — luồng tự động hoàn toàn, không cần chờ người duyệt
- [ ] **Lưu ý quan trọng:** tính năng "Test & Compare" (A/B test 3 thumbnail) của YouTube hiện chỉ thao tác được qua giao diện YouTube Studio — **chưa xác nhận được hỗ trợ qua Data API**. Vì vậy 2-3 file candidate được lưu vào thư mục riêng để người vận hành tự upload thủ công vào Test & Compare nếu muốn chạy A/B test, KHÔNG nằm trong luồng tự động
- [ ] Hook text không được trùng lặp y hệt `seo_title` — có validation nhắc nếu 2 chuỗi giống nhau >80%
- [ ] Áp dụng đúng font Zen Maru Gothic (jp) / Jua hoặc Gaegu (kr) + màu tag theo segment_type như đã thống nhất

---

## EPIC 6 — Module đăng tải (YouTube API)

### TICKET-011: YouTube OAuth2 setup — 2 kênh riêng biệt *(code hoàn tất; chờ credentials thật)*
**Mô tả:** Thiết lập OAuth2 credentials qua Google Cloud Console **cho từng kênh YouTube riêng** (kênh JP và kênh KR là 2 kênh YouTube khác nhau, 2 bộ refresh token khác nhau). Lưu theo cặp `market → credentials`, không dùng chung 1 token cho cả 2.

### TICKET-012: Upload & schedule service *(đã triển khai)*
**Mô tả:** Gọi `videos.insert` với resumable upload, set `status.publishAt` theo `time_slot` đã định trong lịch tuần. Chọn đúng bộ credentials (TICKET-011) theo `content_items.market` trước khi gọi API. Dùng `seo_title`/`seo_description`/`seo_tags` (TICKET-004b) làm metadata upload — không dùng lại `title`/`script_text` thô.

**Acceptance Criteria:**
- [x] Media upload bằng client `googleapis`; có upload lock để không tự retry mù và tạo video trùng khi kết quả API không chắc chắn
- [x] Set thumbnail qua `thumbnails.set` sau khi upload xong — dùng file `_a` từ TICKET-010b; lỗi thumbnail không làm mất `youtube_video_id`
- [x] Lưu `youtube_video_id` về DB ngay sau `videos.insert`, cập nhật `status: uploaded` rồi `published` sau khi publishAt qua
- [x] Chỉ upload item `rendered` đã qua factual + language QA; Shorts kế thừa QA của parent long-form
- [x] Auto sweep là opt-in (`YOUTUBE_AUTO_UPLOAD=true`), mặc định quét 5 phút/lần và upload trước tối đa 7 ngày

---

### TICKET-013: Cross-posting sang nền tảng khác (TikTok, Naver Band, LINE VOOM, Reels) *(mới)*
**Mô tả:** Tận dụng Shorts đã render sẵn (TICKET-009b, khổ 9:16) để phân phối chéo sang các nền tảng khác — chi phí sản xuất biên bằng 0 vì không cần dựng thêm nội dung. Mức độ tự động hóa **khác nhau rõ rệt theo từng nền tảng** — cần xác minh kỹ trước khi giả định có thể tự động 100%.

**Đánh giá khả năng tự động hóa theo nền tảng:**

| Nền tảng | Market ưu tiên | API đăng bài tự động | Ghi chú |
|---|---|---|---|
| TikTok | shared (jp+kr) | ✅ Content Posting API (chính thức, cần đăng ký app + qua review) | Khả thi tự động hóa đầy đủ |
| Facebook/Instagram Reels | shared | ✅ Graph API (tài khoản Business/Creator) | Khả thi tự động hóa đầy đủ |
| **Naver Band** | kr (ưu tiên cao — xem phân tích SEO/phân phối) | ⚠️ **Chưa xác minh được** API công khai cho việc đăng bài kèm video từ bên thứ ba | Mặc định coi là **thao tác bán thủ công**: hệ thống xuất sẵn file + caption, người vận hành tự đăng tay vào Band |
| **LINE VOOM** | jp | ⚠️ **Chưa xác minh được** API công khai để đăng video tự động (khác với Messaging API của LINE Official Account) | Mặc định coi là **thao tác bán thủ công**, tương tự Band |

**Acceptance Criteria:**
- [ ] Với TikTok + Reels: service tự động đăng Shorts ngay sau khi `status: uploaded` lên YouTube thành công, dùng lại `seo_title`/`shorts_snippet` làm caption (rút gọn theo giới hạn ký tự từng nền tảng)
- [ ] Với Naver Band + LINE VOOM: hệ thống **không cố gọi API** — thay vào đó tạo 1 "gói xuất bản thủ công" (file video + caption gợi ý + hashtag) vào thư mục riêng, hiển thị trong Dashboard (TICKET-017) kèm nhắc nhở để người vận hành tự đăng tay
- [ ] Trước khi bật tự động hóa Naver Band/LINE VOOM trong tương lai, cần task riêng nghiên cứu xem 2 nền tảng này có mở API cho bên thứ ba đăng video hay không (không giả định sẵn trong bản này)
- [ ] Caption mỗi nền tảng validate độ dài riêng (TikTok ~150 ký tự hiệu quả nhất, Reels ~125 ký tự hiển thị trước "xem thêm")
- [ ] Log riêng theo từng nền tảng để theo dõi tỷ lệ đăng thành công/thủ công
- [ ] Schema: thêm cột `cross_post_status` (jsonb) vào `content_items` — ví dụ `{tiktok: "posted", reels: "posted", band: "pending_manual", line_voom: "pending_manual"}` — chỉ áp dụng cho item có `format = shorts`

---

## EPIC 7 — Orchestrator & Dashboard React

### Chiến lược vận hành — generate theo batch hàng tuần (MVP)

Generate và kiểm duyệt nội dung theo **một batch mỗi tuần**, nhưng publish rải theo lịch.
Không generate kho kịch bản dài nhiều tháng trước khi có dữ liệu thật từ YouTube.

**Sản lượng khởi điểm cho mỗi market:** 4 long-form + 3 Shorts/tuần:

| Ngày | Giờ | Nội dung | Mục đích |
|---|---:|---|---|
| Thứ Hai | 12:00 | `quiz` | Thói quen quay lại, tương tác |
| Thứ Tư | 19:00 | `nostalgia` | Nội dung cốt lõi, gợi bình luận |
| Thứ Sáu | 19:00 | `life_wisdom` luân phiên `companionship`/`letter_reading` | Thử nghiệm nhu cầu đời sống sau tuổi 50 |
| Chủ nhật | 21:00 | `bedtime_story` 28-32 phút | Watch time dài, xây series |
| 3 ngày phù hợp | 10:00 hoặc 15:00 | Shorts derive từ 3 long-form có hook tốt nhất | Discovery; không gọi lại model để viết từ đầu |

**Pipeline tuần:**

1. Tổng hợp content memory: chủ đề/câu hỏi/câu chuyện đã dùng, hiệu suất video và bình luận tuần trước.
2. Generate 20-30 ý tưởng có `content_pillar`, đối tượng, lời hứa, góc mới, title và thumbnail hook.
3. Chấm điểm; chỉ giữ 6-8 outline tốt nhất, rồi chọn 4 long-form cho lịch tuần.
4. Generate content package có outline, script, CTA, Shorts snippet, fact-check items và sensitivity flags.
5. Chạy critic tự động: khớp title-script, trùng lặp, giọng điệu, tuyên bố tuyệt đối/khoa học và độ dài mục tiêu.
6. Đưa nội dung nhạy cảm hoặc không đạt chuẩn vào `needs_review`; người vận hành duyệt batch trước TTS.
7. TTS trước để đo duration thực tế. `bedtime_story` chỉ được render khi audio đạt tối thiểu 28 phút; mục tiêu 28-32 phút.
8. Render, kiểm tra mẫu, lên lịch publish và derive 3 Shorts từ long-form đã duyệt.
9. Sau tuần xuất bản, nhập CTR, retention 30 giây, average percentage viewed, comment/1.000 view,
   subscriber/1.000 view và returning viewers vào content memory cho batch kế tiếp.

**Nhịp đề xuất:** Chủ nhật tối thu thập dữ liệu → Thứ Hai generate ý tưởng/outline → Thứ Ba generate
script → Thứ Tư review → Thứ Năm TTS/render → Thứ Sáu kiểm tra và schedule cho tuần kế tiếp.
Nếu một bước lỗi, chỉ retry item lỗi; không chạy lại toàn batch.

### TICKET-014: Pipeline orchestrator (job scheduler) *(cập nhật v3 — chạy song song 2 market)*
**Mô tả:** Cron job / queue (BullMQ + Redis khuyến nghị) chạy theo lịch tuần đã thống nhất, tự tạo content_item mới mỗi ngày theo đúng time_slot, đẩy qua từng bước pipeline. Chạy **độc lập cho từng market** (2 hàng đợi riêng hoặc 1 hàng đợi có gắn `market` trong job payload) — lỗi/chậm trễ ở kênh này không ảnh hưởng kênh kia.

**Acceptance Criteria:**
- [ ] Lịch cấu hình được qua file config theo từng `market` (không hardcode), mặc định theo batch MVP 4 long-form + 3 Shorts/tuần ở trên; các khung 07:00, 10:00, 12:00, 15:00, 19:00, 21:00 vẫn là các slot hợp lệ — 2 market dùng chung khung giờ nhưng là 2 job riêng
- [ ] Scheduler tạo/generate cả batch tuần kế tiếp theo một weekly job; publish jobs vẫn chạy riêng theo `scheduled_date` + `time_slot`
- [ ] Kiểm tra `CONTENT_SOURCE_MODE` (TICKET-003b): nếu `excel`, không tự tạo job gọi Claude API — chỉ tạo content_item khi có dữ liệu import sẵn cho đúng ngày/market; nếu `api`, tự động gọi TICKET-003 như bình thường
- [ ] Sau khi content_item `07:00` hoặc `19:00` đạt `status: rendered`, tự tạo content_item Shorts tương ứng (`10:00` hoặc `15:00`) với `parent_content_id` trỏ về item gốc **cùng market**, dùng sẵn `shorts_snippet` đã có trong `script_metadata` — **không gọi lại Claude API** cho bước này
- [ ] Có dashboard xem trạng thái từng job, lọc được theo `market` (chạy/lỗi/chờ)

### TICKET-015: React — Trang duyệt nội dung (Review queue UI)
**Acceptance Criteria:**
- [ ] List các item `status: needs_review`, có bộ lọc theo `market` (jp/kr), hiển thị script đầy đủ, cho phép sửa trực tiếp trước khi Approve
- [ ] Nút Approve / Reject rõ ràng, có xác nhận trước khi Reject

### TICKET-016: React — Quản lý thư viện ảnh
**Mô tả:** *(v2 — cập nhật để quản lý cả 3 loại asset)*

**Acceptance Criteria:**
- [ ] Upload ảnh mới, chọn `asset_type` trước (background/mascot_pose/overlay_card) — form hiển thị field tag tương ứng đúng loại
- [ ] Xem trước ảnh theo bộ lọc tag, lọc riêng theo từng `asset_type`
- [ ] Đánh dấu `aspect_safe_crop` khi upload ảnh nền (để hệ thống biết ảnh nào dùng an toàn cho Shorts)

### TICKET-017: React — Lịch nội dung tổng quan (Calendar view) *(cập nhật v3)*
**Acceptance Criteria:**
- [ ] Xem theo tuần, có tab/toggle chuyển giữa `market = jp` và `market = kr` (2 lịch riêng, không trộn chung 1 view)
- [ ] Mỗi ô hiển thị segment_type + status (màu sắc theo trạng thái)
- [ ] Click vào 1 item xem chi tiết toàn bộ pipeline (script, audio, video, link YouTube)
- [ ] Nút "Tải mẫu Excel" + "Upload file tuần" (xem TICKET-003b) — chỉ hiển thị khi `CONTENT_SOURCE_MODE=excel`, hiển thị kết quả import (số dòng thành công/lỗi)
- [ ] Với item Shorts có `cross_post_status` chứa giá trị `pending_manual` (TICKET-013): hiển thị badge nhắc "cần đăng tay lên Band/VOOM" + nút tải gói xuất bản (video + caption gợi ý)

---

## Ghi chú triển khai chung

- **Chi phí Claude API**: dùng model Haiku cho `quiz`, `gratitude_ritual`; dùng Sonnet cho các định dạng còn lại (đặc biệt `letter_reading`, `companionship`, `bedtime_story` cần chiều sâu cảm xúc) — áp dụng cho cả 2 market khi `CONTENT_SOURCE_MODE=api`
- **MVP trước, API sau**: khuyến nghị launch với `CONTENT_SOURCE_MODE=excel` (TICKET-003b) để kiểm chứng toàn bộ pipeline phía sau (voice/asset/render/upload) mà chưa tốn chi phí API; chỉ bật `api` khi cần mở rộng số lượng nội dung/tần suất vượt khả năng soạn tay
- **Bảo mật**: OAuth token YouTube (2 bộ, theo `market`) + API key Claude phải nằm trong biến môi trường/secret manager, không commit vào repo
- **Bản quyền âm thanh**: mọi BGM/SFX phải có `license_source` rõ ràng (ưu tiên YouTube Audio Library); tuyệt đối không dùng bản ghi âm nhạc Showa/trot thật cho mục `nostalgia`, ở CẢ 2 market
- **Chi phí TTS khác biệt giữa 2 market**: VOICEVOX (jp) miễn phí hoàn toàn; Typecast (kr) có giới hạn free tier — cân nhắc ngân sách riêng cho kênh Hàn ngay từ giai đoạn lên kế hoạch
- **Thứ tự build khuyến nghị**: EPIC 1 → EPIC 2 (bắt đầu bằng TICKET-003b/Excel để có MVP nhanh, build TICKET-003/004 API sau) → EPIC 3 (voice + BGM/SFX, làm market `jp` trước rồi `kr`) + EPIC 4 (asset hình ảnh, ưu tiên phần `shared` trước) song song → EPIC 5 (Remotion, cả bản dài lẫn Shorts) → EPIC 6 → EPIC 7

## Changelog

- **v1**: bản đặc tả gốc — 5 module chính, 7 định dạng nội dung, chưa có Shorts/BGM/SFX cụ thể, chỉ 1 market (jp)
- **v2**: bổ sung TICKET-007 (sản xuất tài sản hình ảnh), TICKET-006b (thư viện BGM/SFX), cơ chế Shorts derivative (TICKET-009b + field `shorts_snippet`/`parent_content_id`/`format`), phân loại 3 nhóm asset hình ảnh trong schema, tài liệu tham chiếu `komorebi-asset-prompts.md`
- **v3**: thêm TICKET-003b (import Excel cho MVP, không cần Claude API key ngay từ đầu); thêm bộ prompt thị trường Hàn Quốc (`haetsal-pyeonji-kr-prompts.md`, kênh "햇살 편지" / linh vật "보리"); toàn bộ schema (`content_items`, `asset_library`, `audio_library`) + service (TTS, YouTube OAuth, orchestrator, asset selection) được thiết kế lại market-aware (`jp`/`kr`/`shared`) để dùng chung 1 app cho 2 kênh
- **v4**: thêm TICKET-003c — tự động hóa sinh nội dung qua Claude Code headless mode (`claude -p`, chạy cron), là giải pháp cầu nối giữa Excel thủ công (v1 của TICKET-003b) và API trực tiếp (TICKET-003); bổ sung giá trị `claude_code_headless` vào `content_items.source`
- **v5**: thêm TICKET-004b (SEO metadata — title/description/tags/target_keyword sinh kèm script, file cấu hình `seo-keywords.json` theo market+segment_type, yêu cầu chèn từ khóa tự nhiên vào lời thoại); thêm TICKET-010b (thumbnail sinh từ asset gốc + script thay vì cắt frame video, 2-3 biến thể cho A/B test thủ công qua YouTube Studio Test & Compare — chưa xác nhận API hỗ trợ tính năng này)
- **v6** *(bản hiện tại)*: thêm TICKET-013 — cross-posting Shorts sang TikTok/Reels (tự động qua API chính thức) và Naver Band/LINE VOOM (bán thủ công — chưa xác minh được API công khai cho 2 nền tảng này); thêm cột `cross_post_status` vào `content_items`; cập nhật Calendar UI (TICKET-017) hiển thị nhắc đăng tay khi cần
