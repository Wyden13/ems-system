#!/usr/bin/env bash
set -euo pipefail
backup_dir="${1:?Usage: verify-backup.sh ABSOLUTE_BACKUP_DIRECTORY}"
[[ "$backup_dir" = /* && -d "$backup_dir" ]] || { echo "Use an existing absolute backup path" >&2; exit 1; }
check_container="ems-restore-check-$$"
cleanup() { docker rm -f "$check_container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# No published ports, existing volumes or platform database connections.
docker run -d --name "$check_container" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:18 >/dev/null
for attempt in {1..60}; do
  if docker exec "$check_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$check_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null
for database in auth employee organization attendance payroll schedule leave; do
  archive="$backup_dir/ems_${database}_db.dump"
  test -s "$archive"
  docker exec "$check_container" createdb -h 127.0.0.1 -U postgres "ems_${database}_db"
  docker exec -i "$check_container" pg_restore -h 127.0.0.1 -U postgres --no-owner --no-privileges --exit-on-error -d "ems_${database}_db" < "$archive"
  docker exec "$check_container" psql -h 127.0.0.1 -U postgres -d "ems_${database}_db" -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
done
printf 'All seven databases restored successfully into a disposable container.\n'
