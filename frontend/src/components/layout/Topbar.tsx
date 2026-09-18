import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/MenuRounded";
import MenuOpenIcon from "@mui/icons-material/MenuOpenRounded";
import HubIcon from "@mui/icons-material/HubRounded";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneRounded";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineRounded";
import TimerIcon from "@mui/icons-material/TimerOutlined";
import { TOPBAR_HEIGHT } from "./navigation";

type TopbarProps = {
  onToggleSidebar: () => void;
  isMobile?: boolean;
};

export default function Topbar({
  onToggleSidebar,
  isMobile = false,
}: TopbarProps) {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar sx={{ minHeight: `${TOPBAR_HEIGHT}px !important`, gap: 1 }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onToggleSidebar}
          aria-label={isMobile ? "Open navigation" : "Collapse navigation"}
        >
          {isMobile ? <MenuIcon /> : <MenuOpenIcon />}
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1 }}>
          <HubIcon />
          <Typography variant="h6" noWrap>
            EMS
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Chip
          icon={<TimerIcon sx={{ color: "inherit !important" }} />}
          label="05 : 25 : 26"
          sx={{
            mr: 1,
            display: { xs: "none", sm: "flex" },
            color: "common.white",
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.16),
            fontVariantNumeric: "tabular-nums",
          }}
        />

        <Tooltip title="Notifications">
          <IconButton color="inherit" aria-label="Notifications">
            <Badge color="error" variant="dot">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Help">
          <IconButton
            color="inherit"
            aria-label="Help"
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>

        <Avatar
          sx={{
            width: 34,
            height: 34,
            ml: 1,
            fontSize: 14,
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.24),
          }}
        >
          EA
        </Avatar>
      </Toolbar>
    </AppBar>
  );
}
