import { describe, expect, it } from "vitest";
import { compactDateRange, compactShiftTime } from "./dashboardDates";

describe("dashboard date labels", () => {
  it("keeps single-day, same-month and cross-year leave ranges unambiguous", () => {
    expect(compactDateRange("2026-10-16", "2026-10-16")).toBe("Oct 16, 2026");
    expect(compactDateRange("2026-10-16", "2026-10-20")).toBe(
      "Oct 16 – 20, 2026",
    );
    expect(compactDateRange("2026-10-16", "2026-12-10")).toBe(
      "Oct 16 – Dec 10, 2026",
    );
    expect(compactDateRange("2026-12-31", "2027-01-02")).toBe(
      "Dec 31, 2026 – Jan 2, 2027",
    );
  });
  it("formats Edmonton time with exact minutes and both overnight dates", () => {
    expect(
      compactShiftTime("2026-10-01T13:00:00Z", "2026-10-01T21:30:00Z"),
    ).toEqual({
      date: "Oct 1, 2026",
      time: "7 AM – 3:30 PM MDT",
      overnight: false,
    });
    expect(
      compactShiftTime(
        "2026-12-31T22:15:00-07:00",
        "2027-01-01T06:00:00-07:00",
      ),
    ).toEqual({
      date: "Dec 31, 2026 – Jan 1, 2027",
      time: "11:15 PM – 7 AM ABT",
      overnight: true,
    });
  });
  it("uses historical standard time and labels both sides of a DST transition", () => {
    expect(compactShiftTime("2026-01-01T05:15:00Z", "2026-01-01T13:00:00Z")).toEqual({
      date: "Dec 31, 2025 – Jan 1, 2026",
      time: "10:15 PM – 6 AM MST",
      overnight: true,
    });
    expect(compactShiftTime("2025-11-02T07:30:00Z", "2025-11-02T08:30:00Z")).toEqual({
      date: "Nov 2, 2025",
      time: "1:30 AM MDT – 1:30 AM MST",
      overnight: false,
    });
  });
  it("uses the selected location for both local dates and timezone labels", () => {
    expect(compactShiftTime("2027-01-01T05:15:00Z", "2027-01-01T13:00:00Z", "America/Denver")).toEqual({
      date: "Dec 31, 2026 – Jan 1, 2027",
      time: "10:15 PM – 6 AM MST",
      overnight: true,
    });
    expect(compactShiftTime("2027-01-01T05:15:00Z", "2027-01-01T13:00:00Z", "America/Toronto")).toEqual({
      date: "Jan 1, 2027",
      time: "12:15 AM – 8 AM EST",
      overnight: false,
    });
  });
});
