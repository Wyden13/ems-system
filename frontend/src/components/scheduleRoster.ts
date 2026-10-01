import { midnight } from '../api/attendance';
import type { Shift } from '../api/workflows';

export const activeAssignments = (shift: Shift) => shift.assignments.filter(a => ['ASSIGNED', 'ACCEPTED'].includes(a.status));
export const openPositions = (shift: Shift) => shift.status === 'CANCELLED' ? 0 : Math.max(0, shift.requiredEmployees - activeAssignments(shift).length);

/** Clip elapsed time to the visible Mountain Time range, including DST boundaries. */
export function hoursInRange(shift: Shift, from: string | number, to: string | number) {
  const start = typeof from === 'number' ? from : Date.parse(midnight(from));
  const end = typeof to === 'number' ? to : Date.parse(midnight(to));
  return Math.max(0, Math.min(Date.parse(shift.endsAt), end)
    - Math.max(Date.parse(shift.startsAt), start)) / 3600000;
}
