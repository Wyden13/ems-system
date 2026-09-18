export type EmployeeStatus = "Active" | "On Leave" | "Inactive";

export type Employee = {
  id: number;
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  openRequests: number;
  hireDate: string;
  status: EmployeeStatus;
};

/** Placeholder rows until the Spring Boot employee endpoint is wired up. */
export const EMPLOYEES: Employee[] = [
  {
    id: 1,
    name: "Ethan Antonio",
    department: "Admin",
    position: "Supervisor",
    phone: "+1 404-233-7961",
    email: "admin@centrovo.com",
    openRequests: 1,
    hireDate: "2019-06-06",
    status: "Active",
  },
  {
    id: 2,
    name: "Louis B. Kimble",
    department: "Hardware",
    position: "Technician",
    phone: "+1 404-233-7962",
    email: "louis@centrovo.com",
    openRequests: 0,
    hireDate: "2019-01-01",
    status: "Active",
  },
  {
    id: 3,
    name: "Calvin C. Landry",
    department: "Software",
    position: "Engineer",
    phone: "+1 404-233-7963",
    email: "calvin@centrovo.com",
    openRequests: 0,
    hireDate: "2019-01-15",
    status: "Active",
  },
  {
    id: 4,
    name: "Mabel L. Lee",
    department: "Marketing",
    position: "Specialist",
    phone: "+1 404-233-7964",
    email: "mabel@centrovo.com",
    openRequests: 3,
    hireDate: "2019-04-03",
    status: "On Leave",
  },
  {
    id: 5,
    name: "Priya Raman",
    department: "Software",
    position: "Engineer",
    phone: "+1 404-233-7965",
    email: "priya@centrovo.com",
    openRequests: 0,
    hireDate: "2020-08-17",
    status: "Active",
  },
  {
    id: 6,
    name: "Marcus Webb",
    department: "Operations",
    position: "Coordinator",
    phone: "+1 404-233-7966",
    email: "marcus@centrovo.com",
    openRequests: 2,
    hireDate: "2021-02-22",
    status: "Inactive",
  },
];

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "#5B4BE1",
  "#1FB865",
  "#F5A524",
  "#E5484D",
  "#0EA5E9",
  "#8B5CF6",
];

/** Stable per-employee avatar colour so rows don't reshuffle between renders. */
export function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}
