import type { SvgIconComponent } from "@mui/icons-material";
import DashboardIcon from "@mui/icons-material/GridViewRounded";
import PeopleIcon from "@mui/icons-material/PeopleAltRounded";
import BusinessIcon from "@mui/icons-material/BusinessRounded";
import AccountIcon from "@mui/icons-material/ManageAccountsRounded";
import ProfileIcon from "@mui/icons-material/PersonRounded";
import OnboardingIcon from "@mui/icons-material/PersonAddAltRounded";
import type { Role } from "../../api/types";
export const SIDEBAR_WIDTH = 264;
export const SIDEBAR_WIDTH_COLLAPSED = 76;
export const TOPBAR_HEIGHT = 64;
export type NavItem = { label: string; path: string; icon: SvgIconComponent };
export type NavGroup = {
  heading: string;
  admin?: boolean;
  roles?: Role[];
  items: NavItem[];
};
import AttendanceIcon from "@mui/icons-material/AccessTimeRounded";
import PayrollIcon from "@mui/icons-material/PaymentsRounded";
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Hiring",
    roles: ["MANAGER", "ADMIN"],
    items: [
      {
        label: "Onboarding preview",
        path: "/onboarding",
        icon: OnboardingIcon,
      },
    ],
  },
  {
    heading: "Management",
    admin: true,
    items: [
      { label: "Employees", path: "/employees", icon: PeopleIcon },
      { label: "Organization", path: "/organization", icon: BusinessIcon },
      { label: "Accounts", path: "/accounts", icon: AccountIcon },
    ],
  },
  {
    heading: "Work",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
      { label: "Schedule", path: "/schedule", icon: AttendanceIcon },
      { label: "Time off", path: "/pto", icon: PeopleIcon },
      { label: "Attendance", path: "/attendance", icon: AttendanceIcon },
      { label: "Payroll", path: "/payroll", icon: PayrollIcon },
    ],
  },
  {
    heading: "Account",
    items: [{ label: "My Profile", path: "/profile", icon: ProfileIcon }],
  },
];
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
export function getNavLabel(pathname: string) {
  return NAV_ITEMS.find((item) => pathname.startsWith(item.path))?.label;
}
