#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [ ! -f .demo.local/environment.env ]; then
  python3 - <<'PYENV'
from pathlib import Path
import secrets, base64
p=Path('.demo.local'); p.mkdir(exist_ok=True); p.chmod(0o700)
f=p/'environment.env'
f.write_text('DEMO_DB_PASSWORD='+secrets.token_hex(24)+'\nDEMO_JWT_SECRET='+base64.b64encode(secrets.token_bytes(48)).decode()+'\nBOOTSTRAP_ADMIN_EMAIL=admin1@prairie.demo.test\nBOOTSTRAP_ADMIN_PASSWORD=DemoRetail2026!'+secrets.token_hex(4)+'\nDEMO_ACCOUNT_PASSWORD=DemoRetail2026!'+secrets.token_hex(4)+'\n')
f.chmod(0o600)
PYENV
fi
if [ ! -s ../ems-services/.local/certs/ca.crt ]; then
  echo 'Local service certificates are required. Run ../ems-services/scripts/setup-local.sh first.' >&2
  exit 1
fi
if ! docker image inspect ems/workforce-service:retail-demo >/dev/null 2>&1; then
  bash scripts/demo/build.sh
fi
compose=(docker compose --env-file .demo.local/environment.env -f scripts/demo/compose.yml)
"${compose[@]}" up -d --wait postgres
"${compose[@]}" exec -T postgres bash /opt/ems/init-databases.sh
"${compose[@]}" up -d --wait
set -a
source .demo.local/environment.env
set +a
"${compose[@]}" run --rm --no-deps -e BOOTSTRAP_ADMIN_EMAIL -e BOOTSTRAP_ADMIN_PASSWORD auth-service --spring.profiles.active=bootstrap --server.port=0 --spring.grpc.server.enabled=false
python3 scripts/demo/seed.py
printf '\nDemo backend ready at http://localhost:28080. Frontend: http://127.0.0.1:16173\nStart the frontend with: npm run dev:demo\n'
