# EMS — Employee Management System

EMS is a full-stack portfolio project for employee administration, scheduling, attendance, time off, and gross-pay estimates. It connects a responsive React interface to secure Spring Boot services, with workflows for employees, supervisors, managers, and administrators.

## Objective

Demonstrate an integrated workforce application with role-based access, service-owned databases, auditable business actions, and automated verification across the frontend and backend.

## Core Features

- **Accounts and profiles:** sign-in/out, rotating refresh sessions, profile and password changes, and administrator account management.
- **Employee administration:** employee records, linked login accounts, departments, locations, and hourly rates.
- **Scheduling:** weekly rosters, shift planning and publication, availability, assignments, and employee acceptance or decline.
- **Attendance:** clock-in/out, manager review, corrections, and audit history.
- **Time off:** PTO types, allocated balances, requests, approvals, scheduling conflict checks, and balance ledgers.
- **Pay estimates:** CAD gross-pay estimates from approved completed attendance, including daily and weekly overtime.
- **User experience:** role-based dashboards, responsive layouts, light/dark/system appearance, and a public onboarding preview.

Business time uses `America/Edmonton`. Pay estimates exclude taxes, deductions, payments, paid leave, and scheduled break deductions. Email notifications and automatic PTO accrual are deferred.

## Technologies

| Area | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Material UI, React Router, TanStack Query |
| Backend | Java 17, Spring Boot, Spring Security, Spring Data JPA, Spring Cloud Gateway |
| Data and communication | PostgreSQL 18, Flyway, JWT, gRPC/Protocol Buffers, mutual TLS |
| Build and deployment | npm, Maven wrapper, Docker Compose; AWS deployment scripts |
| Verification | ESLint, Vitest, Testing Library, Playwright, JUnit, Testcontainers, GitHub Actions |

## Repository Structure

| Path | Purpose |
| --- | --- |
| [`frontend/`](frontend/README.md) | React application, browser tests, design documentation, and local demo tools |
| [`ems-services/`](ems-services/README.md) | Backend services, database migrations, local setup, and operational scripts |
| `ems-services/ems-gateway-service/` | Browser-facing API routing |
| `ems-services/ems-auth-service/` | Accounts, authentication, and sessions |
| `ems-services/ems-people-service/` | Employee records, departments, and locations |
| `ems-services/ems-workforce-service/` | Scheduling, PTO, attendance, and pay estimates |
| `ems-services/ems-contracts/` | Shared Protocol Buffer contracts |
| `ems-services/deploy/aws/` | AWS deployment scripts and hosting documentation |
| `.github/workflows/ems.yml` | Backend, frontend, browser, and database restoration checks |

The supported backend runs Gateway, Auth, People, and Workforce. Auth, People, and Workforce each own a database. Internal gRPC connections use mutual TLS. Notification scaffolding is excluded from the supported build and deployment.

## Local Setup

Requirements: Java 17, Node.js 24 (used in CI), npm, running Docker with Compose, Python 3, OpenSSL, and Bash. The Maven wrapper is included.

### 1. Start the backend

From the repository root:

```sh
cd ems-services
./scripts/setup-local.sh
docker compose up -d postgres
./scripts/provision-databases.sh
./scripts/build-local.sh
docker compose up -d --wait
```

Setup generates local credentials and certificates while preserving existing values. Flyway applies database migrations at startup. Keep generated `.env` and `.local/` files private.

### 2. Create the first administrator

In `ems-services/`, use Bash and choose your own credentials:

```bash
bash
export BOOTSTRAP_ADMIN_EMAIL='admin@example.com'
read -r -s -p 'Admin password: ' BOOTSTRAP_ADMIN_PASSWORD
export BOOTSTRAP_ADMIN_PASSWORD
./scripts/bootstrap-admin.sh
unset BOOTSTRAP_ADMIN_PASSWORD
```

The normal local stack has no default login credentials.

### 3. Start the frontend

In another terminal, from the repository root:

```sh
cd frontend
npm ci
cp .env.example .env
EMS_GATEWAY_URL=http://localhost:8080 npm run dev
```

Skip the copy command if `frontend/.env` already exists. Open <http://localhost:5173> and sign in with the administrator created above. The explicit gateway override connects to the local backend; the frontend's default configuration targets the AWS gateway.

The local gateway uses port `8080`; Auth, People, and Workforce use ports `8081`, `8082`, and `8083`. Readiness is available at <http://localhost:8080/actuator/health/readiness>.

## Usage

1. **Administrator:** create locations, departments, accounts, and employee records; link employees to accounts, set rates, and allocate PTO balances.
2. **Manager or supervisor:** plan and publish shifts, assign employees, and review PTO. Supervisors work within their linked employee's department.
3. **Employee:** set availability, respond to assignments, clock in/out, and request time off. Managers or administrators review attendance.
4. **Payroll:** inspect CAD gross-pay estimates from approved completed attendance. Employees and supervisors see their own estimates; managers and administrators can view others.

Personal workflows require a linked employee record. Users cannot approve their own PTO or review their own attendance.

Visit `/onboarding-preview` for a prototype using fictional session-only data. For a separate local organization with seeded accounts, shifts, attendance, and PTO, follow the [Prairie Market demo guide](frontend/docs/retail-demo.md).

To stop the normal backend while keeping its database volume, run `docker compose down` from `ems-services/`. Stop the frontend with Ctrl+C.

## Testing

Frontend checks, from `frontend/`:

```sh
npm run lint
npm run build
npm test
```

Backend unit and PostgreSQL integration tests, from `ems-services/`:

```sh
./mvnw -Dtest='*Test,*Tests,*IT' -Dsurefire.failIfNoSpecifiedTests=false test
```

Docker must be running for integration tests. After installing frontend dependencies, install the browser from `frontend/` and run the isolated browser workflows:

```sh
npx playwright install chromium
../ems-services/scripts/test-stack.sh
```

The browser script builds the backend images and starts a separate `ems-integration-test` Compose project with its own database volume, gateway port `18080`, and frontend port `15173`. Stop that stack from `ems-services/` with `docker compose -f compose.test.yml down`.

GitHub Actions runs backend tests, frontend checks, integrated browser workflows, and database backup restoration verification.

## Documentation

- [Frontend installation and usage](frontend/README.md)
- [Backend installation and usage](ems-services/README.md)
- [Feature scope, permissions, APIs, and operations](ems-services/DOCUMENTATION.md)
- [MVP verification](ems-services/MVP_VERIFICATION.md)
- [Frontend design system](frontend/docs/DESIGN_SYSTEM.md)
- [Onboarding design](frontend/docs/onboarding-design.md) and [backend plan](frontend/docs/onboarding-backend-plan.md)
- [Local organization demo](frontend/docs/retail-demo.md)
- [Cloud demo](frontend/docs/cloud-demo.md)
- [AWS deployment and hosting](ems-services/deploy/aws/README.md)

## License

No license is currently specified for this project.
