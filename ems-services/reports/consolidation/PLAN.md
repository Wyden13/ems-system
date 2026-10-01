# People and Workforce consolidation

## Target and compatibility

Deploy gateway, auth, People (employee and organization), and Workforce (scheduling, leave, attendance, and current payroll estimates). Keep the public routes, DTOs, authentication, role permissions, and employee ownership checks compatible with the frontend. Preserve domain modules inside the consolidated applications. All existing data is disposable mock data; rebuild and reseed rather than transfer legacy data. Auth retains its own database; People and Workforce each use a single database and transaction manager.

## Implementation sequence

1. Inventory current source, migrations, runtime configuration, tests, and existing data. Establish the regression baseline. Restore cloud-offloaded source before modifying it.
2. Build People with employee and organization modules; replace department validation RPCs with local calls. Combine migrations without version collisions. Preserve API semantics, account-link behavior, archived-department rules, and employee-number generation. Existing user accounts are disposable mock data per user instruction.
3. Build Workforce with scheduling, leave, attendance, and estimate modules. Replace internal RPCs with local domain interfaces. Make PTO approval/cancellation and scheduling holds atomic in the shared database; preserve conflict checking, concurrency protection, balances, and audit history. No legacy transitions require transfer because all data is disposable.
4. Integrate attendance with scheduling and implement bulk attendance reads for payroll estimates. Preserve timezone, rounding, adjustment, authorization, and estimate behavior.
5. Provide clean database initialization and repeatable mock seeding for People and Workforce. Verify schemas, constraints, sequence progression, and account links on fresh databases. All old mock data may be reset per explicit user authorization.
6. Update Maven, containers, Compose, certificates, gateway routing, setup/backup/health scripts, and documentation for the four applications.
7. Run relevant Java tests and database integration tests. Start an isolated consolidated stack and run frontend end-to-end workflows: directory management and account linking, shift assignments/conflicts, leave requests/approvals/cancellations, attendance/adjustments, payroll estimates, and role/ownership enforcement. Verify fresh database initialization and seeded relationships.
8. Rebenchmark the merged applications. Report measured results, exact checks, and any remaining limitations.

## Completion evidence

- Exactly four application runtimes in the supported deployment configuration.
- Employee/organization use one database; all four workforce modules use one database.
- No network calls between modules within People or within Workforce.
- Public API and security regression checks pass.
- Fresh databases initialize and reseed reliably with valid account links, sequence progression, balances, ledger/audit history, and referential relationships.
- Scheduling/PTO updates commit or roll back together, including conflict and concurrent-operation tests.
- Payroll uses bulk local attendance retrieval; schedule reconciliation uses the real schedule.
- Backend and browser end-to-end tests pass on the consolidated stack.
- Resource results and operational migration instructions are recorded.

## Data reset authorization

The user explicitly confirmed **all data is disposable; rebuild and reseed**. No legacy record transfer or preservation is required. Use fresh databases and repeatable seeds, and document the reset process.

## Progress

- Recovered prior architecture assessment and benchmark report.
- Confirmed the root reactor currently lists eight deployable services.
- Identified cloud-offloaded files blocking reads; requested local restoration with brctl.
- Confirmed employee department validation is currently gRPC and PTO uses a distributed reserve/retry workflow.

- Created People and Workforce modules, preserving domain package boundaries.
- New modules and migrated tests compile successfully.
- Implemented local department validation and a People database foreign key.
- Implemented shared Workforce locking and atomic leave approval/cancellation.
- Implemented bulk local attendance queries for payroll and real schedule lookup/scoring.
- Updated Compose to four applications and three databases; updated gateway/certificates and scripts.
- Regression suites are running; merged test context configuration corrected after initial failures.

- Backend and all seven browser workflows pass; four application containers are healthy.
- Fresh reset and idempotent demo reseeding verified. Three database backups restored successfully.
- Runtime benchmark running with the prior nine-route workload and 700 attendance fixtures.

- Runtime benchmark complete: 1,200/1,200 HTTP 200 at 20 requests/s and 3,000/3,000 at 50 requests/s. Comparison recorded in BENCHMARK.md.

- Normal local deployment rebuilt and seeded; frontend running at localhost:5173.
