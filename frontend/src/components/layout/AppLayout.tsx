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
import WebsiteContextMenu from "../context-menu/WebsiteContextMenu";

type AppLayoutProps = {
  children: ReactNode;
};

/**
 * App shell: fixed topbar, breadcrumb + page content, and a sidebar that is a
 * docked rail on desktop and an overlay drawer below the `md` breakpoint.
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const { pathname } = useLocation();
  const current = getNavLabel(pathname);
  useEffect(() => {
    document.title = `${current ?? "Dashboard"} | EMS`;
  }, [current]);

  const mobileOpen = mobilePath === pathname;

  const toggleSidebar = () => {
    if (isMobile) {
      setMobilePath(mobileOpen ? null : pathname);
    } else {
      setCollapsed((open) => !open);
    }
  };

  return (
    <WebsiteContextMenu>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Link
          href="#main-content"
          sx={{
            position: "fixed",
            top: -100,
            left: 16,
            zIndex: 1600,
            bgcolor: "background.paper",
            p: 2,
            "&:focus": { top: 8 },
          }}
        >
          Skip to main content
        </Link>
        <Topbar
          onToggleSidebar={toggleSidebar}
          isMobile={isMobile}
          navigationOpen={isMobile ? mobileOpen : !collapsed}
        />
        <Sidebar
          collapsed={collapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onClose={() => setMobilePath(null)}
        />
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            flexGrow: 1,
            scrollMarginTop: `${TOPBAR_HEIGHT + 16}px`,
            minWidth: 0,
            bgcolor: "background.default",
            pt: `${TOPBAR_HEIGHT}px`,
          }}
        >
          <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
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
    </WebsiteContextMenu>
  );
}
