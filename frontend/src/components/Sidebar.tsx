import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { NavLink, useLocation } from "react-router-dom";
import {
  NAV_GROUPS,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  TOPBAR_HEIGHT,
} from "./layout/navigation";

export { SIDEBAR_WIDTH } from "./layout/navigation";

/** Vertical rhythm is fixed so nothing shifts when the rail collapses. */
const HEADER_HEIGHT = 72;
const GROUP_HEADING_HEIGHT = 36;
const ITEM_INSET = 1.5; // 12px — item margin
const ITEM_PADDING = 2; // 16px — item padding, must match in both states

const fade = (theme: Theme) =>
  theme.transitions.create("opacity", {
    duration: theme.transitions.duration.shorter,
  });

const resize = (theme: Theme) =>
  theme.transitions.create("width", {
    duration: theme.transitions.duration.shorter,
  });

type SidebarProps = {
  /** Desktop icon-rail state. Ignored on mobile, where the overlay is full width. */
  collapsed?: boolean;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({
  collapsed = false,
  isMobile = false,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const { pathname } = useLocation();
  // The overlay always shows full labels; only the docked rail collapses.
  const isRail = collapsed && !isMobile;
  const width = isRail ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  const content = (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          // 18px keeps the 40px avatar on the same axis as the nav icons.
          px: "18px",
          height: HEADER_HEIGHT,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            fontSize: 14,
            fontWeight: 700,
            bgcolor: "primary.light",
          }}
        >
          EA
        </Avatar>
        <Box
          sx={{
            minWidth: 0,
            opacity: isRail ? 0 : 1,
            transition: fade,
            whiteSpace: "nowrap",
          }}
        >
          <Typography variant="subtitle2" noWrap>
            Ethan Antonio
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Supervisor
          </Typography>
        </Box>
      </Box>

      <Box component="nav" aria-label="Main navigation" sx={{ py: 1 }}>
        {NAV_GROUPS.map((group) => (
          <Box key={group.heading} sx={{ mb: 1 }}>
            {/* Fixed-height slot: the heading fades out and a rule fades in,
                so items never move vertically between states. */}
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                height: GROUP_HEADING_HEIGHT,
                px: 3,
              }}
            >
              <Typography
                variant="caption"
                noWrap
                sx={{
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  color: "text.secondary",
                  opacity: isRail ? 0 : 1,
                  transition: fade,
                }}
              >
                {group.heading}
              </Typography>
              <Divider
                aria-hidden
                sx={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  opacity: isRail ? 1 : 0,
                  transition: fade,
                }}
              />
            </Box>

            <List disablePadding>
              {group.items.map(({ label, path, icon: Icon }) => {
                const selected = pathname.startsWith(path);
                return (
                  <Tooltip
                    key={path}
                    title={isRail ? label : ""}
                    placement="right"
                  >
                    <ListItemButton
                      component={NavLink}
                      to={path}
                      selected={selected}
                      sx={{
                        mx: ITEM_INSET,
                        my: 0.25,
                        px: ITEM_PADDING,
                        // Roomier touch target on mobile; vertical only, so the
                        // icon axis is untouched.
                        py: { xs: 1.25, md: 1 },
                        borderRadius: 2,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        color: "text.secondary",
                        "&.Mui-selected": {
                          bgcolor: (theme) =>
                            alpha(theme.palette.primary.main, 0.1),
                          color: "primary.main",
                          "&:hover": {
                            bgcolor: (theme) =>
                              alpha(theme.palette.primary.main, 0.16),
                          },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                        <Icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={label}
                        sx={{
                          my: 0,
                          opacity: isRail ? 0 : 1,
                          transition: fade,
                        }}
                        slotProps={{
                          primary: {
                            noWrap: true,
                            sx: {
                              fontSize: 14,
                              fontWeight: selected ? 700 : 500,
                            },
                          },
                        }}
                      />
                    </ListItemButton>
                  </Tooltip>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </>
  );

  return (
    <>
      {/* Mobile: overlay above the app bar, dismissed by backdrop, Esc or
          navigating (AppLayout closes it on pathname change). */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          zIndex: (theme) => theme.zIndex.drawer + 2,
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            borderRight: 1,
            borderColor: "divider",
          },
        }}
      >
        {content}
      </Drawer>

      {/* Desktop: docked rail below the app bar. `display: none` keeps it out
          of the flex layout on mobile, so main gets the full viewport. */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width,
          flexShrink: 0,
          transition: resize,
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            top: TOPBAR_HEIGHT,
            height: `calc(100% - ${TOPBAR_HEIGHT}px)`,
            borderRight: 1,
            borderColor: "divider",
            overflowX: "hidden",
            transition: resize,
          },
        }}
      >
        {content}
      </Drawer>
    </>
  );
}
