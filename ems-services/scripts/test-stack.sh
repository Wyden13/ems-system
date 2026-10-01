#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
./scripts/setup-local.sh
./scripts/build-local.sh
docker compose -f compose.test.yml up -d --wait postgres
docker compose -f compose.test.yml exec -T postgres bash /opt/ems/init-databases.sh
docker compose -f compose.test.yml up -d --wait
# These credentials belong only to the isolated ems-integration-test stack.
BOOTSTRAP_ADMIN_EMAIL=admin@integration.test BOOTSTRAP_ADMIN_PASSWORD=IntegrationTest123! \
  docker compose -f compose.test.yml run --rm --no-deps -e BOOTSTRAP_ADMIN_EMAIL -e BOOTSTRAP_ADMIN_PASSWORD auth-service --spring.profiles.active=bootstrap --server.port=0 --spring.grpc.server.enabled=false
cd ../frontend
npm run test:e2e
