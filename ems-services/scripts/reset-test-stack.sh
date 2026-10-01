#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# All records in this fixed isolated integration project are disposable mock data.
./scripts/setup-local.sh
docker compose -f compose.test.yml down -v --remove-orphans
docker compose -f compose.test.yml up -d --wait postgres
docker compose -f compose.test.yml exec -T postgres bash /opt/ems/init-databases.sh
docker compose -f compose.test.yml up -d --wait
export BOOTSTRAP_ADMIN_EMAIL=admin@integration.test
export BOOTSTRAP_ADMIN_PASSWORD=IntegrationTest123!
export DEMO_ACCOUNT_PASSWORD=IntegrationTest123!
docker compose -f compose.test.yml run --rm --no-deps -e BOOTSTRAP_ADMIN_EMAIL -e BOOTSTRAP_ADMIN_PASSWORD auth-service --spring.profiles.active=bootstrap --server.port=0 --spring.grpc.server.enabled=false
EMS_BASE_URL=http://localhost:18080 python3 scripts/seed-demo.py
