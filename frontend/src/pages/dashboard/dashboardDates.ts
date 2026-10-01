import { businessDate, ZONE } from "../../api/attendance";

// Date-only leave values must not shift when converted to Mountain Time.
export function compactDateRange(start: string, end: string) {
  const format = (value: string, year: boolean, month = true) =>
    `${new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC", day: "numeric", ...(month && { month: "short" }),
    }).format(new Date(`${value}T12:00:00Z`))}${year ? `, ${value.slice(0, 4)}` : ""}`;
  if (start === end) return format(start, true);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${format(start, !sameYear)} – ${format(end, true, !sameMonth)}`;
}

export function compactShiftTime(start: string, end: string) {
  const startDate = new Date(start), endDate = new Date(end);
  const time = (date: Date) => {
    const minute = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, minute: "numeric" }).format(date);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: ZONE, hour: "numeric", hour12: true,
      ...(minute !== "0" && minute !== "00" && { minute: "2-digit" }),
    }).format(date);
  };
  const startDay = businessDate(startDate), endDay = businessDate(endDate);
  return {
    date: compactDateRange(startDay, endDay),
    time: `${time(startDate)} – ${time(endDate)} MT`,
    overnight: startDay !== endDay,
  };
}
