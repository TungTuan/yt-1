#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dump_path="$repo_dir/backups/komorebi-db.dump"

if [[ ! -f "$dump_path" ]]; then
  echo "Missing database backup: $dump_path" >&2
  exit 1
fi

docker compose up -d db
until docker compose exec -T db pg_isready -U komorebi -d komorebi >/dev/null 2>&1; do
  sleep 1
done

docker compose exec -T db pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -U komorebi \
  -d komorebi < "$dump_path"

echo "Database restored from $dump_path"
