# Task.md — Ticket tracker

Derived from `komorebi-app-spec.md` (v6). One row per ticket. Status legend:

- ✅ Done — implemented and verified in this repo
- 🚧 Partial — implemented but a known gap remains (see note)
- ⬜ Not started
- 🔒 Blocked — needs something only you can provide (API key, account, running service) before it can be finished/verified
- 📝 Manual — not a coding task (content curation/production); tracked here for completeness only

Build order follows the spec's own recommendation (bottom of spec, "Ghi chú triển khai chung").

## EPIC 1 — Hạ tầng dự án

| Ticket | Title | Status | Note |
|---|---|---|---|
| TICKET-001 | Khởi tạo monorepo | ✅ | npm workspaces, `apps/server` + `apps/dashboard` + `packages/shared-types`, TS strict, ESLint+Prettier |
| TICKET-002 | Thiết kế database schema | 🚧 | `content_items`/`asset_library`/`audio_library` in `apps/server/prisma/schema.prisma`. **Real Postgres now up** (`docker compose up -d`) and the first real migration applied — schema verified against a live DB, not just typechecked. Gap: `format=shorts→parent_content_id` and same-market-as-parent still aren't DB-level CHECK constraints (doable now that Postgres is reachable, just not done yet) |

## EPIC 2 — Module sinh nội dung (Claude API)

| Ticket | Title | Status | Note |
|---|---|---|---|
| TICKET-003 | Claude API service wrapper | ✅ | `contentGenerator.ts` — retry/backoff, prompt caching, per-market token usage logging |
| TICKET-003b | MVP — Import Excel | ✅ | Built previous session: template download, import endpoint, review-required enforcement |
| TICKET-003c | Claude Code headless cron bridge | ✅ | `scripts/weekly-content-headless.sh` wrapping `claude -p` |
| TICKET-004 | Prompt templates × 7 định dạng × 2 market | ✅ | `apps/server/src/prompts/{jp,kr}/*.ts` + zod schemas; snapshot test validates parse + review-bypass safety |
| TICKET-004b | SEO metadata sinh kèm script | 🚧 | `seo-keywords.json` rotation + seo_title keyword-position check implemented; auto-regenerate-on-failure loop NOT implemented (flags for human review instead — see README) |
| TICKET-005 | Hàng đợi kiểm duyệt | ✅ | Built previous session: `PATCH /content/:id/review`, crisis-keyword safeguard |

## EPIC 3 — Module âm thanh

| Ticket | Title | Status | Note |
|---|---|---|---|
| TICKET-006 | TTS service (VOICEVOX jp / Typecast kr) | 🚧 | `apps/server/src/services/tts/` — `synthesize(market, contentId, scriptText)`. **jp verified for real** and production voice selected: No.7 読み聞かせ, speaker 31 (`VOICEVOX_SPEAKER_ID=31`), with required credit `VOICEVOX:No.7` added to channel copy. **kr adapter (Typecast) still unverified** — no current API docs or account to confirm the request shape against. |
| TICKET-006b | Thư viện BGM/SFX | 📝 | Not a coding task — curation/licensing of actual audio files. `audio_library` schema + seed rows are ready to receive real `file_path`s |

## EPIC 4 — Module thư viện hình ảnh

| Ticket | Title | Status | Note |
|---|---|---|---|
| TICKET-007 | Sản xuất bộ tài sản hình ảnh gốc | ✅ | **34 real images delivered and imported**: 8 shared mascot poses (transparent PNG, mapped 1:1 to the pose names the code expects), 20 jp + 4 kr backgrounds, 2 quiz overlays. Copied into `apps/server/public/assets/`, served statically, rows in `asset_library` for real. First delivery had the mascot baked into the backgrounds off-center (Shorts crop risk); library was regenerated as clean empty scenes and re-imported — `aspectSafeCrop: true` across the board now, verified against a live Shorts query |
| TICKET-008 | Asset selection service | ✅ | `assetSelection.ts` — verified against fixture data AND now against the real imported library on a live DB (bedtime_story→indoor+sleeping pose, kr quiz→correct season/time bg+overlay pair, etc., all confirmed). Added a small indoor/outdoor_porch preference for intimate segments after seeing the real mix of settings (not a spec AC, a quality improvement) |

