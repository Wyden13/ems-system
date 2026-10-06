import { businessDate, ZONE } from "../../api/attendance";
import { timezoneLabel, zoneForDate } from "../../api/timezone";

// Date-only leave values must not shift when converted to Mountain Time.
export function compactDateRange(start: string, end: string) {
  const format = (value: string, year: boolean, month = true) =>
    `${new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      day: "numeric",
      ...(month && { month: "short" }),
    }).format(
      new Date(`${value}T12:00:00Z`),
    )}${year ? `, ${value.slice(0, 4)}` : ""}`;
  if (start === end) return format(start, true);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${format(start, !sameYear)} – ${format(end, true, !sameMonth)}`;
}

export function compactShiftTime(start: string, end: string, zone = ZONE) {
  const startDate = new Date(start),
    endDate = new Date(end);
  const time = (date: Date) => {
    const minute = new Intl.DateTimeFormat("en-US", {
      timeZone: zoneForDate(date, zone),
      minute: "numeric",
    }).format(date);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zoneForDate(date, zone),
      hour: "numeric",
      hour12: true,
      ...(minute !== "0" && minute !== "00" && { minute: "2-digit" }),
    }).format(date);
  };
  const startDay = businessDate(startDate, zone),
    endDay = businessDate(endDate, zone);
  const startZone = timezoneLabel(startDate, zone),
    endZone = timezoneLabel(endDate, zone);
  return {
    date: compactDateRange(startDay, endDay),
    time: startZone === endZone
      ? `${time(startDate)} – ${time(endDate)} ${endZone}`
      : `${time(startDate)} ${startZone} – ${time(endDate)} ${endZone}`,
    overnight: startDay !== endDay,
  };
}
