import { describe, expect, it } from "vitest";
import { groupItems, workGroup } from "./statusGrouping";

describe("workflow status groups", () => {
  it("keeps every record once, preserving order within each lifecycle group", () => {
    const records = ["APPROVED", "DRAFT", "CANCELLED", "PENDING", "PUBLISHED", "APPROVING"].map((status, id) => ({ id, status }));
    const groups = groupItems(records, row => workGroup(row.status));
    expect(groups.map(group => [group.label, group.items.map(row => row.id)])).toEqual([["Pending", [1, 3, 5]], ["Active", [0, 4]], ["Completed", [2]]]);
    expect(groups.flatMap(group => group.items).sort((a, b) => a.id - b.id)).toEqual(records);
  });
  it("retains administrative states and hides empty groups", () => {
    expect(groupItems([{ active: false }, { active: true }], row => row.active ? "Active" : "Inactive").map(group => group.label)).toEqual(["Active", "Inactive"]);
    expect(groupItems([], () => "Pending")).toEqual([]);
  });
});
