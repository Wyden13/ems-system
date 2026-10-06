import { describe, expect, it } from "vitest";
import {
  availabilityError,
  minuteTime,
  snapMinute,
  weekStart,
} from "./scheduleInteraction";

describe("recurring availability and schedule weeks", () => {
  it("aligns dates to Saturday through Friday across month/year boundaries", () => {
    expect(weekStart("2026-09-26")).toBe("2026-09-26");
    expect(weekStart("2026-09-30")).toBe("2026-09-26");
    expect(weekStart("2026-10-02")).toBe("2026-09-26");
    expect(weekStart("2027-01-01")).toBe("2026-12-26");
  });
  it("rejects overlapping blocks of any type but allows adjacent blocks and edits", () => {
    const a = {
      id: 4,
      dayOfWeek: "SATURDAY",
      startTime: "09:00",
      endTime: "12:00",
      type: "AVAILABLE",
    };
    expect(
      availabilityError(
        { ...a, startTime: "11:00", endTime: "14:00", type: "UNAVAILABLE" },
        [a],
      ),
    ).toMatch(/overlaps/);
    expect(
      availabilityError({ ...a, startTime: "12:00", endTime: "14:00" }, [a]),
    ).toBeUndefined();
    expect(
      availabilityError({ ...a, endTime: "14:00" }, [a], 4),
    ).toBeUndefined();
    expect(availabilityError({ ...a, endTime: "08:00" }, [])).toMatch(/End/);
    expect(
      availabilityError({ ...a, dayOfWeek: "SUNDAY" }, [a]),
    ).toBeUndefined();
  });
  it("snaps to 15 minutes and respects midnight boundaries", () => {
    expect(snapMinute(548)).toBe(555);
    expect(snapMinute(-20)).toBe(0);
    expect(snapMinute(1440)).toBe(1439);
    expect(minuteTime(1439)).toBe("23:59");
  });
});
