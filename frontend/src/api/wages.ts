import { api, params } from './client';
import { addDays, midnight } from './attendance';
export interface WageEstimate {
  employeeId: number;
  hourlyRate: number | string;
  scheduledSeconds: number;
  scheduledGrossPay: number | string;
  approvedWorkedSeconds: number;
  approvedWorkedGrossPay: number | string;
}
export interface WageReport {
  currency: 'CAD';
  basis: 'BASE_RATE';
  estimates: WageEstimate[];
}
export const scheduleWagesEnabled = import.meta.env.VITE_SCHEDULE_WAGES === 'true';
export const wageQuery = (from: string, span: number, signal?: AbortSignal) => api<WageReport>(`/api/shifts/wage-estimates?${params({ from: midnight(from), to: midnight(addDays(from, span)) })}`, { signal });
export const cad = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
