#!/usr/bin/env bash
set -euo pipefail

create_database() {
  local db_name="$1"
  local db_user="$2"
  local db_password="$3"

  psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=ON_ERROR_STOP=1 \
    --set=db_name="$db_name" \
    --set=db_user="$db_user" \
    --set=db_password="$db_password" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_user', :'db_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name')
\gexec
SQL
}

# Creates only missing roles/databases; existing passwords are unchanged.
create_database ems_auth_db auth_user "${AUTH_DB_PASSWORD:?Set AUTH_DB_PASSWORD}"
create_database ems_people_db people_user "${PEOPLE_DB_PASSWORD:?Set PEOPLE_DB_PASSWORD}"
create_database ems_workforce_db workforce_user "${WORKFORCE_DB_PASSWORD:?Set WORKFORCE_DB_PASSWORD}"
