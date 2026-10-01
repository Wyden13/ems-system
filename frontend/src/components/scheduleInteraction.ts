import { addDays } from '../api/attendance';
import type { Availability } from '../api/workflows';

export const WEEKDAYS = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
export const weekStart = (day: string) => addDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 1) % 7));
export const timeMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const minuteTime = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export const snapMinute = (minute: number) => Math.max(0, Math.min(1439, Math.round(minute / 15) * 15));

export function availabilityError(value: Omit<Availability, 'id'>, entries: Availability[], id?: number) {
  const start = timeMinutes(value.startTime), end = timeMinutes(value.endTime);
  if (!WEEKDAYS.includes(value.dayOfWeek) || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1439 || end <= start)
    return 'End must be after start on the same day. Split overnight availability across two days.';
  if (entries.some(a => a.id !== id && a.dayOfWeek === value.dayOfWeek && start < timeMinutes(a.endTime) && end > timeMinutes(a.startTime)))
    return 'This overlaps another availability block. Adjust or edit that block first.';
  return undefined;
}
