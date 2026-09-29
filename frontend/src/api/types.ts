export type Role = "EMPLOYEE" | "SUPERVISOR" | "MANAGER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export interface Account {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}
export interface Employee {
  id: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  birthDate: string | null;
  hireDate: string;
  departmentId: number;
  role: Role;
  userAccountId: string | null;
  payRate: number | string;
  jobTitle: string | null;
  active: boolean;
}
export interface Location {
  id: number;
  name: string;
}
export interface Department {
  id: number;
  name: string;
  locationId: number;
  locationName: string;
  archived: boolean;
}
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
export const roles: Role[] = ["EMPLOYEE", "SUPERVISOR", "MANAGER", "ADMIN"];
export const statuses: AccountStatus[] = ["ACTIVE", "SUSPENDED", "DISABLED"];
