# Schedule and recurring availability

Both calendars run Saturday through Friday. The schedule keeps dates; availability
shows weekday names only and repeats every week in America/Edmonton time.

Employees can draw availability blocks on the hourly grid, drag cards between
weekdays, and resize their top/bottom handles in 15-minute steps. Arrow keys move
a focused card; Shift + Up/Down changes its end. The Edit form provides exact
times and a touch-friendly alternative. Pointer changes save on release, revert
on failure, and reject overlapping blocks. Overnight availability is split across
two weekdays, as required by the existing API.

Supervisors, managers, and admins select employees directly in the roster by
clicking their name. Clicking a day in an employee's row opens a shift form with
that employee, day, and department prefilled; its Create shift button also works
with the keyboard. After selecting an employee, clicking an existing shift opens
an assignment review. There is no separate employee list panel. On mobile,
employee rows include people without shifts so everyone remains schedulable.
Employee names in the roster also remain draggable, using a compact single-card
preview. Dropping onto an existing shift reviews assignment; dropping onto open
coverage or the selected employee's empty cell prefills a new shift.

Targets show green for availability, amber for a warning, and red for a blocking
conflict, with an explanation. Outside stated available/preferred hours (or no
recorded hours) is advisory. Explicit unavailability, overlapping assignments,
approved/processing PTO holds, inactive employees, department mismatch, full
shifts, existing assignments, and cancelled/past shifts block assignment. Visual
feedback respects reduced-motion preferences.

The active backend is `ems-workforce-service`. Rebuild/restart it through the
usual backend workflow when applying these frontend changes. Its new endpoints:

- `POST /api/shifts/assignment-preview`: accepts `employeeId` and either `shiftId`
  or `departmentId`, `startsAt`, `endsAt`. Returns `{ state, reasons }`, where
  state is `AVAILABLE`, `WARNING`, or `BLOCKED`. This endpoint is read-only and
  enforces planner/department access. It uses the assignment eligibility rules
  and checks the employee's complete commitments, including outside this week.
- `POST /api/shifts/with-assignment`: accepts `{ shift, employeeId }`, using the
  existing shift input shape. Creates and assigns within one transaction; any
  assignment failure rolls back the new shift.

Assignment is checked again on submit. Failed checks prevent saving. A newly
discovered warning that was not displayed requires another explicit submission.
The mutation still validates eligibility and record versions on the server, so
previews cannot override conflicts or concurrent changes.

Focused verification: `scheduleInteraction.test.ts`, `scheduleRoster.test.ts`,
the schedule roster browser tests, the existing overnight form browser test, and
the workforce service's `SchedulingPostgresTest` integration suite.
