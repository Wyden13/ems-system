# Cloud Demo · Prairie Market

The dataset is stored in the existing deployed AWS backend at `https://d2z6z22jatofwt.cloudfront.net`, using the real employee/account/organization APIs.

Open the normal frontend at **http://localhost:5173** and sign in using a cloud demo account from **`.cloud-demo.local/accounts.csv`**. The retail demo at port 16173 is a different, local database.

## Added dataset

- 25 active employees, each linked to a real login account.
- Roles: 2 admins, 2 managers, 4 supervisors, 17 employees.
- Two new locations: Cloud Demo · Prairie Market · Edmonton and Cloud Demo · Prairie Market · Calgary.
- Four new departments: Sales floor and Stockroom at each location, prefixed with Cloud Demo.
- Fictional names, reserved demo telephone numbers, `.test` email addresses, job titles, hire dates and varied hourly rates.
- Each account has its own generated password, stored only in the ignored private account file. Existing account passwords and roles were not overwritten.

All 25 cloud account logins and roles were verified. All 25 employees and all four departments are present in the cloud scheduling directory, ready for assigning shifts and using attendance/PTO workflows.

The original organization seed created the employees and accounts. On October 6, 2026, an additive business simulation was imported into those same AWS-backed demo employees. The local wage-estimate endpoint remains separate; the AWS Payroll page uses its existing regular/overtime estimates.

## Existing records and totals

The cloud originally had zero employees, three accounts, one location and two departments. Those records were preserved. Cloud totals after creation are **25 employees, 28 accounts, three locations and six departments**. The new mock dataset itself has exactly two locations and four departments.

## Reusable seed

```sh
python3 scripts/demo/seed-cloud.py --inspect
python3 scripts/demo/seed-cloud.py
```

The first command authenticates and reads counts only. The second creates missing labeled records and reuses matching records. It never resets databases, overwrites existing accounts, edits roles, or replaces existing employee data. Existing demo records with unexpected roles, statuses, links or departments cause an explicit failure for review.

The script uses the saved cloud administrator credentials in `../ems-services/.local/aws-admin-credentials.txt`. Passwords and bearer tokens are passed through private temporary files or stdin, not printed in command output. Verification sessions are logged out and temporary cookie files are removed.

Private files:

- `.cloud-demo.local/accounts.csv`: account credentials and role/department mapping.
- `.cloud-demo.local/manifest.json`: latest seed/verification result and created record IDs.
- `.cloud-demo.local/creation-report.json`: initial creation report, including before/after counts.


## Business simulation added October 6, 2026

Refresh the actual app at **http://localhost:5173/dashboard**. Saved PNGs in the UI preview gallery are static captures.

The simulation covers **August 8–October 23, 2026**, with eight weeks of history, the current week, and two upcoming weeks. All timestamps follow America/Edmonton. Existing accounts, roles, employees, and the four existing manual shifts were retained.

- **792 additional shifts** and **1,321 assignments** across the four Cloud Demo departments. Opening, closing, overnight inventory, and store leadership categories are labeled **Cloud Demo**.
- **979 attendance entries**: 935 approved, 24 awaiting approval, 17 rejected, and 3 open. Includes 95 late arrivals, 18 overtime examples, a missed clock-out, and two ongoing overnight sessions at seed time.
- **12 time-off requests**: 5 approved, 4 pending, 2 rejected, and 1 cancelled. Requests include signatures, reasons, and audit history. Approved leave excludes active assignments on those dates.
- **50 PTO balances**: one 80-hour vacation allocation and one 24-hour sick-leave allocation per demo employee, with usage, reservations, and allocation/usage ledger entries.
- **167 availability records**, respecting existing availability rather than replacing it.
- **188 upcoming shifts** at seed time: 168 published, 19 draft, and 1 cancelled. Fifty active upcoming shifts have staffing gaps.

### Explore the scenarios

1. Sign in as `cloud-demo.manager1@prairie.demo.test` or a demo administrator. Inspect current employees, pending attendance, and staffing gaps on Dashboard.
2. On Schedule, move between weeks or switch to List. Review draft/published categories, open positions, overnight continuation, and assignment controls.
3. On Attendance, select an employee to inspect approved/rejected history and current-period pending entries. `cloud-demo.employee9@prairie.demo.test` has the missed clock-out case; a manager can correct it with an audit reason.
4. On Payroll, use Previous period to view **September 11–24**, **August 28–September 10**, and **August 14–27**. These are gross-pay estimates computed by the actual backend from approved attendance, including regular/overtime calculations. The current **September 25–October 8** period remains provisional.
5. On Time off, compare vacation/sick balances and pending, approved, rejected, and cancelled requests. Pending requests can demonstrate staffing conflicts during review.
6. Employee accounts see their own records; supervisors see department scheduling/PTO and their own payroll; managers/admins have their existing broader access.

The dataset simulates business activity. It does not execute payroll payments or invent net-pay/tax records. The existing Payroll feature provides estimates, not a settled-payroll ledger.

### Import and verification tools

The import used a one-off utility task in the existing private AWS network, with the People role for identity checks and the Workforce role for the transaction. Application services and permissions were not redeployed. Temporary fixture payloads and task-definition revisions are cleaned up after each run.

```sh
python3 scripts/demo/cloud_operations.py
python3 scripts/demo/cloud_fixture_task.py inspect
python3 scripts/demo/cloud_fixture_task.py apply
python3 scripts/demo/verify_cloud_operations.py
```

The generator uses `.cloud-demo.local/operations-inspection.json`, captured from the live APIs. Review/regenerate that inspection before importing into a different dataset. The fixture name `prairie-cloud-operations-v1` is a database completion marker: rerunning apply preserves the original import and all subsequent manual changes, rather than advancing dates or reseeding records.

Private, Git-ignored artifacts include `operations-plan.json`, `operations.sql`, `operations-import.json`, `operations-local-validation.json`, and `operations-verification.json`. They record the plan, actual counts, preservation/integrity checks, historical estimate totals, and role-isolation results. Account passwords remain only in `accounts.csv`.


Live verification confirmed all 792 imported shifts, 979 attendance entries, 50 balances, and 12 requests through the deployed APIs. The four pre-existing shifts were unchanged, and representative employee/supervisor/manager logins passed scheduling, PTO, and payroll privacy checks. A repeat import returned the existing completion marker and added no duplicates.

| Historical pay period | Simulated gross-pay estimate (CAD) | Provisional employees |
| --- | ---: | ---: |
| August 14–27, 2026 | $46,297.86 | 0 |
| August 28–September 10, 2026 | $44,780.87 | 0 |
| September 11–24, 2026 | $44,101.56 | 0 |
| September 25–October 8, 2026 | $28,410.06 at verification | 25 |

These totals are for the 25 fictional demo employees. Interactive approvals, corrections, and rate changes can change estimates. The original current-period total remains provisional.
