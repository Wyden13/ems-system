# EMS Backend

## Introduction

The service layer for the Employee Management System (EMS), a portfolio project demonstrating employee administration, scheduling, attendance, time off, and gross-pay estimates.

## Objective

Demonstrate a service-based backend with secure APIs, role-based access, database migrations, and auditable workforce workflows.

## Core Features

- Authentication, rotating refresh sessions, profiles, and administrator account management.
- Employee records, linked accounts, departments, and locations.
- Shift planning, availability, publication, and assignment responses.
- Attendance clock-in/out, review, corrections, and audit history.
- PTO allocations, reservations, approvals, conflict checks, and balance ledgers.
- CAD gross-pay estimates from approved attendance, including overtime.

Payroll provides estimates only; taxes, deductions, payments, paid leave, and scheduled break deductions are excluded. Email notifications, automatic PTO accrual, and reports/exports are deferred.

## Technologies

Java 17, Spring Boot, Spring Security, Spring Data JPA, Spring Cloud Gateway, PostgreSQL 18, Flyway, JWT, gRPC/Protocol Buffers, Maven, and Docker Compose. Backend tests use JUnit and Testcontainers.

## Architecture

| Module | Responsibility |
| --- | --- |
| `ems-gateway-service` | Browser-facing API routing |
| `ems-auth-service` | Accounts, authentication, and sessions |
| `ems-people-service` | Employees, departments, and locations |
| `ems-workforce-service` | Scheduling, PTO, attendance, and pay estimates |
| `ems-contracts` | Shared Protocol Buffer contracts |

Auth, People, and Workforce each own a database. Internal gRPC links use mutual TLS. Notification scaffolding is excluded from the supported build and deployment.

## Installation

Requirements: Java 17, running Docker with Compose, Python 3, OpenSSL, and Bash. The Maven wrapper is included. Browser tests also require Node.js 24 and npm.

From `ems-services/`:

```sh
./scripts/setup-local.sh
docker compose up -d postgres
./scripts/provision-databases.sh
./scripts/build-local.sh
docker compose up -d --wait
```

Setup generates local credentials and certificates while preserving existing values. Keep `.env` and `.local/` private. Flyway applies database migrations at startup.

Create the first administrator with your own credentials. Enter Bash first if your current shell is different:

```bash
bash
export BOOTSTRAP_ADMIN_EMAIL='admin@example.com'
read -r -s -p 'Admin password: ' BOOTSTRAP_ADMIN_PASSWORD
export BOOTSTRAP_ADMIN_PASSWORD
./scripts/bootstrap-admin.sh
unset BOOTSTRAP_ADMIN_PASSWORD
```

The normal stack has no default login credentials.

## Usage

The gateway is available at <http://localhost:8080>, with health checks at `/actuator/health`. Auth, People, and Workforce use local ports `8081`, `8082`, and `8083`.

Follow the [frontend setup](../frontend/README.md), open <http://localhost:5173>, and sign in as the administrator:

1. **Administrator:** create the organization, accounts, and linked employee records; set hourly rates, create PTO types, and allocate balances.
2. **Manager or supervisor:** publish schedules and review PTO requests after resolving shift conflicts. Supervisors work within their department.
3. **Employee:** set availability, respond to assignments, clock in/out, and request leave. Managers or administrators review attendance.
4. **Payroll:** view CAD gross-pay estimates from approved completed attendance. Employees see their own estimates; managers and administrators can view others.

Personal workflows require linked employee accounts. Users cannot review their own attendance or approve their own leave.

To inspect or stop the local stack:

```sh
docker compose ps
docker compose logs -f gateway-service
docker compose down
```

Stopping the stack preserves its database volume. Business time uses `America/Edmonton`; pay estimates use CAD.

## Testing

```sh
./mvnw -Dtest='*Test,*Tests,*IT' -Dsurefire.failIfNoSpecifiedTests=false test
```

Docker must be running for PostgreSQL integration tests. After installing frontend dependencies and Playwright Chromium, run `./scripts/test-stack.sh` for isolated end-to-end workflows.

## Documentation

- [Feature scope, access rules, API, and operations](DOCUMENTATION.md)
- [MVP verification](MVP_VERIFICATION.md)
- [AWS deployment](deploy/aws/README.md)
- [Frontend setup and usage](../frontend/README.md)

## License

No license is currently specified for this project.
