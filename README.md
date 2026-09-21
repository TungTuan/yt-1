# こもれび便り × 햇살 편지 — Content Pipeline

Monorepo implementing `komorebi-app-spec.md` (v6), in the spec's own recommended build order.
Status as of this pass: **EPIC 1-5 are done**, proven with a real end-to-end run — Excel import →
`POST /content/:id/render` → real VOICEVOX voice → real asset selection → real Remotion render →
a real playable MP4 + thumbnail, for both long-form (16:9) and Shorts (9:16). EPIC 6 (YouTube
upload) needs your Google credentials before it can start. See `Task.md` for the full per-ticket
status.

## Structure

```
/apps
  /server      Node.js (Express) API + Prisma ORM + Remotion render pipeline
  /video       Remotion project (video compositions)
  /dashboard   React (Vite) frontend
/packages
  /shared-types  TypeScript types shared by both apps (ContentItem, AssetLibraryItem, ...)
```

## Setup

```bash
cp .env.example apps/server/.env   # adjust DATABASE_URL etc. if needed
docker compose up -d               # starts local Postgres (see docker-compose.yml)
npm install
npm run prisma:migrate             # creates content_items / asset_library / audio_library
npm run prisma:import-assets       # imports the real TICKET-007 image library (public/assets/)
npm run prisma:seed                # seeds audio_library (placeholder BGM/SFX rows — TICKET-006b)
npm run dev                        # runs server (:4000) + dashboard (:5173) together
```

Dashboard: http://localhost:5173 — the Vite dev server proxies `/api/*` to the Express server.

## Run the complete stack with Docker

This is the recommended setup for rendering on another Linux machine. It starts PostgreSQL,
VOICEVOX CPU, the API/Remotion renderer, and the dashboard. Database data and rendered media are
stored in named Docker volumes.

```bash
cp .env.docker.example .env
# Change POSTGRES_PASSWORD in .env before using the machine on a network.
docker compose up -d --build
docker compose ps
```

Open `http://localhost:5173`. The API is available at `http://localhost:4000/api/health` and
VOICEVOX at `http://localhost:50021`. On another computer, replace `localhost` with the Docker
host's IP address. Set `PUBLIC_BASE_URL=http://HOST_IP:4000` only if clients need direct backend
media URLs; otherwise the dashboard serves `/media` through Nginx on port 5173.

Useful commands:

```bash
docker compose logs -f server
docker compose restart server
docker compose down                 # preserves database and rendered media
docker compose down -v              # permanently deletes both named volumes
```

## Move the project to another machine

Rendered MP4 files and local secrets are intentionally excluded from Git. Source code, the
runtime JP/KR image library, content workbooks, and a PostgreSQL snapshot are included so content
generation and rendering can continue on another machine.

On the new machine:

```bash
git clone https://github.com/TungTuan/yt-1.git
cd yt-1
cp .env.docker.example .env
# Set a private POSTGRES_PASSWORD and add any API/YouTube credentials locally.
bash scripts/restore-database-backup.sh
docker compose up -d --build
docker compose ps
```

Then open `http://localhost:5173/calendar`. The committed database snapshot preserves content,
SEO metadata, review state, and the render queue data present when the snapshot was exported.
Previously rendered MP4 paths can point to files that were deliberately not committed; rerender
those items if the actual video file is needed on the new machine. New renders are written to
`exports/`, which is mounted from the host by Docker Compose.

Before moving again, refresh the database snapshot with:

```bash
node scripts/export-database-backup.mjs
```

The server applies Prisma migrations on startup and seeds the asset/audio catalogs only when the
corresponding table is empty. Video rendering is CPU-intensive; allocate at least 4 CPU cores,
8 GB RAM, and sufficient disk space. The server container reserves a 2 GB shared-memory area for
headless Chromium.

## Real asset library (TICKET-007)

