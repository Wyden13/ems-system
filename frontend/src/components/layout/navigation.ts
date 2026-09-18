import type { SvgIconComponent } from "@mui/icons-material";
import DashboardIcon from "@mui/icons-material/GridViewRounded";
import PeopleIcon from "@mui/icons-material/PeopleAltRounded";
import FactCheckIcon from "@mui/icons-material/FactCheckRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthRounded";
import BeachAccessIcon from "@mui/icons-material/BeachAccessRounded";
import PaymentsIcon from "@mui/icons-material/PaymentsRounded";

export const SIDEBAR_WIDTH = 264;
/**
 * Sized so a collapsed rail centres its icons on the exact x-axis the expanded
 * rail puts them on (item margin 12 + padding 16 + half a 20px icon = 38).
 * Changing this without changing Sidebar's item padding makes icons drift.
 */
export const SIDEBAR_WIDTH_COLLAPSED = 76;
export const TOPBAR_HEIGHT = 64;

export type NavItem = {
  label: string;
  path: string;
  icon: SvgIconComponent;
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
};

/** Mirrors the routes declared in App.tsx. */
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [{ label: "Dashboard", path: "/dashboard", icon: DashboardIcon }],
  },
  {
    heading: "Workforce",
    items: [
      { label: "Employees", path: "/employees", icon: PeopleIcon },
      { label: "Attendance", path: "/attendance", icon: FactCheckIcon },
      { label: "Schedule", path: "/schedule", icon: CalendarMonthIcon },
      { label: "PTO", path: "/pto", icon: BeachAccessIcon },
    ],
  },
  {
    heading: "Finance",
    items: [{ label: "Payroll", path: "/payroll", icon: PaymentsIcon }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Label for the current route, used by the breadcrumb in AppLayout. */
export function getNavLabel(pathname: string): string | undefined {
  return NAV_ITEMS.find((item) => pathname.startsWith(item.path))?.label;
}
