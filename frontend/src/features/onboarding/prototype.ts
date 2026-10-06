export type OnboardingStatus = "INVITED" | "IN_PROGRESS" | "SUBMITTED" | "CHANGES_REQUESTED" | "COMPLETED" | "CANCELLED";
export interface PersonalDetails {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  termsAccepted: boolean;
}
export interface DemoHire {
  id: string;
  personalEmail: string;
  organizationLogin: string;
  department: string;
  jobTitle: string;
  startDate: string;
  status: OnboardingStatus;
  invitedAt: string;
  expiresAt: string;
  personal: PersonalDetails;
  feedback: string;
}
export const statusLabels: Record<OnboardingStatus, string> = {
  INVITED: "Invited", IN_PROGRESS: "In progress", SUBMITTED: "Awaiting approval",
  CHANGES_REQUESTED: "Changes requested", COMPLETED: "Completed", CANCELLED: "Cancelled",
};
export const sevenDaysFrom = (now: Date) => new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
export const invitationExpired = (hire: DemoHire, now: Date) => now.getTime() >= new Date(hire.expiresAt).getTime();
export const canSubmit = (personal: PersonalDetails) =>
  Boolean(personal.firstName.trim() && personal.lastName.trim() && personal.phone.trim() && personal.address.trim() && personal.termsAccepted);

export function organizationLogin(firstName: string, lastName: string, hires: DemoHire[]) {
  const clean = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const stem = [clean(firstName), clean(lastName)].filter(Boolean).join(".") || "employee";
  let suffix = 1;
  let candidate = `${stem}@example.invalid`;
  while (hires.some(hire => hire.organizationLogin === candidate)) candidate = `${stem}${++suffix}@example.invalid`;
  return candidate;
}

export function demoHires(now: Date): DemoHire[] {
  return [
    { id: "demo-invited", personalEmail: "alex.personal@example.invalid", organizationLogin: "alex.morgan@example.invalid", department: "Operations", jobTitle: "Coordinator", startDate: "2026-10-19", status: "INVITED", invitedAt: now.toISOString(), expiresAt: sevenDaysFrom(now), personal: { firstName: "Alex", lastName: "Morgan", phone: "555-0101", address: "", termsAccepted: false }, feedback: "" },
    { id: "demo-submitted", personalEmail: "jordan.personal@example.invalid", organizationLogin: "jordan.lee@example.invalid", department: "Customer support", jobTitle: "Support specialist", startDate: "2026-10-12", status: "SUBMITTED", invitedAt: now.toISOString(), expiresAt: sevenDaysFrom(now), personal: { firstName: "Jordan", lastName: "Lee", phone: "555-0102", address: "100 Example Street", termsAccepted: true }, feedback: "" },
  ];
}
