#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BOOTSTRAP_ADMIN_EMAIL:?Set BOOTSTRAP_ADMIN_EMAIL}"
: "${BOOTSTRAP_ADMIN_PASSWORD:?Set BOOTSTRAP_ADMIN_PASSWORD}"
docker compose run --rm --no-deps -e BOOTSTRAP_ADMIN_EMAIL -e BOOTSTRAP_ADMIN_PASSWORD auth-service --spring.profiles.active=bootstrap --server.port=0 --spring.grpc.server.enabled=false
