import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import PaymentsIcon from "@mui/icons-material/Payments";
import { NavLink, useLocation } from "react-router-dom";

export const SIDEBAR_WIDTH = 240;

type NavItem = {
  label: string;
  path: string;
  icon: SvgIconComponent;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
  { label: "Attendance", path: "/attendance", icon: FactCheckIcon },
  { label: "Schedule", path: "/schedule", icon: CalendarMonthIcon },
  { label: "PTO", path: "/pto", icon: BeachAccessIcon },
  { label: "Payroll", path: "/payroll", icon: PaymentsIcon },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          EMS
        </Typography>
      </Toolbar>
      <Divider />
      <Box component="nav" aria-label="Main navigation">
        <List>
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <ListItemButton
              key={path}
              component={NavLink}
              to={path}
              selected={pathname.startsWith(path)}
            >
              <ListItemIcon>
                <Icon />
              </ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
