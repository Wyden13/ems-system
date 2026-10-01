#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p .local
chmod 700 .local
# Preserve every existing variable. Supply only absent/blank values.
python3 - <<'PYTHON'
from pathlib import Path
import secrets,base64
p=Path('.env'); lines=p.read_text().splitlines() if p.exists() else []
keys=['POSTGRES_ADMIN_PASSWORD','AUTH_DB_PASSWORD','PEOPLE_DB_PASSWORD','WORKFORCE_DB_PASSWORD','JWT_SECRET']
for key in keys:
    index=next((i for i,line in enumerate(lines) if line.startswith(key+'=')),None)
    if index is not None and lines[index].split('=',1)[1].strip(): continue
    value=base64.b64encode(secrets.token_bytes(48)).decode() if key=='JWT_SECRET' else secrets.token_hex(24)
    if index is None: lines.append(key+'='+value)
    else: lines[index]=key+'='+value
p.write_text('\n'.join(lines)+'\n'); p.chmod(0o600)
PYTHON
# Preserve the CA and existing leaf identities when adding new services.
if [ ! -d .local/certs ]; then
  mkdir -p .local/certs
  openssl req -x509 -newkey rsa:3072 -nodes -days 365 -subj '/CN=EMS local CA' -keyout .local/certs/ca.key -out .local/certs/ca.crt 2>/dev/null
fi
test -s .local/certs/ca.crt
for service in auth people workforce; do
  cert=".local/certs/${service}-service.crt"
  key=".local/certs/${service}-service.key"
  if [ -s "$cert" ] && [ -s "$key" ]; then continue; fi
  if [ -e "$cert" ] || [ -e "$key" ]; then
    echo "Incomplete certificate pair for ${service}; restore it before continuing." >&2
    exit 1
  fi
  test -s .local/certs/ca.key || { echo "Existing CA key is required to issue new service certificates." >&2; exit 1; }
  openssl req -newkey rsa:2048 -nodes -subj "/CN=${service}-service" -keyout "$key" -out ".local/certs/${service}-service.csr" 2>/dev/null
  printf 'subjectAltName=DNS:%s-service,DNS:localhost\nextendedKeyUsage=serverAuth,clientAuth\n' "$service" > ".local/certs/${service}.ext"
  openssl x509 -req -days 365 -in ".local/certs/${service}-service.csr" -CA .local/certs/ca.crt -CAkey .local/certs/ca.key -CAcreateserial -extfile ".local/certs/${service}.ext" -out "$cert" 2>/dev/null
done
chmod 755 .local/certs
chmod 644 .local/certs/*.crt .local/certs/*-service.key
chmod 600 .local/certs/ca.key