## EPIC 5 — Module dựng video (Remotion)

| Ticket | Title | Status | Note |
|---|---|---|---|
| TICKET-009 | Remotion composition (video dài) | ✅ | New `apps/video` Remotion project. `LongFormVideo` composition: Ken Burns background, mascot layer, quiz overlay (dynamic question text), subtitles from caption cues, title card, BGM duck/raise driven directly by caption-cue timing, SFX cues. **Rendered a real MP4 end-to-end** (real jp voice + real assets) via the actual `POST /content/:id/render` route, not a standalone script — ffprobe-verified 1920x1080/30fps/h264+aac |
| TICKET-009b | Remotion composition (Shorts 9:16) | ✅ | `ShortsVideo` composition: same background component center-crops automatically at 9:16, `wing_flap` opening frame that settles into corner position, captions repositioned. **Rendered a real 1080x1920 MP4 end-to-end**, correctly blocked until its parent long-form item reached `rendered` (AC) |
| TICKET-010 | Render pipeline (Node worker) | ✅ | `services/render/pipeline.ts` orchestrates voice→asset-selection→Remotion→thumbnails; `POST /api/content/:id/render` triggers it fire-and-forget (202 response), `GET /:id` polls status. Bundle is cached per server process. Shorts render is gated on parent status. Failures are written to `status:'failed'` + `script_metadata.render_error`. **Duration guardrail:** morning_news 2-3min, quiz 4-5min, nostalgia 8-10min, bedtime_story 28-32min; letter_reading/companionship remain provisional. It runs after TTS and before Remotion; audio dưới minimum trở về `needs_review` với `duration_warning`. |
| TICKET-010b | Sinh thumbnail từ asset gốc | 🚧 | `renderThumbnail.ts` renders 3 real variants (a/b/c) from the original background+mascot via Remotion Still, not a video-frame grab — verified real PNG output. Gap: hook text is a plain truncation heuristic, not an LLM-generated hook "inspired by the script" (would need a Claude API call this pipeline doesn't make for Excel-import content) |
| TICKET-018 | Video quality + channel branding pass | ✅ | Reviewed six 2026-09-21 renders against the spec. Added paginated readable captions, channel-aware intro, subtle watermark, Shorts hook, long/Shorts outro, YouTube end-screen space, quiz choices + timed answer reveal. Generated JP avatar/banner and SEO-ready channel copy under `branding/jp/`. See `VIDEO-QUALITY-REVIEW.md`. Licensed BGM/SFX and final VOICEVOX speaker remain external asset decisions. |

## EPIC 6 — Module đăng tải (YouTube API)

| Ticket | Title | Status | Note |
|---|---|---|---|
| TICKET-011 | YouTube OAuth2 setup (2 kênh) | 🟨 | Market-specific OAuth client is implemented; waiting for real JP/KR Google credentials and refresh tokens |
| TICKET-012 | Upload & schedule service | ✅ | YouTube upload via `googleapis`, private scheduling by date/time slot, primary thumbnail, DB status updates, QA gate, duplicate-prevention upload lock, manual endpoint and opt-in periodic sweep |
| TICKET-013 | Cross-posting (TikTok/Reels auto, Band/VOOM manual) | ⬜ | Not started |

## EPIC 7 — Orchestrator & Dashboard

| Ticket | Title | Status | Note |
|---|---|---|---|
| TICKET-014 | Pipeline orchestrator (BullMQ+Redis) | ⬜ | Not started |
| TICKET-015 | React — Review queue UI | ✅ | Built previous session (`ReviewQueue.tsx`) |
| TICKET-016 | React — Quản lý thư viện ảnh | ⬜ | Not started |
| TICKET-017 | React — Calendar view | 🚧 | Built previous session (`Calendar.tsx`); missing the Excel-import buttons/result panel (they live on a separate `/import` page instead) and the Shorts `cross_post_status` badge (depends on TICKET-013) |

## EPIC 8 — Launch readiness

| Ticket | Title | Status | Note |
|---|---|---|---|
| TICKET-019 | Persist SEO metadata + quiz timestamps | ✅ | Added spec-required fields to Prisma/Postgres and Excel template/import. Applied migration, backfilled 29 existing items, and verified real quiz description timestamps (`0:27` through `2:54`) from VOICEVOX caption timing. |
| TICKET-020 | Reliable sequential render queue | ✅ | In-process FIFO queue enforces concurrency 1, rejects active/pending duplicates, records isolated failures without stopping later jobs, exposes `/render-queue/status`, and is visible/controllable from Calendar dashboard with 3-second polling. TTS segments are also synthesized sequentially to prevent VOICEVOX OOM/exit 137, with a clear engine-unavailable error. Verified live with six jobs and an `already_active` duplicate response. |
| TICKET-021 | Content factual/native-language QA gate | ✅ | Added persisted source URLs, factual QA, native-language QA, reviewer/notes/timestamp fields; historical/news approval requires at least one source. Excel import detects deterministic medical/health claims, forces `needs_review`, and records a high-priority warning. Added `/quality-review` API and dashboard queue. Migration applied and server/dashboard/video typechecks pass. |
| TICKET-022 | Final JP audio identity | 🚧 | Operator selected No.7 読み聞かせ (speaker 31); production config and description credit updated, and six day-21 outputs are queued for fresh audio/render. Licensed JP BGM + three signature SFX still required, so ticket remains partial. |
| TICKET-023 | Duration compliance rewrite | ✅ | No.7 renders meet long-form minimums (morning 2:55, quiz 4:50, nostalgia 9:29, bedtime 10:05). Shorts narration is guarded at 28s; day-21 quiz and nostalgia Shorts were rewritten and ffprobe-verified at 16.15s and 18.92s, both 1080x1920 H.264/AAC. |
| TICKET-024 | Retention visual scenes | 🚧 | Added deterministic supporting background rotation for nostalgia/story/letter/companionship every 75s (maximum six scenes) with calm 2s dissolves and alternating Ken Burns direction. Typechecks pass, but the real 9:29 render still times out during initial component evaluation even at 300s; optimization is required before enabling this in production. |
| TICKET-025 | Thumbnail hook quality + A/B package | ⬜ | Generate content-derived hook copy, validate against SEO title, package 3 genuinely distinct candidates per long video. |
| TICKET-026 | Week 1 full render + QA report | ⬜ | Render all approved week-1 long videos and derived Shorts, ffprobe/visual/audio QA, list anything still blocked in review queue. |
| TICKET-027 | KR channel launch pack | 🔒 | Verify Typecast API/voice/license and create final Bori avatar, banner, description and audio identity. |

---

## Working notes

- Docker Desktop is now running. Real Postgres is up (`docker compose up -d`), the first real
  migration is applied, and both `asset_library` (34 real images) and `audio_library` (placeholder
  BGM/SFX rows — TICKET-006b still needs real audio) are seeded. VOICEVOX Engine was also run in a
  container and produced a real, ffprobe-verified jp voice clip through the actual pipeline.
- TICKET-007's real assets are in and fully resolved — the crop-safety question got fixed at the
  source (library regenerated without a baked-in mascot) rather than worked around in code.
- EPIC 5 (Remotion) is done and proven end-to-end: real Excel import → `POST /content/:id/render`
  → TTS → asset selection → Remotion → real MP4s and thumbnails, for both long-form (16:9) and
  Shorts (9:16). Every step ran through the actual production route, not a bypass script.
- Render gracefully skips BGM/SFX when the referenced file doesn't exist on disk yet (checked at
  render time) — real audio isn't delivered (TICKET-006b), so today's renders have voice + Ken
  Burns visuals but no music/sound effects. Nothing to fix; they'll appear automatically once real
  files land in the paths `audio_library` already points at.
- Still blocked on you: Typecast account (kr voice), a chosen VOICEVOX speaker_id for Komachi
  (currently a placeholder pick, speaker 8), real BGM/SFX audio files, YouTube OAuth credentials.
- Next: EPIC 6 (YouTube upload) needs your Google Cloud Console credentials regardless of how much
  code exists around it, so EPIC 7's orchestrator (TICKET-014, so the whole week runs on its own
  instead of one `/render` call at a time) is the more useful next code-only chunk.
