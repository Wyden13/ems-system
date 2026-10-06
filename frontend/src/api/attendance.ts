export const ZONE = "America/Edmonton";
export interface TimeEntry {
  id: number;
  employeeId: number;
  clockIn: string;
  clockOut?: string | null;
  status: "OPEN" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  workedSeconds: number;
  version: number;
}
export interface AttendanceState {
  serverTime: string;
  active?: TimeEntry | null;
  employeeId: number;
  todaySeconds: number;
}
export interface CurrentAttendance {
  serverTime: string;
  employees: {
    entryId: number;
    employeeId: number;
    name: string;
    employeeNumber: string;
    clockIn: string;
  }[];
}
export interface Person {
  id: number;
  name: string;
  employeeNumber: string;
  active: boolean;
  self: boolean;
}
export interface Score {
  status: string;
  expectedEvents: number | null;
  missedEvents: number | null;
  missPercentage: number | null;
  explanation: string;
}
export interface Estimate {
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
  hourlyRate: number | string;
  approvedSeconds: number;
  regularSeconds: number;
  overtimeSeconds: number;
  regularPay: number | string;
  overtimePay: number | string;
  grossPay: number | string;
  provisional: boolean;
  pendingEntries: number;
}
export interface PayrollReport {
  periodStart: string;
  periodEnd: string;
  calculatedAt: string;
  workweekCoverageEnd: string;
  estimates: Estimate[];
}
export function businessDate(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => p.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function addDays(day: string, count: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + count * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function currentPeriod(now = new Date()) {
  const days = Math.round(
    (Date.parse(`${businessDate(now)}T12:00:00Z`) -
      Date.parse("2026-09-25T12:00:00Z")) /
      86400000,
  );
  return addDays("2026-09-25", Math.floor(days / 14) * 14);
}
export function duration(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  return `${Math.floor(n / 3600)}:${String(Math.floor(n / 60) % 60).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
export function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}
export function zonedInput(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(new Date(value));
  const p = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}:${p("second")}${p("timeZoneName").replace("GMT", "")}`;
}
export function parseTime(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error(
      "Choose a valid Mountain Time date and time. If this time occurs twice, select its occurrence.",
    );
  const iso = new Date(value).toISOString();
  if (zonedInput(iso) !== value)
    throw new Error("Use the valid America/Edmonton UTC offset for this date.");
  return iso;
}
/** Resolve Edmonton wall time by round-tripping candidates through the IANA zone.
 * A gap has no candidates; the autumn repeated hour has two. */
export function localTimeCandidates(value: string) {
  const wall = value.slice(0, 19);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(wall)) return [];
  return ["-06:00", "-07:00"].flatMap((offset) => {
    const candidate = `${wall}${offset}`;
    const time = Date.parse(candidate);
    return Number.isFinite(time) &&
      zonedInput(new Date(time).toISOString()) === candidate
      ? [candidate]
      : [];
  });
}
// Midnight never falls within Edmonton's DST transition gap or repeated hour.
export function midnight(day: string) {
  for (const offset of ["-06:00", "-07:00"]) {
    const input = `${day}T00:00:00${offset}`;
    const iso = new Date(input).toISOString();
    if (zonedInput(iso) === input) return iso;
  }
  throw new Error("Invalid business date");
}
