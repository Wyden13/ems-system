import { describe, expect, it } from "vitest";
import {
  businessDate,
  currentPeriod,
  midnight,
  parseTime,
  zonedInput,
  duration,
} from "./attendance";
describe("business time", () => {
  it("anchors periods using Edmonton dates", () => {
    expect(currentPeriod(new Date("2026-09-25T05:59:59Z"))).toBe("2026-09-11");
    expect(currentPeriod(new Date("2026-09-25T06:00:00Z"))).toBe("2026-09-25");
    expect(currentPeriod(new Date("2026-10-09T06:00:00Z"))).toBe("2026-10-09");
  });
  it("uses actual DST midnight offsets", () => {
    expect(midnight("2026-03-08")).toBe("2026-03-08T07:00:00.000Z");
    expect(midnight("2026-03-09")).toBe("2026-03-09T06:00:00.000Z");
    expect(midnight("2026-11-02")).toBe("2026-11-02T07:00:00.000Z");
  });
  it("distinguishes repeated times and rejects nonexistent ones", () => {
    expect(parseTime("2026-11-01T01:30:00-06:00")).toBe(
      "2026-11-01T07:30:00.000Z",
    );
    expect(parseTime("2026-11-01T01:30:00-07:00")).toBe(
      "2026-11-01T08:30:00.000Z",
    );
    expect(() => parseTime("2026-03-08T02:30:00-07:00")).toThrow();
    expect(() => parseTime("2026-09-26T08:00:00")).toThrow();
  });
  it("keeps seconds and supports multi-day durations", () => {
    expect(duration(90061)).toBe("25:01:01");
    expect(businessDate(new Date("2026-09-26T03:00:00Z"))).toBe("2026-09-25");
    expect(zonedInput("2026-09-26T14:00:17Z")).toBe(
      "2026-09-26T08:00:17-06:00",
    );
  });
});
