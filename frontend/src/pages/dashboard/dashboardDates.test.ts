import { describe, expect, it } from "vitest";
import { compactDateRange, compactShiftTime } from "./dashboardDates";

describe("dashboard date labels", () => {
  it("keeps single-day, same-month and cross-year leave ranges unambiguous", () => {
    expect(compactDateRange("2026-10-16", "2026-10-16")).toBe("Oct 16, 2026");
    expect(compactDateRange("2026-10-16", "2026-10-20")).toBe("Oct 16 – 20, 2026");
    expect(compactDateRange("2026-10-16", "2026-12-10")).toBe("Oct 16 – Dec 10, 2026");
    expect(compactDateRange("2026-12-31", "2027-01-02")).toBe("Dec 31, 2026 – Jan 2, 2027");
  });
  it("formats in Mountain Time with exact minutes and both overnight dates", () => {
    expect(compactShiftTime("2026-10-01T13:00:00Z", "2026-10-01T21:30:00Z")).toEqual({
      date: "Oct 1, 2026", time: "7 AM – 3:30 PM MT", overnight: false,
    });
    expect(compactShiftTime("2026-12-31T22:15:00-07:00", "2027-01-01T06:00:00-07:00")).toEqual({
      date: "Dec 31, 2026 – Jan 1, 2027", time: "10:15 PM – 6 AM MT", overnight: true,
    });
  });
});
