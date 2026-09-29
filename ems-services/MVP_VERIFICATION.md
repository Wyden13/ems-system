# Workforce MVP verification — 2026-09-28

The scheduling/PTO MVP is implemented and the tested service images have been applied to the local `ems-platform` stack. Existing databases/volumes were preserved. Scheduling and leave now migrate and start successfully; payroll has been restored to the running stack.

## Checks completed

- Backend integrated suite plus targeted regressions: 181 passing tests across auth (28), organization (79), employee (19), gateway (3), attendance (12), payroll (15), scheduling (12), and leave (13). This total combines the full verification run and subsequent affected-module regression runs.
- PostgreSQL tests cover migration from V1 with existing data, department scope, self-approval denial, duplicate requests, concurrent assignment/leave reservations, ledger consistency, recovery after dependency failure, and clipped timesheet dates.
- Frontend TypeScript/production build and ESLint pass. Twelve unit/component tests pass, including navigating to attendance with clock state cached by the dashboard.
- All seven Playwright workflows pass against the separate `ems-integration-test` stack: management, API security, profile/password, suspension, organization references, attendance/pay estimates, and scheduling/PTO.
- The scheduling/PTO browser workflow exercises real JWT/gateway/mTLS calls, published assignment acceptance, PTO shift-conflict blocking, supervisor approval, cancellation, balance reversal and cross-department/direct-service denial.
- Private backups of all seven normal-stack databases were made before rollout and restored successfully into a disposable PostgreSQL container. No normal-stack volume was reset. Backup location: `.local/backups/pre-mvp-20260928/` (ignored by Git).
- Docker reports auth, employee, organization, attendance, payroll, scheduling, leave and gateway healthy after rollout.

## Reproduction

See `DOCUMENTATION.md` for setup and API contracts. Run backend checks with `./ems-auth-service/mvnw -f pom.xml -Pintegration verify`, frontend checks with `npm run build`, `npm run lint`, and `npm test`, and integrated browser checks with `./scripts/test-stack.sh`.

CI is configured in `../.github/workflows/ems.yml`; its steps have been exercised locally, but a hosted GitHub Actions run has not been triggered. The test stack has its own data volume; normal platform data is never used by browser tests.

## Deliberately deferred

The MVP uses admin-funded PTO balances and approved worked-time gross-pay estimates. Notifications/email, automatic accrual/carryover, paid-leave pay, scheduled unpaid-break deductions, attendance scoring, finalized payroll, deductions/payment processing, imports and reporting/exports remain subsequent work. Production hosting, HTTPS termination and alert routing need a selected deployment environment; this rollout is local only.
