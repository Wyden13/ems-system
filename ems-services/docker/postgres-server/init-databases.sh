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
create_database ems_employee_db employee_user "${EMPLOYEE_DB_PASSWORD:?Set EMPLOYEE_DB_PASSWORD}"
create_database ems_schedule_db schedule_user "${SCHEDULE_DB_PASSWORD:?Set SCHEDULE_DB_PASSWORD}"
create_database ems_attendance_db attendance_user "${ATTENDANCE_DB_PASSWORD:?Set ATTENDANCE_DB_PASSWORD}"
create_database ems_payroll_db payroll_user "${PAYROLL_DB_PASSWORD:?Set PAYROLL_DB_PASSWORD}"
create_database ems_leave_db leave_user "${LEAVE_DB_PASSWORD:?Set LEAVE_DB_PASSWORD}"
create_database ems_organization_db organization_user "${ORGANIZATION_DB_PASSWORD:?Set ORGANIZATION_DB_PASSWORD}"
