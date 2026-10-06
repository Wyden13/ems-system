import { describe, expect, it } from "vitest";
import {
  businessDate,
  currentPeriod,
  midnight,
  parseTime,
  zonedInput,
  duration,
  localTimeCandidates,
} from "./attendance";
describe("business time", () => {
  it("anchors periods using Edmonton dates", () => {
    expect(currentPeriod(new Date("2026-09-25T05:59:59Z"))).toBe("2026-09-11");
    expect(currentPeriod(new Date("2026-09-25T06:00:00Z"))).toBe("2026-09-25");
    expect(currentPeriod(new Date("2026-10-09T06:00:00Z"))).toBe("2026-10-09");
  });
  it("uses actual DST midnight offsets", () => {
    // Alberta stopped falling back in 2026; use its last autumn transition.
    expect(midnight("2026-03-08")).toBe("2026-03-08T07:00:00.000Z");
    expect(midnight("2026-03-09")).toBe("2026-03-09T06:00:00.000Z");
    expect(midnight("2025-11-02")).toBe("2025-11-02T06:00:00.000Z");
    expect(midnight("2025-11-03")).toBe("2025-11-03T07:00:00.000Z");
  });
  it("distinguishes repeated times and rejects nonexistent ones", () => {
    expect(parseTime("2025-11-02T01:30:00-06:00")).toBe(
      "2025-11-02T07:30:00.000Z",
    );
    expect(parseTime("2025-11-02T01:30:00-07:00")).toBe(
      "2025-11-02T08:30:00.000Z",
    );
    expect(() => parseTime("2026-03-08T02:30:00-07:00")).toThrow();
    expect(() => parseTime("2026-09-26T08:00:00")).toThrow();
  });
  it("resolves wall time without the device timezone and exposes DST choices", () => {
    expect(localTimeCandidates("2026-09-26T08:00:17")).toEqual(["2026-09-26T08:00:17-06:00"]);
    expect(localTimeCandidates("2025-11-02T01:30:00")).toEqual(["2025-11-02T01:30:00-06:00", "2025-11-02T01:30:00-07:00"]);
    expect(localTimeCandidates("2026-03-08T02:30:00")).toEqual([]);
    expect(localTimeCandidates("2026-02-30T09:00:00")).toEqual([]);
    expect(localTimeCandidates("")).toEqual([]);
  });
  it("keeps seconds and supports multi-day durations", () => {
    expect(duration(90061)).toBe("25:01:01");
    expect(businessDate(new Date("2026-09-26T03:00:00Z"))).toBe("2026-09-25");
    expect(zonedInput("2026-09-26T14:00:17Z")).toBe(
      "2026-09-26T08:00:17-06:00",
    );
  });
  it("keeps Alberta at UTC-06 after the November 2026 change on older runtimes", () => {
    expect(midnight("2026-11-02")).toBe("2026-11-02T06:00:00.000Z");
    expect(midnight("2027-01-01")).toBe("2027-01-01T06:00:00.000Z");
    expect(businessDate(new Date("2027-01-01T06:30:00Z"))).toBe("2027-01-01");
    expect(zonedInput("2027-01-01T05:15:00Z")).toBe("2026-12-31T23:15:00-06:00");
    expect(parseTime("2027-01-01T06:00:00-06:00")).toBe("2027-01-01T12:00:00.000Z");
    expect(() => parseTime("2027-01-01T06:00:00-07:00")).toThrow();
    expect(localTimeCandidates("2026-11-01T01:30:00")).toEqual(["2026-11-01T01:30:00-06:00"]);
  });
});
