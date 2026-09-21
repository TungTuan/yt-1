# komorebi-asset-prompts.md
## Bộ prompt sinh ảnh cho TICKET-007 (asset_library)

Dùng với bất kỳ công cụ AI image nào (Midjourney, DALL-E, Stable Diffusion, ...). Mỗi mục dưới
đây là 1 prompt độc lập, nhưng **luôn ghép `STYLE GUIDE` ở đầu mỗi prompt** để giữ nhất quán hình
ảnh xuyên suốt kênh — đây là phần quan trọng nhất của cả bộ, quan trọng hơn từng prompt riêng lẻ.

Đường dẫn file gợi ý trong mỗi mục khớp với `apps/server/prisma/seed.ts` — đặt file đúng tên đó
(hoặc báo tôi tên bạn đã dùng) để tôi wire thẳng vào `asset_library` mà không phải sửa seed data.

---

## 0. STYLE GUIDE (character bible — dán vào ĐẦU mọi prompt bên dưới)

```
Soft warm watercolor-and-colored-pencil children's-book illustration style. Gentle hand-painted
textures, visible soft brush strokes, muted pastel palette (warm ochre, dusty rose, sage green,
soft cream), diffused golden-hour lighting, no harsh outlines, no flat vector look, no photoreal
rendering. Cozy, nostalgic, unhurried mood — evokes a quiet afternoon in a countryside home.
Composition: calm, uncluttered, generous negative space (this is a video background, not a busy
scene). Aspect ratio 16:9, at least 1920x1080, ideally higher for slow pan/zoom room.
```

**Nhân vật linh vật — DÙNG CHUNG 1 THIẾT KẾ GỐC cho cả Komachi (jp) và Bori (kr)** (TICKET-007 AC:
"2 nhân vật dùng chung 1 thiết kế gốc, chỉ khác tên hiển thị trong metadata" — nghĩa là **không
cần vẽ 2 phiên bản màu khác nhau**, chỉ 1 bộ 8 pose duy nhất, dùng chung file cho cả 2 kênh):

```
Character: a small plump songbird mascot, round soft body, oversized gentle eyes, no beak-forward
aggressive shape — closer to a chubby chickadee than a realistic bird. Warm honey-brown and cream
plumage (neutral color, not blue or gold — this design is shared by both channels; per-channel
branding, if any, is applied outside the character art, in metadata/overlay only). No clothing, no
accessories, no human features. Same proportions and line quality across every pose below —
generate all 8 poses in the same prompt session/reference-image chain if your tool supports it, so
they don't drift in shape.
```

---

## 1. Mascot poses — 8 ảnh, `market=shared`, `asset_type=mascot_pose`

PNG nền trong suốt (transparent background) — để composite lên bất kỳ ảnh nền nào trong Remotion.

| pose_name | file path | Prompt (thêm sau STYLE GUIDE + character ở trên) |
|---|---|---|
| `standing` | `/assets/mascot/standing.png` | "...standing upright on both feet, relaxed neutral pose, slight friendly head tilt, wings folded, facing three-quarter view. Transparent background, PNG cutout." |
| `tilt_head` | `/assets/mascot/tilt_head.png` | "...head tilted curiously to one side, one eyebrow-equivalent feather raised, standing pose, curious/thinking expression. Transparent background, PNG cutout." |
| `wing_flap` | `/assets/mascot/wing_flap.png` | "...mid-motion with both wings spread open and slightly blurred at the tips suggesting a flap, joyful energetic pose, used as an opening/attention-grabbing frame. Transparent background, PNG cutout." |
| `sleeping` | `/assets/mascot/sleeping.png` | "...eyes closed, head tucked slightly into chest feathers, sitting/resting pose, peaceful sleepy expression, used for the bedtime-story segment. Transparent background, PNG cutout." |
| `looking_down` | `/assets/mascot/looking_down.png` | "...gaze cast gently downward, soft empathetic expression, standing pose, as if listening carefully to someone. Transparent background, PNG cutout." |
| `looking_up` | `/assets/mascot/looking_up.png` | "...gaze cast upward and slightly to the side, wistful/hopeful expression, standing pose. Transparent background, PNG cutout." |
| `preening` | `/assets/mascot/preening.png` | "...gently preening a wing feather with its beak, content and self-satisfied expression, used for the gratitude segment. Transparent background, PNG cutout." |
| `puffed_up` | `/assets/mascot/puffed_up.png` | "...feathers puffed up round and warm, wings slightly spread as if offering a gentle hug, warm comforting presence, used for the companionship segment. Transparent background, PNG cutout." |

