#!/usr/bin/env bash
set -euo pipefail
# Set EMS_PORT_PREFIX=1 for the isolated integration stack (18080–18087).
prefix="${EMS_PORT_PREFIX:-}"
for port in 8080 8081 8082 8083 8084 8085 8086 8087; do
  curl --max-time 10 -fsS -o /dev/null "http://127.0.0.1:${prefix}${port}/actuator/health/readiness"
  printf 'Ready: %s%s\n' "$prefix" "$port"
done
