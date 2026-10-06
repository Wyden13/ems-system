import { describe, expect, it } from "vitest";
import type { Shift } from "../api/workflows";
import {
  activeAssignments,
  hoursInRange,
  openPositions,
} from "./scheduleRoster";

const shift: Shift = {
  id: 1,
  shiftCategoryId: 1,
  categoryName: "Night",
  departmentId: 1,
  locationId: 1,
  startsAt: "2026-09-30T22:00:00-06:00",
  endsAt: "2026-10-01T06:00:00-06:00",
  requiredEmployees: 3,
  status: "PUBLISHED",
  version: 0,
  assignments: [
    { id: 1, employeeId: 1, status: "ASSIGNED", version: 0 },
    { id: 2, employeeId: 2, status: "ACCEPTED", version: 0 },
    { id: 3, employeeId: 3, status: "DECLINED", version: 0 },
    { id: 4, employeeId: 4, status: "CANCELLED", version: 0 },
  ],
};

describe("roster staffing and scheduled hours", () => {
  it("counts partial coverage using only current assignments", () => {
    expect(activeAssignments(shift).map((a) => a.employeeId)).toEqual([1, 2]);
    expect(openPositions(shift)).toBe(1);
    expect(openPositions({ ...shift, requiredEmployees: 1 })).toBe(0);
    expect(openPositions({ ...shift, status: "CANCELLED" })).toBe(0);
  });

  it("clips overnight shifts to each visible day without double counting", () => {
    expect(hoursInRange(shift, "2026-09-30", "2026-10-01")).toBe(2);
    expect(hoursInRange(shift, "2026-10-01", "2026-10-02")).toBe(6);
    expect(hoursInRange(shift, "2026-09-30", "2026-10-07")).toBe(8);
    expect(hoursInRange(shift, "2026-10-02", "2026-10-09")).toBe(0);
  });

  it("uses elapsed hours when Mountain Time changes at the DST boundary", () => {
    expect(
      hoursInRange(
        {
          ...shift,
          startsAt: "2025-11-02T00:00:00-06:00",
          endsAt: "2025-11-02T04:00:00-07:00",
        },
        "2025-11-02",
        "2025-11-03",
      ),
    ).toBe(5);
    expect(
      hoursInRange(
        {
          ...shift,
          startsAt: "2026-03-08T00:00:00-07:00",
          endsAt: "2026-03-08T04:00:00-06:00",
        },
        "2026-03-08",
        "2026-03-09",
      ),
    ).toBe(3);
  });
});