---

## 2. Ảnh nền thiên nhiên — 16 ảnh, `market=shared`, `asset_type=background`

Giả định (nêu rõ để bạn điều chỉnh nếu sai): đây là các cảnh nhìn RA từ hiên nhà — đủ rộng/chung
chung để không lộ chi tiết kiến trúc riêng (shoji giấy hay mái ngói hanok), nên dùng chung được cho
cả 2 market. Ma trận 4 mùa × 4 thời điểm trong ngày = 16 ảnh.

Prompt chung (thêm sau STYLE GUIDE, KHÔNG kèm nhân vật — đây là ảnh nền độc lập):
```
A tranquil view of a countryside garden/nature scene as seen from a covered porch (the porch
structure itself is barely visible — just enough of a wooden floor edge at the very bottom of
frame to suggest the viewpoint, no walls or architecture detail). {SEASON DETAIL}. {TIME DETAIL}.
Wide establishing shot, calm and empty of people, generous open sky area suitable for text
overlay. The bottom third and center of the frame must stay visually simple/uncluttered — this
image will be center-cropped to a 9:16 vertical format for Shorts, so keep the key visual interest
within the center 56% of the frame width.
```

| # | season × time | file path | {SEASON DETAIL} | {TIME DETAIL} |
|---|---|---|---|---|
| 1 | spring · morning | `/assets/backgrounds/shared/spring_morning.png` | cherry blossom (sakura) branches framing the view, soft pink petals drifting | soft pale morning light, faint mist |
| 2 | spring · afternoon | `/assets/backgrounds/shared/spring_afternoon.png` | cherry blossoms in full bloom, green new grass | bright warm afternoon sun |
| 3 | spring · evening | `/assets/backgrounds/shared/spring_evening.png` | blossoms silhouetted against the sky | warm orange sunset light |
| 4 | spring · night | `/assets/backgrounds/shared/spring_night.png` | blossom branches in moonlight, a few fireflies | deep blue night sky, soft moonlight |
| 5 | summer · morning | `/assets/backgrounds/shared/summer_morning.png` | lush green garden, morning dew on leaves | fresh cool morning light |
| 6 | summer · afternoon | `/assets/backgrounds/shared/summer_afternoon.png` | vivid green foliage, distant view of a calm sea or river | strong bright summer sun, cicada-song mood |
| 7 | summer · evening | `/assets/backgrounds/shared/summer_evening.png` | garden with wind chimes barely visible, evening glow | golden hour, long shadows |
| 8 | summer · night | `/assets/backgrounds/shared/summer_night.png` | dark garden silhouette, fireflies | warm night, stars visible |
| 9 | autumn · morning | `/assets/backgrounds/shared/autumn_morning.png` | red and gold maple leaves, some fallen leaves on the ground | crisp cool morning light |
| 10 | autumn · afternoon | `/assets/backgrounds/shared/autumn_afternoon.png` | full autumn foliage in red/orange/gold | warm clear afternoon light |
| 11 | autumn · evening | `/assets/backgrounds/shared/autumn_evening.png` | maple leaves against a dusky sky | deep orange sunset |
| 12 | autumn · night | `/assets/backgrounds/shared/autumn_night.png` | bare-ish branches with a few red leaves, moon visible | cool moonlit night |
| 13 | winter · morning | `/assets/backgrounds/shared/winter_morning.png` | fresh snow on garden and branches | pale cold morning light |
| 14 | winter · afternoon | `/assets/backgrounds/shared/winter_afternoon.png` | snow-covered garden, clear sky | bright cold sunny afternoon |
| 15 | winter · evening | `/assets/backgrounds/shared/winter_evening.png` | snow with warm light spilling from indoors nearby | soft pink-orange winter sunset |
| 16 | winter · night | `/assets/backgrounds/shared/winter_night.png` | snow glowing faintly under moonlight, quiet | deep cold blue night |

`time_of_day_tag` cho mỗi ảnh: morning/afternoon/evening/night tương ứng cột trên. `season_tag`
tương ứng. `setting_tag = outdoor_porch`. Đánh dấu `aspect_safe_crop = true` cho cả 16 ảnh (đã
thiết kế composition an toàn để crop 9:16 theo prompt trên) — tự kiểm tra lại khi ảnh ra, bỏ tick
nếu ảnh thực tế lệch tâm.

---

