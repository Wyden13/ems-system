export type WorkGroup = "Pending" | "Active" | "Completed" | "Inactive" | "Suspended" | "Disabled" | "Archived" | "Provisional" | "Estimates";
const order: WorkGroup[] = ["Pending", "Active", "Completed", "Inactive", "Suspended", "Disabled", "Archived", "Provisional", "Estimates"];

/** Group by lifecycle without changing order within a group. */
export function workGroup(status: string): WorkGroup {
  if (["PENDING", "APPROVING", "CANCELLING", "PENDING_APPROVAL", "DRAFT", "INVITED", "SUBMITTED", "CHANGES_REQUESTED"].includes(status)) return "Pending";
  if (["OPEN", "ACTIVE", "PUBLISHED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "APPROVED"].includes(status)) return "Active";
  return "Completed";
}

export function groupItems<T>(items: readonly T[], category: (item: T) => WorkGroup) {
  return order.map(label => ({ label, items: items.filter(item => category(item) === label) })).filter(group => group.items.length > 0);
}

