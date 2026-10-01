import { addDays, localTimeCandidates, zonedInput } from "../../api/attendance";
import type { Shift } from "../../api/workflows";

export function shiftTemplate(shift: Shift): Record<string, string> {
  return {
    categoryId: String(shift.shiftCategoryId),
    departmentId: String(shift.departmentId ?? ""),
    startsAt: zonedInput(shift.startsAt),
    endsAt: zonedInput(shift.endsAt),
    requiredEmployees: String(shift.requiredEmployees),
  };
}

export function shiftTemplateOnDay(
  values: Record<string, string>,
  day: string,
): Record<string, string> {
  const days = Math.round(
    (Date.parse(values.endsAt.slice(0, 10)) -
      Date.parse(values.startsAt.slice(0, 10))) /
      86400000,
  );
  const resolve = (wall: string) => {
    const candidates = localTimeCandidates(wall);
    return candidates.length === 1 ? candidates[0] : wall;
  };
  // Resolve the destination's offset. Repeated or missing times need a choice in the form.
  return {
    ...values,
    startsAt: resolve(`${day}T${values.startsAt.slice(11, 19)}`),
    endsAt: resolve(`${addDays(day, days)}T${values.endsAt.slice(11, 19)}`),
  };
}
