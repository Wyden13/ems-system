import { describe, expect, it } from "vitest";
import type { ScheduleOptions, Shift } from "../api/workflows";
import { scheduleTable } from "./schedulePreview";
import { scheduleCsv } from "./scheduleExport";

const options: ScheduleOptions = {
  people: [1, 2].map(id => ({ id, name: `Employee ${id}`, employeeNumber: `00000${id}`, departmentId: 1, active: true, self: false })),
  departments: [{ id: 1, name: "Operations", locationId: 1, locationName: "Edmonton", archived: false }],
};
const shift: Shift = { id: 1, shiftCategoryId: 1, categoryName: "Night", departmentId: 1, locationId: 1, startsAt: "2026-09-28T22:00:00-06:00", endsAt: "2026-09-29T06:00:00-06:00", requiredEmployees: 2, status: "PUBLISHED", version: 0, assignments: [{ id: 1, employeeId: 1, status: "ACCEPTED", version: 0 }, { id: 2, employeeId: 2, status: "DECLINED", version: 0 }] };

describe("schedule preview and exports", () => {
  it("splits overnight shifts across dates and counts active assignments and open coverage", () => {
    const table = scheduleTable([shift, { ...shift, id: 2, status: "CANCELLED" }], options, "2026-09-28", 2);
    expect(table[0]).toEqual(["Employee", "Employee number", "Department", "Mon 2026-09-28 (MT)", "Tue 2026-09-29 (MT)", "Scheduled hours"]);
    expect(table[1]).toEqual(["Employee 1", "000001", "Operations", "Night · 22:00–24:00 · Edmonton · Published", "Night · 00:00–06:00 · Edmonton · Published", 8]);
    expect(table[2]).toEqual(["Employee 2", "000002", "Operations", "—", "—", 0]);
    expect(table[3]).toEqual(["Open coverage", "", "", "Night · 22:00–24:00 · Edmonton · Published · 1 open", "Night · 00:00–06:00 · Edmonton · Published · 1 open", 8]);
  });
  it("uses elapsed Mountain Time hours at DST boundaries and clips the selected range", () => {
    const dst = { ...shift, startsAt: "2025-11-02T00:00:00-06:00", endsAt: "2025-11-02T04:00:00-07:00" };
    expect(scheduleTable([dst], options, "2025-11-02", 1)[1].at(-1)).toBe(5);
    expect(scheduleTable([shift], options, "2026-09-29", 1)[1].at(-1)).toBe(6);
  });
  it("quotes multiline CSV values and exports user text without treating it as formulas", () => {
    const csv = scheduleCsv([["Employee", "Shift"], ['=HYPERLINK("example")', 'Morning, "special"\nNight'], ["normal", 8]]);
    expect(csv).toBe('\uFEFF"Employee","Shift"\r\n"\'=HYPERLINK(""example"")","Morning, ""special""\nNight"\r\n"normal","8"');
  });
});
