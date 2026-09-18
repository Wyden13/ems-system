import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Breadcrumbs,
  Link,
  Typography,
  useMediaQuery,
} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNextRounded";
import { Link as RouterLink, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar";
import Topbar from "./Topbar";
import { TOPBAR_HEIGHT, getNavLabel } from "./navigation";

type AppLayoutProps = {
  children: ReactNode;
};

/**
 * App shell: fixed topbar, breadcrumb + page content, and a sidebar that is a
 * docked rail on desktop and an overlay drawer below the `md` breakpoint.
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const { pathname } = useLocation();
  const current = getNavLabel(pathname);

  // Navigating on mobile should dismiss the overlay.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((open) => !open);
    } else {
      setCollapsed((open) => !open);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Topbar onToggleSidebar={toggleSidebar} isMobile={isMobile} />
      <Sidebar
        collapsed={collapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          bgcolor: "background.default",
          pt: `${TOPBAR_HEIGHT}px`,
        }}
      >
        <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 2, fontSize: 13 }}
          >
            <Link
              component={RouterLink}
              to="/dashboard"
              underline="hover"
              color="primary"
            >
              Home
            </Link>
            {current && (
              <Typography
                color="text.primary"
                sx={{ fontSize: 13, fontWeight: 600 }}
              >
                {current}
              </Typography>
            )}
          </Breadcrumbs>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
