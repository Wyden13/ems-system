# Prairie Market local organization demo

Open **http://127.0.0.1:16173**. This separate frontend talks to the real local gateway at port 28080. Your normal frontend and AWS deployment are unchanged. Use the `127.0.0.1` URL so cookies do not overlap with the normal `localhost` app.

## Organization and real accounts

100 linked employees and login accounts across Edmonton, Calgary and Red Deer. Each location has Sales floor and Stockroom departments.

| Role       | Count | Example login                                                                | Access                                                                                     |
| ---------- | ----- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Admin      | 3     | admin1@prairie.demo.test; admin2@prairie.demo.test; admin3@prairie.demo.test | Account/employee/organization administration; all schedules, attendance and wage estimates |
| Manager    | 6     | manager1@prairie.demo.test through manager6@prairie.demo.test                | All schedules and attendance, reviews, team wage estimates                                 |
| Supervisor | 12    | supervisor1@prairie.demo.test through supervisor12@prairie.demo.test         | Planning/PTO within their linked department; only own wage estimates                       |
| Employee   | 79    | employee1@prairie.demo.test through employee79@prairie.demo.test             | Own published shifts, clock-in/out, PTO and wage estimates                                 |

Passwords are generated locally and saved in **`.demo.local/accounts.csv`**, together with each account's role, employee number and department. All accounts are real records in the isolated auth database, with hashed passwords and linked employee records. These credentials must only be used for this fictional local demo. The private directory is ignored by Git.

## Four weeks of preloaded operations

Seed range: **September 19–October 16, 2026**, covering two past weeks, the current week and next week. Workweeks run Saturday–Friday in America/Edmonton.

- 420 shifts: opening 07:00–15:00, closing 14:00–22:00, stockroom overnight 22:00–06:00.
- 1,938 assignments with published, draft, open coverage, declined and cancelled scenarios.
- 1,158 seeded attendance records; 90 late arrivals, five missed clock-outs, and 97 pending attendance reviews.
- Six PTO requests: approved, pending and rejected; 80-hour opening vacation balances and matching usage/reservation records.
- Weekly availability preferences, varied hourly rates and attendance review histories.
- Verification workflows additionally create real clock-in/out entries and manager approvals. Seed counts describe the original fixtures; interactive operations add real records afterward.

The seeder computes its four-week date range on the first run. Once seeded, reruns preserve that history and all manual changes rather than advancing dates, resetting accounts, or overwriting schedules.

## Wage estimates

The schedule shows **scheduled assignment hours × current hourly rate**, per authorized employee and for the visible filtered roster. Cancelled shifts and inactive assignments are excluded; overnight time is clipped to the visible date range.

Attendance shows **approved worked hours × current hourly rate** for the selected authorized employee. Approval/correction refreshes the estimate. These are base wage estimates in CAD, excluding overtime, tax, deductions and unpaid breaks.

The existing Payroll page retains its existing regular/overtime calculation. Its total may therefore differ from a base estimate if interactive changes introduce overtime. No payroll payment is executed.

Wage rates are supplied through the new authenticated `/api/shifts/wage-estimates` endpoint. Managers/admins receive team estimates. Employees and supervisors receive only their own estimates; ordinary scheduling selectors still omit rates. `VITE_SCHEDULE_WAGES=true` enables these new displays for the dedicated demo frontend. The normal AWS frontend does not request an undeployed endpoint.

## Try the end-to-end workflow

1. Sign in as a supervisor and inspect their department's schedules. Create a future shift or drag an employee into an open position, review the availability check, and confirm the assignment.
2. Sign in as the assigned employee to view/accept their published shift. `employee1@prairie.demo.test` starts without an open clock entry and is convenient for testing clock-in/out.
3. On Attendance, clock in, wait at least a second, and clock out. The entry becomes pending approval.
4. Sign in as a manager, select that employee in Attendance, and approve the entry. View its audit history and updated approved base wage estimate.
5. On Schedule, compare assigned hours and estimated scheduled wages. Filters also update the staffing summary and wage total.
6. Request PTO as an employee; review as a supervisor in the same department or as a manager. Pending requests with assigned shifts demonstrate the conflict checks before approval.
7. Inspect the missed clock-out cases listed in `.demo.local/manifest.json`; a manager can correct them with an audit reason.
8. Sign in as another admin to test account management and last-admin protection. There are three admins, so ordinary role management does not depend on a single administrator account.

## Commands and isolation

```sh
npm run demo:start
npm run dev:demo
```

`demo:start` preserves generated secrets, starts only the `ems-retail-demo` Docker Compose project, initializes its dedicated PostgreSQL volume, bootstraps the first admin if needed and runs the idempotent seed. Missing demo images are built from the local backend source. Existing local mTLS certificates are required; generate them with `../ems-services/scripts/setup-local.sh` if they do not exist.

To rebuild after backend source changes:

```sh
bash scripts/demo/build.sh
npm run demo:start
```

To verify all privileged logins, wage privacy, schedule scopes, fixture consistency and an actual attendance lifecycle:

```sh
python3 scripts/demo/verify.py
```

The verification records one additional audited attendance entry each time it runs and creates one reusable future shift through the public create → assign → publish APIs. Results are stored in `.demo.local/verification.json` without passwords or tokens.

Stop the dedicated backend while keeping its data:

```sh
docker compose --env-file .demo.local/environment.env -f scripts/demo/compose.yml down
```

Stop the demo frontend with Ctrl+C in its terminal. Do not remove the demo volume to refresh data; the default scripts never reset it. The PostgreSQL port is not published. Service HTTP ports are loopback-bound at 28080–28083, and demo images use separate `retail-demo` tags.

Historical scheduling and attendance use a transactional fixture import because public workflows intentionally reject retroactive shift creation and artificial past clock events. Accounts, employee links, locations, departments, categories and PTO types are created through real public APIs. All fixture imports are guarded by the dedicated Compose project identity and an empty scheduling dataset.
