# EMS workforce MVP

The integrated application includes authentication/accounts, employee records, organization management, attendance, gross-pay estimates, scheduling, and PTO. React uses actual APIs through the gateway. The historical pre-integration inventory remains in `PRE_INTEGRATION_AUDIT.md`; it is not the current feature status.

## Implemented scope

| Module                | Implemented behavior                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts              | Login/logout, rotating refresh sessions, profile/password changes, administrator account management and last-admin protection                   |
| Employee/organization | Search and edit employee records, automatic employee numbers, linked login accounts, locations, department archival and remote reference checks |
| Attendance            | Clock-in/out, duplicate retry protection, role/department visibility, manager review, corrections and audit history                             |
| Payroll               | Live CAD gross-pay estimates from approved completed worked time, with daily/weekly overtime                                                    |
| Scheduling            | Department-owned shifts, categories, weekly availability, assignment, publication, acceptance/decline and cancellation                          |
| PTO                   | Admin-funded balances, reservations, department review, conflict checks, cancellation/reversal, ledger and action history                       |
| Dashboards            | Real role-scoped schedules, PTO requests, attendance review counts, personal clock state and pay estimates                                      |

Notifications/email, automatic PTO accrual/carryover, paid-leave pay, scheduled break deductions, attendance scores, finalized payroll, taxes/deductions, payment processing, imports and reports/exports are deferred. Notification scaffolding is outside the main reactor and deployment.

## Access rules

Account roles are the authorization source. Workforce roles remain separate. Employee activation does not change account status. Account links are optional for management-only accounts but required for personal workforce features.

| Operation                                         | Employee                  | Supervisor         | Manager | Admin           |
| ------------------------------------------------- | ------------------------- | ------------------ | ------- | --------------- |
| Employee, account and organization administration | No                        | No                 | No      | Yes             |
| View/clock own attendance                         | Yes                       | Yes                | Yes     | Clock UI hidden |
| Read other attendance                             | No                        | Current department | All     | All             |
| Review/correct attendance                         | No                        | No                 | Others  | Others          |
| View payroll estimates                            | Self                      | Self               | All     | All             |
| Plan shifts                                       | No                        | Current department | All     | All             |
| View shifts                                       | Own published assignments | Current department | All     | All             |
| Edit weekly availability/respond to assignments   | Self                      | Self               | Self    | If linked       |
| Request PTO/view own balance                      | Self                      | Self               | Self    | If linked       |
| Read/review PTO                                   | Self/read only            | Current department | All     | All             |
| Allocate PTO/manage PTO types                     | No                        | No                 | No      | Yes             |
| Manage shift categories                           | No                        | No                 | Yes     | Yes             |

Nobody may approve/reject their own PTO or review/correct their own attendance. Supervisors use their linked employee's current department; there is no explicit reporting tree. Public employee selectors for scheduling and PTO omit pay rates. JWT authentication and row permissions apply independently in each service, including direct-service requests. Caller-supplied `X-User-Id` headers are never authorization credentials.

## Scheduling behavior

Each new shift has a department and its department's location. A supervisor cannot read or change shifts outside their department. Existing legacy shifts may have a null department; managers/admins must assign one before publication. Migration V2 preserves their IDs and data.

Only draft shifts can be edited, and active assignments must first be removed. Published shifts are cancelled and replaced when their details change. Shifts are future-dated and at most 24 hours long. Publication may leave open positions; staffing counts remain visible.

Assignments enforce capacity, active employee status, department membership, duplicate and overlapping commitments, explicit weekly unavailability, and PTO reservations. Declined/cancelled assignments can be reassigned. Publication revalidates assignments. Changes use record versions; stale commands return 409. Concurrent mutations use a database lock, favoring correctness for the MVP workforce size.

Weekly availability is expressed in America/Edmonton local time. `UNAVAILABLE` blocks overlapping assignments. `AVAILABLE` and `PREFERRED` are advisory. Split overnight availability into separate local-day records. An incompatible unavailability change cannot silently invalidate existing commitments.

Employees see their published shifts and can accept or decline upcoming active assignments. They cannot see coworkers' assignments.

## PTO balances and coordination

Admins create PTO types and allocate hours with a reason. Automatic accrual and carryover settings must remain zero in this release. Adjustments and requests carry client-generated UUID request keys; retries cannot apply them twice, and reuse with different data returns 409.

