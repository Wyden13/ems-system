#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# The initializer is idempotent; it adds missing databases/roles and never resets existing data.
docker compose exec -T postgres bash /opt/ems/init-databases.sh