## 3. Hiên nhà riêng theo market — 4+4 ảnh, `asset_type=background`

Đây là cận cảnh HƠN, lộ rõ kiến trúc — nên tách market. Cùng góc máy/bố cục giữa 2 bộ để tương
thích chung 1 Remotion composition.

**jp — engawa (`market=jp`)**, prompt chung (sau STYLE GUIDE):
```
Close view of a traditional Japanese engawa (wooden veranda) bordering a small home, seen from
just inside/at the edge of the veranda looking out. Visible: weathered wooden floorboards, a
paper shoji screen door frame at one side (partially open), a low wooden railing. {SEASON DETAIL
from table below}. Keep the center-frame view clear for a mascot character to be composited
standing on the veranda later — don't place any object in the middle-lower third.
```

| file path | {SEASON DETAIL} |
|---|---|
| `/assets/backgrounds/jp/engawa_spring.png` | small garden with cherry blossoms visible beyond the railing |
| `/assets/backgrounds/jp/engawa_summer.png` | lush green garden, cicada-summer mood |
| `/assets/backgrounds/jp/engawa_autumn.png` | red maple leaves in the garden beyond |
| `/assets/backgrounds/jp/engawa_winter.png` | light snow dusting the garden and railing |

**kr — toenmaru (`market=kr`)**, prompt chung:
```
Close view of a traditional Korean hanok's toenmaru (wooden porch), seen from just inside/at the
edge of the porch looking out. Visible: warm wooden floorboards, the curved tiled eave (giwa roof)
edge at the top of frame, a low wooden railing — NO paper shoji screens (that's the jp variant,
keep this visually distinct via the roofline and absence of shoji). {SEASON DETAIL from table
below}. Keep the center-frame view clear for a mascot character to be composited standing on the
porch later — don't place any object in the middle-lower third.
```

| file path | {SEASON DETAIL} |
|---|---|
| `/assets/backgrounds/kr/toenmaru_spring.png` | small garden with blossoms visible beyond the railing |
| `/assets/backgrounds/kr/toenmaru_summer.png` | lush green garden |
| `/assets/backgrounds/kr/toenmaru_autumn.png` | red/gold foliage in the garden beyond |
| `/assets/backgrounds/kr/toenmaru_winter.png` | light snow dusting the garden and railing |

Cả 8 ảnh: `time_of_day_tag = any`, `setting_tag = outdoor_porch`, `aspect_safe_crop = true`
(composition đã chừa giữa khung trống theo prompt).

---

## 4. Overlay Quiz — 2 ảnh, `market=shared`, `asset_type=overlay_card`

PNG nền trong suốt, phong cách phẳng/sticker hơn (không phải cảnh minh hoạ), vì đây là UI overlay
đè lên video, không phải background.

| overlay_role | file path | Prompt (thêm sau STYLE GUIDE) |
|---|---|---|
| `quiz_card` | `/assets/overlay/quiz_card.png` | "A blank rectangular card resembling soft handmade washi paper with a slightly torn/deckled edge and a subtle warm cream color, empty center area reserved for text to be added later, small decorative corner flourish (a tiny painted leaf or flower), flat sticker-style illustration (not photoreal), transparent background PNG, no text baked into the image." |
| `qmark_badge` | `/assets/overlay/qmark_badge.png` | "A small round badge/sticker with a friendly hand-painted question mark symbol in the center, warm ochre and cream colors matching the channel palette, soft rounded edges, flat sticker-style illustration, transparent background PNG." |

---

## 5. Export spec (áp dụng cho mọi ảnh trên)

- Background: PNG hoặc JPG chất lượng cao, tối thiểu 1920×1080, khuyến khích 2400×1350+ (chừa dư
  để Ken Burns pan/zoom trong Remotion — TICKET-009 AC).
- Mascot pose + overlay: **PNG nền trong suốt (alpha channel)**, tối thiểu 1200px chiều cao.
- Đặt file đúng đường dẫn ở cột "file path" từng bảng — khớp `apps/server/prisma/seed.ts` sẵn có.

## 6. Sau khi có file

Gửi file (hoặc thư mục) cho tôi — tôi sẽ:
1. Thêm static file serving vào server để dashboard xem trước được ảnh
2. Cập nhật `seed.ts` / ghi thẳng vào `asset_library` với đúng `file_path` thật
3. Chạy lại `assetSelection.ts` để xác nhận pipeline chọn đúng ảnh theo mùa/thời điểm/market