Available hours = allocated hours − used hours − reserved hours. Requests explicitly specify hours and inclusive local dates. Requests cannot overlap other active requests, overdraw the balance or begin in the past. Leave spans are limited to one year. Date-based approved leave blocks the entire selected local dates, even if the requested hours represent a partial day.

- Creation reserves hours and records an audit action.
- Rejection or pending cancellation releases reserved hours.
- Approval first persists `APPROVING`, then asks scheduling for an idempotent leave hold. The same scheduling lock serializes holds, assignment and publication.
- Conflicting draft or published commitments return the request to `PENDING` with conflicting shift IDs. A planner must remove those assignments before approving again.
- Successful approval moves reserved hours to used hours and records exactly one usage ledger entry.
- Approved cancellation first persists `CANCELLING`, releases the scheduling hold and records one reversal. Owners can cancel leave starting today or later; authorized planners may reverse historical leave with a reason.
- Scheduling outages leave an explicit processing state. Recovery retries every 15 seconds and after process restart. No manual database repair is needed for a successful remote operation followed by a local rollback.

Each database owns its data. The leave service uses mTLS gRPC to scheduling; it does not write scheduling tables. Pending requests do not block scheduling until approval coordination begins. Intermediate states prevent ambiguous rollback and overdraw during dependency failures. The UI displays processing states and polls them.

Paid PTO labels do not add PTO hours or pay to the payroll estimate in this MVP.

## Attendance and estimate boundaries

Business time is America/Edmonton and currency is CAD. Fourteen-day pay periods are anchored at 2026-09-25. Workweeks begin Saturday. The estimator applies the greater of daily excess over eight hours or weekly excess over 44 hours at 1.5× without double counting. Full surrounding workweeks are considered before allocation into the chosen pay period.

Estimates use current employee rates and approved completed attendance; they are not immutable payroll records. Open weeks or unapproved attendance make estimates provisional. No scheduled breaks are deducted. Attendance scores remain `UNAVAILABLE`, with null counts/percentage.

Legacy timesheet worked-minute totals clip completed entries to the requested local dates and aggregate seconds before truncating to minutes. Their `overtimeMinutes` is explicitly null until timesheet overtime is implemented. Payroll estimates retain their existing independent overtime calculation.

## HTTP and internal interfaces

Existing account, employee, organization, time-entry, timesheet and estimate APIs remain available through the gateway. New APIs include:

| Method                    | Path                                                       | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| GET                       | `/api/shifts/options`                                      | Permitted people/departments/location labels                     |
| GET / POST                | `/api/shifts`                                              | Scoped 62-day maximum window / create draft                      |
| GET / PUT                 | `/api/shifts/{id}`                                         | Scoped details / edit unassigned draft                           |
| POST                      | `/api/shifts/{id}/publish`, `/cancel`                      | Versioned lifecycle actions                                      |
| POST                      | `/api/shifts/{id}/assign`                                  | `{employeeId, version}`; version refers to the shift             |
| POST                      | `/api/shifts/{id}/respond`                                 | `{status, version}`; version refers to own assignment            |
| POST                      | `/api/shift-assignments/{id}/cancel`                       | `{version}`; assignment version                                  |
| GET / POST                | `/api/shift-categories`                                    | List / create                                                    |
| PUT                       | `/api/shift-categories/{id}`                               | Edit category                                                    |
| POST                      | `/api/shift-categories/{id}/activate`, `/deactivate`       | Category lifecycle                                               |
| GET                       | `/api/availability/me`                                     | Own weekly preferences                                           |
| POST / PUT / DELETE       | `/api/availability`, `/api/availability/{id}`              | Create / edit / remove own preference                            |
| GET                       | `/api/pto/people`                                          | Permitted employee selector                                      |
| GET / POST / PUT / DELETE | `/api/pto/types`, `/api/pto/types/{id}`                    | List / admin type management; referenced types cannot be deleted |
| GET                       | `/api/pto/balances/me`, `/api/pto/balances/employees/{id}` | Own or authorized balances                                       |
| POST                      | `/api/pto/balances/adjust`                                 | Admin allocation/correction with reason and requestKey           |
| GET                       | `/api/pto/ledger/{employeeId}`                             | Scoped balance ledger                                            |
| POST / GET                | `/api/pto/requests`                                        | Request / scoped list with optional employeeId/status            |
| GET                       | `/api/pto/requests/me`, `/api/pto/requests/{id}`           | Own list / scoped details                                        |
| GET                       | `/api/pto/requests/{id}/conflicts`, `/history`             | Shift conflicts / action history                                 |
| POST                      | `/api/pto/requests/{id}/decision`                          | `{version, decision: APPROVED or REJECTED, comment}`             |
| POST                      | `/api/pto/requests/{id}/cancel`                            | `{version, reason}`                                              |

