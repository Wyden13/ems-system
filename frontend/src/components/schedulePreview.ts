import { addDays, midnight, ZONE } from "../api/attendance";
import {
  statusLabel,
  type ScheduleOptions,
  type Shift,
} from "../api/workflows";
import {
  activeAssignments,
  hoursInRange,
  openPositions,
} from "./scheduleRoster";

export type ScheduleCell = string | number;
export function scheduleTable(
  shifts: Shift[],
  options: ScheduleOptions,
  from: string,
  span: number,
  showCoverage = true,
): ScheduleCell[][] {
  const days = Array.from({ length: span }, (_, i) => addDays(from, i));
  const end = addDays(from, span);
  const live = shifts
    .filter((s) => s.status !== "CANCELLED" && hoursInRange(s, from, end) > 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id - b.id);
  const people = [...options.people];
  for (const shift of live)
    for (const assignment of activeAssignments(shift)) {
      if (!people.some((p) => p.id === assignment.employeeId))
        people.push({
          id: assignment.employeeId,
          name: `Employee ${assignment.employeeId}`,
          employeeNumber: "",
          departmentId: shift.departmentId ?? 0,
          active: false,
          self: false,
        });
    }
  const department = (id: number | null) =>
    options.departments.find((d) => d.id === id);
  const time = (instant: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(instant));
  const onDay = (s: Shift, day: string) =>
    hoursInRange(s, day, addDays(day, 1)) > 0;
  const description = (s: Shift, day: string) => {
    const start =
      Date.parse(s.startsAt) < Date.parse(midnight(day))
        ? "00:00"
        : time(s.startsAt);
    const finish =
      Date.parse(s.endsAt) >= Date.parse(midnight(addDays(day, 1)))
        ? "24:00"
        : time(s.endsAt);
    const place = department(s.departmentId);
    const location =
      place?.locationId === s.locationId
        ? place.locationName
        : (options.departments.find((d) => d.locationId === s.locationId)
            ?.locationName ?? `Location #${s.locationId}`);
    return `${s.categoryName} · ${start}–${finish} · ${location} · ${statusLabel(s.status)}`;
  };
  const header = [
    "Employee",
    "Employee number",
    "Department",
    ...days.map(
      (day) =>
        `${new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))} ${day} (MT)`,
    ),
    "Scheduled hours",
  ];
  const rows: ScheduleCell[][] = people
    .filter(
      (p) =>
        p.active ||
        live.some((s) =>
          activeAssignments(s).some((a) => a.employeeId === p.id),
        ),
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
    .map((p) => {
      const assigned = live.filter((s) =>
        activeAssignments(s).some((a) => a.employeeId === p.id),
      );
      return [
        p.name,
        p.employeeNumber,
        department(p.departmentId)?.name ?? "—",
        ...days.map(
          (day) =>
            assigned
              .filter((s) => onDay(s, day))
              .map((s) => description(s, day))
              .join("\n") || "—",
        ),
        Number(
          assigned
            .reduce((sum, s) => sum + hoursInRange(s, from, end), 0)
            .toFixed(2),
        ),
      ];
    });
  const gaps = live.filter((s) => openPositions(s) > 0);
  if (showCoverage)
    rows.push([
      "Open coverage",
      "",
      "",
      ...days.map(
        (day) =>
          gaps
            .filter((s) => onDay(s, day))
            .map((s) => `${description(s, day)} · ${openPositions(s)} open`)
            .join("\n") || "—",
      ),
      Number(
        gaps
          .reduce(
            (sum, s) => sum + hoursInRange(s, from, end) * openPositions(s),
            0,
          )
          .toFixed(2),
      ),
    ]);
  return [header, ...rows];
}
