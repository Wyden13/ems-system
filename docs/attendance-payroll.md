# Attendance and payroll estimates

## Business rules

- Business time is `America/Edmonton`; currency is CAD.
- Fourteen-day periods are anchored on September 25, 2026. The first period is September 25–October 8 inclusive.
- Employees, supervisors, and managers clock their own attendance. A linked active employee is required to clock in. An employee who becomes inactive can still close an existing session.
- Supervisors read attendance within their current department. Managers and Admin read everyone’s attendance and review/correct others’ entries. Nobody reviews or corrects their own time.
- Clock-out creates pending time. Only approved, completed attendance contributes to gross-pay estimates. Corrections require a reason, preserve before/after values and reviewer identity, and reset approval.
- Everyone can read their own pay estimates. Managers and Admin can read all estimates; supervisors cannot read coworkers’ pay.
- Workweeks begin Saturday at midnight. Overtime is the greater of summed daily excess above eight hours or weekly excess above 44 hours. It is paid at 1.5×, without double counting. Daily overtime is assigned first, with any weekly top-up assigned to the latest remaining regular seconds.
- Calculations use elapsed seconds and the current employee hourly rate. Gross pay is rounded to CAD cents with HALF_UP. Estimates, including past periods, update when rates or approved attendance change. These are not finalized payroll records.
- Full workweeks surrounding a pay period are included in calculation, then hours are allocated to the selected period. A Friday period boundary therefore does not reset Saturday–Friday overtime. Open workweeks and open/pending attendance make estimates provisional.

## Scheduling boundary

Scheduling and PTO workflows are now implemented; see `ems-services/DOCUMENTATION.md`. Schedule-based breaks and attendance scoring remain deferred.

`ScheduleProvider` currently returns unavailable schedule data. Attendance reports `UNAVAILABLE` with null score counts and percentage; it does not report 0% misses. No automatic break deductions are applied. Recorded clocked-out gaps are not worked time.

The future attendance integration will consume shift start/end and total unpaid break duration. Confirmed examples are 30 minutes for a four-hour assigned shift and 60 minutes for an eight-hour assigned shift. Employees punch only at shift start/end; no break punches or fixed break windows are required. Scheduled unpaid breaks must reduce payable time before overtime. Arrival/departure records cannot establish presence during the break or the rest of the shift.

The future score is missed expected shift clock-in/out events / expected events × 100. Timing tolerances, classification of missing events, and schedules must be defined before enabling calculation. They are deliberately not invented by the stub.

## APIs and service boundaries

The gateway exposes authenticated `/api/time-entries`, `/api/time-entries/**`, `/api/timesheets/**`, and `/api/payroll/estimates`. Attendance and Payroll validate JWTs independently, derive the account from the token, and enforce row-level permissions. `X-User-Id` is not trusted.

- `GET /api/time-entries/state`: active entry, server time, own employee ID, and recorded seconds today.
- `GET /api/time-entries/people`: permitted employee selector, without pay rates.
- `POST /api/time-entries/clock-in`: `{ "requestId": "UUID" }`; the same ID returns the original entry. Distinct requests cannot create concurrent open sessions.
- `POST /api/time-entries/clock-out`: `{ "entryId": 123 }`; retries target the original entry, not a subsequent session.
- `GET /api/time-entries?employeeId=123&from=...&to=...&status=...`: overlapping entries in a half-open instant range of at most 62 days.
- `POST /api/time-entries/{id}/approve` or `/reject`: `{ "version": 1, "comment": "..." }`.
- `POST /api/time-entries/{id}/adjust`: `{ "version": 1, "clockIn": "ISO instant", "clockOut": "ISO instant", "reason": "..." }`. Overlapping, future, and stale corrections are rejected.
- `GET /api/time-entries/{id}/history`: review and correction audit history.
- `GET /api/timesheets/score?employeeId=123&from=YYYY-MM-DD&to=YYYY-MM-DD`: scheduling availability and nullable score.
- `GET /api/payroll/estimates?periodStart=YYYY-MM-DD&employeeId=123`: live estimates. The employee filter is optional; non-management callers are always restricted to self.

Employee serves workforce references over mutual-TLS gRPC to Attendance and Payroll. Attendance serves time records only to Payroll. Certificates identify allowed services; each service keeps ownership of its own database. The new clock request uniqueness, one-open-session constraint, employee locking rows, precise seconds, and audit table are installed by Attendance migration V2.

## Local development and verification

Run `ems-services/scripts/setup-local.sh` to add missing service certificates without replacing existing identities. The existing CA signing key is required when adding certificates.

Build affected images:

```sh
docker compose -f ems-services/docker-compose.yml build employee-service attendance-service payroll-service gateway-service
```

Apply locally:

```sh
docker compose -f ems-services/docker-compose.yml up -d --wait employee-service attendance-service payroll-service gateway-service
```

Run `ems-services/scripts/test-stack.sh` for the isolated database/service stack and browser tests. PostgreSQL-backed attendance tests use Testcontainers and require Docker. Unit tests cover daily/weekly overtime, exact thresholds, midnight/DST transitions, cross-period allocation, current rates, and pay visibility. Browser tests cover clock recovery after refresh, review/correction history, payroll updates, role isolation, and unlinked/inactive employee handling.