`komorebi-asset-prompts.md` (repo root) is the prompt set used to produce it. The delivered
34 images live in `apps/server/public/assets/` (served at `/assets/...`) and are imported by
`prisma/importRealAssets.ts`:
- `mascot/` — 8 transparent poses, shared by both channels (one character design, per the spec)
- `backgrounds/jp/` (20) and `backgrounds/kr/` (4) — full scenes with the mascot already painted
  into the left third of frame (not a separate empty plate — see the open item below)
- `overlay/` — the 2 quiz overlay assets

An earlier delivery had the mascot baked into the backgrounds off-center, which would have broken
Shorts center-cropping — the library was regenerated as clean empty scenes (mascot composited
separately, as `mascot/` was always meant to be used) and re-imported. `aspectSafeCrop: true`
across all 24 backgrounds now, verified against a live Shorts asset-selection query.

## Content pipeline state machine

```
queued → scripted → needs_review (if sensitive) → approved → voiced → rendered → uploaded → published
```

The Excel-import path (this MVP) skips straight to `scripted`, or `needs_review` when the
segment type demands human review.

## Excel import workflow (TICKET-003b)

1. Dashboard → "Import Excel" → **Tải mẫu Excel** downloads a 3-sheet workbook:
   - `Huong_dan` — column reference and rules
   - `Weekly_Schedule` — one row per long-form `content_item` (Shorts are always auto-derived
     later, never entered by hand)
   - `Quiz_Questions` — question rows linked to a schedule row by `market` + `date`
2. Fill it in, delete the example row, upload it back via **Upload file tuần**.
3. `POST /api/content/import-excel` parses the workbook (`exceljs`), validates every row, and
   imports the valid ones — invalid rows are skipped and reported by row number without blocking
   the rest (per TICKET-003b AC).
4. `segment_type = letter_reading` or `companionship` is **always** forced into
   `needs_review = true`, regardless of what the sheet says — there is no bypass.
5. A configurable keyword safeguard (`apps/server/config/crisis-keywords.json`, TICKET-005 AC)
   flags a review-queue item high-priority when the script text matches a crisis-warning keyword
   for its market. **The seeded keyword list is a placeholder** — replace it with guidance from
   someone qualified in crisis-response language before relying on it.

`CONTENT_SOURCE_MODE` (env var, default `excel`) is read by `apps/server/src/config.ts` and is
meant to gate the future orchestrator (TICKET-014): when `excel`, it must not call Claude API to
create content. The orchestrator itself isn't built in this MVP.

## API endpoints (apps/server)

| Method | Path                          | Purpose |
|---|---|---|
| GET  | `/api/content/template`        | Download the Excel template |
| POST | `/api/content/import-excel`    | Import a filled-in workbook (`multipart/form-data`, field `file`) |
| GET  | `/api/content?market=&status=&from=&to=` | List content items |
| GET  | `/api/content/review-queue?market=` | List `needs_review` items, crisis-flagged first |
| GET  | `/api/content/:id`             | Get one content item |
| PATCH | `/api/content/:id/review`     | `{approved, edited_script?, reviewed_by?, rejection_reason?}` — approve or reject (TICKET-005) |

## Database (TICKET-002)

Prisma schema: `apps/server/prisma/schema.prisma` — `content_items`, `asset_library`,
`audio_library`, all `market`-aware (`jp` / `kr` / `shared`), matching the spec's tables.

**Known gap:** the spec's two cross-row constraints (`format = shorts` requires a
`parent_content_id`; a Shorts item's parent must share its `market`) aren't expressed as DB-level
`CHECK`/trigger constraints yet — Prisma's schema DSL can't express them directly, and generating
that migration needs a live Postgres connection this environment doesn't have. They're satisfied
in practice because the Excel-import path only ever creates `format = long_form` rows; add the
constraint via a hand-written migration before EPIC 5/TICKET-014 starts creating Shorts rows.

## Claude API content generation (TICKET-003/004/004b)

