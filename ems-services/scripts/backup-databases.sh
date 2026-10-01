#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
backup_dir="${1:?Usage: backup-databases.sh ABSOLUTE_OUTPUT_DIRECTORY [COMPOSE_FILE]}"
compose_file="${2:-docker-compose.yml}"
[[ "$backup_dir" = /* ]] || { echo "Use an absolute backup path" >&2; exit 1; }
mkdir -p "$backup_dir"
for database in auth people workforce; do
  target="$backup_dir/ems_${database}_db.dump"
  [[ ! -e "$target" ]] || { echo "Refusing to overwrite $target" >&2; exit 1; }
  docker compose -f "$compose_file" exec -T postgres pg_dump -U postgres -Fc "ems_${database}_db" > "$target.partial"
  mv "$target.partial" "$target"
done
printf 'Backups saved to %s\n' "$backup_dir"
