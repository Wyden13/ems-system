import { expect, it } from "vitest";
import { parseTime } from "../../api/attendance";
import { shiftTemplate, shiftTemplateOnDay } from "./shiftTemplate";
import type { Shift } from "../../api/workflows";

it("copies only editable shift fields, excluding identity, status, version and assignments", () => {
  const shift = {
    id: 4,
    version: 9,
    status: "PUBLISHED",
    shiftCategoryId: 2,
    departmentId: 3,
    startsAt: "2026-09-30T22:00:17-06:00",
    endsAt: "2026-10-01T06:00:17-06:00",
    requiredEmployees: 2,
    assignments: [{ id: 1, employeeId: 7 }],
  } as Shift;
  expect(shiftTemplate(shift)).toEqual({
    categoryId: "2",
    departmentId: "3",
    requiredEmployees: "2",
    startsAt: "2026-09-30T22:00:17-06:00",
    endsAt: "2026-10-01T06:00:17-06:00",
  });
});

it("pastes overnight local times onto another day using the destination daylight-saving offset", () => {
  const values = {
    categoryId: "2",
    startsAt: "2026-09-30T22:00:17-06:00",
    endsAt: "2026-10-01T06:00:17-06:00",
  };
  const pasted = shiftTemplateOnDay(values, "2025-11-10");
  expect(pasted).toEqual({
    categoryId: "2",
    startsAt: "2025-11-10T22:00:17-07:00",
    endsAt: "2025-11-11T06:00:17-07:00",
  });
  expect(parseTime(pasted.startsAt)).toBe("2025-11-11T05:00:17.000Z");
  expect(values.startsAt).toBe("2026-09-30T22:00:17-06:00");
});

it("requires an occurrence choice when a pasted start time is repeated by the clock change", () => {
  const pasted = shiftTemplateOnDay(
    {
      startsAt: "2026-09-30T01:30:00-06:00",
      endsAt: "2026-09-30T03:30:00-06:00",
    },
    "2025-11-02",
  );
  expect(pasted.startsAt).toBe("2025-11-02T01:30:00");
  expect(pasted.endsAt).toBe("2025-11-02T03:30:00-07:00");
});