Only active when `CONTENT_SOURCE_MODE=api` (default is `excel`, see above). `src/services/contentGenerator.ts`
calls `generateContent(market, segmentType, options)`, which:
- picks the right prompt module from `src/prompts/{jp,kr}/*.ts` (7 formats × 2 markets, each with
  its own zod schema in `src/prompts/schemas.ts`) and the right model (Haiku for `quiz`/`gratitude_ritual`,
  Sonnet for the rest, per the spec's cost guidance)
- injects a rotating `target_keyword` from `config/seo-keywords.json` for every format except
  `morning_news`/`gratitude_ritual` (TICKET-004b), and flags (doesn't yet auto-regenerate) a
  `seo_title` that fails the keyword-position check
- retries on rate-limit/5xx/malformed-JSON, uses prompt caching on the system prompt, and logs
  every call's token usage to `api_usage_logs`, split by market (TICKET-003 AC)
- **cannot let `letter_reading`/`companionship` end up with `needs_review=false`** — the raw JSON
  is patched before schema validation, so this holds even if Claude gets it wrong

**Known gap:** KR prompts (`src/prompts/kr/*.ts`) are drafted to mirror the JP ones structurally
(per the spec's own instructions for `haetsal-pyeonji-kr-prompts.md`), since that referenced file
wasn't provided alongside the spec — swap in the real file's content if you have it.

Requires `ANTHROPIC_API_KEY` in `apps/server/.env` (only when `CONTENT_SOURCE_MODE=api`).
`scripts/weekly-content-headless.sh` (TICKET-003c) is the cron-driven Claude Code alternative that
needs no API key — see the script's own header comment.

## TTS (TICKET-006)

`src/services/tts/synthesize(market, contentId, scriptText)` splits on `[PAUSE]`, synthesizes each
segment through the market's adapter, and splices the WAV segments back together with a fixed
silence gap (`src/services/tts/wav.ts` — pure PCM WAV read/write/concat, unit-tested). jp uses
`VoicevoxAdapter` (a real, documented local API — run `docker run -p 50021:50021
voicevox/voicevox_engine:cpu-latest`, set `VOICEVOX_SPEAKER_ID`). kr's `TypecastAdapter` is
**unverified** — I don't have current Typecast docs or an account to confirm the request shape
against; it's a clearly-marked placeholder, check it before relying on it.

## Asset selection (TICKET-008)

`src/services/assetSelection.ts` → `selectAssets({market, segmentType, format, scheduledDate,
timeSlot})` picks a background (market-or-shared, time-of-day/season match, `aspect_safe_crop`
enforced for `format=shorts`), a mascot pose (fixed per-segment mapping — see the file's comment,
it's a reasonable default since the spec doesn't hand down the exact table), the quiz overlay pair
when relevant, and BGM (always market-specific)/SFX (always shared, `bird_chirp_intro` +
`chime_transition` always, `page_turn` added for `bedtime_story`).

## Video rendering (EPIC 5)

`apps/video` is a standalone Remotion project (its own workspace, no build step — `@remotion/bundler`
webpack-bundles the TSX directly). Two video compositions + one still:

- **`LongForm`** (1920x1080, TICKET-009): hybrid visual system with 42-second scene changes,
  scene-aware ambient effects, foreground parallax/light rays, rotating mascot poses and timed
  quote/keyword/takeaway cards; plus Ken Burns background pan/zoom and quiz
  overlay (question text rendered dynamically onto the blank card), subtitles synced to
  `[PAUSE]`-segment caption cues, title card, BGM ducking (~18% while voiced, ~45% during pauses)
  driven directly off the same caption-cue timing, SFX cues (`bird_chirp_intro`@0,
  `chime_transition`@title-reveal, `page_turn` for bedtime_story)
- **`Shorts`** (1080x1920, TICKET-009b): same background component naturally center-crops at 9:16;
  `wing_flap` mascot pose animates from a large centered opening frame into the corner
- **`Thumbnail`** still (TICKET-010b): 3 variants (a/b/c) from the original background + mascot
  art (not a compressed video-frame grab), with a hook-text heuristic (title, truncated — not an
  LLM-generated hook, since Excel-import content has no seo_title/Claude call to draw from)

`apps/server/src/services/render/` wires it all together:
- `pipeline.ts` — `renderContentItem(id)`: voice (TICKET-006, cached after first run) → asset
  selection (TICKET-008) → Remotion render → thumbnails, writing `audio_path`/`video_path`/
  `thumbnail_path`/`status` back to the DB at each stage. Shorts refuse to render until their
  parent long-form item is `rendered` (TICKET-010 AC).
- `POST /api/content/:id/render` triggers it fire-and-forget (202 response); poll `GET /:id` for
  status. Allowed from `scripted`/`approved`/`voiced`/`failed` (the first three are all valid
  pre-render states depending on whether the item needed human review).
- BGM/SFX are included only when the file referenced by `audio_library.file_path` actually exists
  on disk — real audio isn't delivered yet (TICKET-006b), so today's renders have voice + visuals
  but no music, and will pick it up automatically once real files land.

Bundle is cached per server process (`bundleCache.ts`); assets are served over HTTP
(`/assets/...`, `/audio/...` — both under `public/`, served at root) rather than local file paths,
since the render itself runs in headless Chrome, which fetches by URL.

## YouTube auto-upload (TICKET-011/012)

The server supports market-specific YouTube upload and scheduling. Copy the YouTube keys from
`apps/server/.env.example` into `apps/server/.env`; each refresh token must belong to the
actual JP or KR channel selected by its prefix.

Safety rules:

- Auto-upload is disabled by default (`YOUTUBE_AUTO_UPLOAD=false`).
- Only `rendered` items that passed factual and language QA are eligible. Shorts inherit the
  QA gate from their parent long-form item.
- Videos upload as `private` with YouTube `publishAt`; the app never publishes immediately.
- The default sweep uploads eligible videos up to seven days ahead and runs every five minutes.
- An upload lock prevents blind retries after an uncertain API failure. Check YouTube Studio
  before clearing/retrying a locked item to avoid creating a duplicate.

Test one item while auto mode is off:

```bash
curl -X POST http://localhost:4000/api/content/CONTENT_ID/youtube-upload
```

Run a one-off sweep:

```bash
curl -X POST http://localhost:4000/api/content/youtube/upload-sweep
```

After one scheduled upload has been verified on each channel, set `YOUTUBE_AUTO_UPLOAD=true`
and restart the server. Publish time is derived from `scheduled_date + time_slot` in UTC+9.

## What's not built yet

- **EPIC 6:** Real JP/KR OAuth credentials still need to be connected; cross-posting (TICKET-013)
  remains
- **EPIC 7 (rest):** pipeline orchestrator/scheduler (TICKET-014), asset-library management UI
  (TICKET-016)

See `Task.md` for the full per-ticket status (including which EPIC 2/3/4 pieces above are done vs.
still blocked on credentials you'd need to provide).

The Calendar view (TICKET-017) and Review Queue UI (TICKET-015) show script/status/market, but
don't yet surface `audio_path`/`video_path`/`thumbnail_path`/a render-trigger button — those
columns are populated by the render pipeline now, the dashboard just hasn't been wired to display
or trigger it (TICKET-017's remaining gap).

## Commands

- `npm run dev` — server + dashboard together (does not include `apps/video`, which has no dev
  server of its own beyond `remotion studio` — see below)
- `npm run build` — build shared-types, server, dashboard
- `npm run lint` / `npm run format`
- `npm run prisma:migrate` / `npm run prisma:import-assets` / `npm run prisma:seed` — run against
  `apps/server/.env`'s `DATABASE_URL`
- `cd apps/video && npx remotion studio src/index.ts` — interactive Remotion preview (props panel
  needs real URLs pasted in manually; the server always supplies them for real via `/render`)
- `curl -X POST http://localhost:4000/api/content/<id>/render` — trigger a render once the server
  is running and the item is `scripted` or later

Run a single workspace directly with `-w`, e.g. `npm run dev -w apps/server`.