Responses expose versions where used by commands. Date-only values remain strings. Instants use ISO timestamps. Invalid input, unauthorized access, stale/conflicting data and unavailable dependencies return 400, 401/403, 409 and 503 respectively. Forms retain input on errors.

`ems-contracts` includes organization directory lookups and scheduling leave reservations. Organization directory calls accept scheduling certificates; workforce references accept attendance/payroll/scheduling/leave certificates; scheduling reservation calls accept only leave certificates. Internal ports are not published. Service identities come from DNS SANs in certificates verified against the configured CA.

## Local startup and verification

Requirements: Docker Compose, Java 17+, compatible Node (CI uses Node 24), Python 3 and OpenSSL.

```sh
./scripts/setup-local.sh
docker compose up -d postgres
./scripts/provision-databases.sh
docker compose up --build -d --wait auth-service employee-service organization-service attendance-service payroll-service scheduling-service leave-service gateway-service
```

Setup preserves existing secrets and certificate pairs. It adds missing scheduling/leave identities using the existing CA. Database provisioning creates missing databases and roles, never resets volumes or overwrites passwords. Flyway owns schemas; Hibernate validates them. Unexpected unversioned nonempty schemas require explicit inspection, not automatic baselining.

Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` in your shell and run `./scripts/bootstrap-admin.sh` for the first admin. There are no normal-stack default credentials.

From `frontend/`, run `npm ci` and `npm run dev`. Vite proxies `/api` to gateway port 8080. `EMS_GATEWAY_URL` overrides the target. Application ports are loopback-bound: auth 8081, employee 8082, scheduling 8083, attendance 8084, payroll 8085, leave 8086 and organization 8087.

```sh
./ems-auth-service/mvnw -f pom.xml -Pintegration verify
# From frontend/: npm run build && npm run lint && npm test
./scripts/test-stack.sh
```

The browser script builds all integrated images and runs a separate `ems-integration-test` Compose project with its own volume, service ports 18080–18087 and Vite port 15173. Only this test stack uses `admin@integration.test` / `IntegrationTest123!`. Browser tests create their own records. Stop it with `docker compose -f compose.test.yml down`; never reset the normal platform volume for testing.

CI runs backend PostgreSQL tests, frontend checks, browser workflows and backup restoration. Test artifacts are retained on failure.

## Operations and rollout

Before applying migrations to an existing deployment, back up all service databases:

```sh
./scripts/backup-databases.sh /absolute/private/backup-directory
./scripts/verify-backup.sh /absolute/private/backup-directory
```

Backups use restrictive permissions and refuse to overwrite existing archives. Restoration verification uses a disposable PostgreSQL container with no published ports and no existing platform volume. For isolated test data, supply `compose.test.yml` as the backup script's second argument. Cross-service backups are taken sequentially; quiesce workforce writes for a coordinated recovery point. Do not restore individual service backups independently into a live system with in-flight PTO operations.

Use `docker compose ps -a` and readiness endpoints to monitor all eight applications. Monitor failed readiness, repeated restarts, leave requests remaining in processing, and recovery warnings. Certificate expiration requires explicit renewal. Keep the local CA signing key private and out of containers.

A hosted pilot still requires environment-specific HTTPS termination, frontend hosting, secrets and alert routing; no production environment has been selected or deployed. Keep secure refresh cookies enabled outside loopback development, expose only the gateway to browsers, and restrict database/internal service access. Test backup restoration before rollout. Deploy organization/employee reference providers and scheduling before leave consumers, then the gateway/frontend. Preserve additive migrations on rollback and use compatible application images; do not delete data or applied migration history.
