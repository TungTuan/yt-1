#!/usr/bin/env bash
# TICKET-003c — Claude Code headless bridge.
#
# Bridge between fully-manual Excel authoring (TICKET-003b) and calling Claude API directly from
# the app (TICKET-003, billed per token). Runs Claude Code in headless mode against an existing
# Claude Pro/Max subscription (no separate API key/billing) on a schedule (cron/Task Scheduler),
# writes a filled-in weekly-content-upload-template.xlsx, which then goes through the normal
# Excel-import path (TICKET-003b) like any hand-authored sheet.
#
# Usage: run from the repo root, e.g. via cron:
#   0 8 * * 0 cd /path/to/komorebi-haetsal-pipeline && ./scripts/weekly-content-headless.sh
#
# When this bridge's cadence/volume outgrows the Pro/Max plan's rolling rate limits, switch
# CONTENT_SOURCE_MODE=api and use TICKET-003 (direct API calls, billed per token, no rate window)
# instead — this script is deliberately a stopgap, not the long-term path.

set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p logs
OUT_FILE="weekly-content-upload-template.xlsx"
LOG_FILE="logs/claude-code-weekly.log"

echo "=== $(date -u +%FT%TZ) — weekly-content-headless run start ===" >> "$LOG_FILE"

set +e
claude -p "Đọc các prompt trong apps/server/src/prompts/jp/*.ts (market=jp) và \
apps/server/src/prompts/kr/*.ts (market=kr) để hiểu văn phong và schema JSON mong muốn cho \
từng segment_type. Đọc cột quy ước trong apps/server/src/services/excelTemplate.ts \
(WEEKLY_SCHEDULE_COLUMNS / QUIZ_QUESTIONS_COLUMNS). Gọi GET http://localhost:4000/api/content \
với market + khoảng ngày tuần trước để lấy continuity (truyện nhiều tập, quiz/nostalgia đã dùng, \
tránh lặp). Sinh kịch bản tuần này cho cả 2 market (đủ 7 định dạng theo lịch: 07:00, 12:00, 19:00, \
21:00 — KHÔNG tạo dòng Shorts, hệ thống tự derive), ghi trực tiếp vào ${OUT_FILE} theo đúng thứ tự \
cột đã quy ước. Chỉ được đọc/ghi file trong thư mục project này." \
  --allowedTools "Read" "Write" \
  --max-turns 20 \
  --max-budget-usd 2 \
  --output-format json >> "$LOG_FILE" 2>&1
STATUS=$?
set -e

if [ "$STATUS" -eq 0 ]; then
  echo "=== $(date -u +%FT%TZ) — run OK, output: ${OUT_FILE} ===" >> "$LOG_FILE"
else
  echo "=== $(date -u +%FT%TZ) — run FAILED (exit ${STATUS}) — check ${OUT_FILE} was NOT auto-imported ===" >> "$LOG_FILE"
fi

exit "$STATUS"
