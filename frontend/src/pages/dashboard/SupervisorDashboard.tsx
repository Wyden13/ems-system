import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { SvgIconComponent } from "@mui/icons-material";
import PeopleIcon from "@mui/icons-material/PeopleAltRounded";
import FactCheckIcon from "@mui/icons-material/FactCheckRounded";
import BeachAccessIcon from "@mui/icons-material/BeachAccessRounded";
import PaymentsIcon from "@mui/icons-material/PaymentsRounded";
import { EMPLOYEES } from "../../data/employees";

type Stat = {
  label: string;
  value: string;
  caption: string;
  icon: SvgIconComponent;
  color: string;
};

const headcount = EMPLOYEES.length;
const onLeave = EMPLOYEES.filter((e) => e.status === "On Leave").length;
const openRequests = EMPLOYEES.reduce((sum, e) => sum + e.openRequests, 0);

const STATS: Stat[] = [
  {
    label: "Headcount",
    value: String(headcount),
    caption: "Across all departments",
    icon: PeopleIcon,
    color: "#5B4BE1",
  },
  {
    label: "Present Today",
    value: String(headcount - onLeave),
    caption: `${onLeave} on leave`,
    icon: FactCheckIcon,
    color: "#1FB865",
  },
  {
    label: "Open Requests",
    value: String(openRequests),
    caption: "Awaiting your approval",
    icon: BeachAccessIcon,
    color: "#F5A524",
  },
  {
    label: "Next Pay Run",
    value: "Sep 30",
    caption: "Payroll not yet submitted",
    icon: PaymentsIcon,
    color: "#0EA5E9",
  },
];

export default function SupervisorDashboard() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h2">Good afternoon, Ethan</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Here's what's happening with your team today.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        {STATS.map(({ label, value, caption, icon: Icon, color }) => (
          <Paper
            key={label}
            variant="outlined"
            sx={{ p: 2.5, border: 1, borderColor: "divider" }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: alpha(color, 0.12),
                  color,
                }}
              >
                <Icon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h2" sx={{ lineHeight: 1.2 }}>
                  {value}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {caption}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Paper variant="outlined" sx={{ border: 1, borderColor: "divider" }}>
        <Box sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography
            variant="subtitle2"
            sx={{ letterSpacing: 0.6, textTransform: "uppercase" }}
          >
            Team Activity
          </Typography>
        </Box>
        <Box sx={{ px: 3, py: 8, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Recent clock-ins, approvals and schedule changes will appear here.
          </Typography>
        </Box>
      </Paper>
    </Stack>
  );
}
