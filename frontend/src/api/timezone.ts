export const ZONE = "America/Edmonton";

// Alberta no longer falls back on November 1, 2026 (02:00 MDT).
// https://www.alberta.ca/albertas-new-time-system-abt
// Older browser/Node IANA databases still predict MST after this instant.
const ALBERTA_TIME_START = Date.parse("2026-11-01T08:00:00Z");

export function zoneForDate(date: Date, zone = ZONE) {
  return zone === ZONE && date.getTime() >= ALBERTA_TIME_START
    ? "Etc/GMT+6" // IANA's Etc/GMT signs are inverted: this is UTC-06:00.
    : zone;
}

export function timezoneLabel(date: Date, zone = ZONE) {
  if (zone === ZONE && date.getTime() >= ALBERTA_TIME_START) return "ABT";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "short",
  }).formatToParts(date).find((part) => part.type === "timeZoneName")!.value;
}
