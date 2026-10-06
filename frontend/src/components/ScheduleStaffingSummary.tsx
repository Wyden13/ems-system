import {
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import PeopleOutlineRounded from "@mui/icons-material/PeopleOutlineRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import type { Shift } from "../api/workflows";
import { cad } from "../api/wages";
import { activeAssignments, openPositions } from "./scheduleRoster";

export default function ScheduleStaffingSummary({
  shifts,
  scheduledHours,
  scheduledWages,
  wageScope = "team",
  onOpenShift,
}: {
  shifts: Shift[];
  scheduledHours: number;
  scheduledWages?: number;
  wageScope?: "team" | "self";
  onOpenShift: (id: number) => void;
}) {
  const required = shifts.reduce(
    (sum, shift) => sum + shift.requiredEmployees,
    0,
  );
  const staffed = shifts.reduce(
    (sum, shift) =>
      sum + Math.min(shift.requiredEmployees, activeAssignments(shift).length),
    0,
  );
  const open = shifts.filter((shift) => openPositions(shift) > 0);
  const missing = open.reduce((sum, shift) => sum + openPositions(shift), 0);
  const drafts = shifts.filter((shift) => shift.status === "DRAFT");
  const coverage = required ? Math.round((staffed / required) * 100) : 0;
  const attention = shifts.filter(
    (shift) => shift.status === "DRAFT" || openPositions(shift) > 0,
  );
  return (
    <Paper
      component="aside"
      aria-label="Staffing summary"
      variant="outlined"
      sx={{
        p: 2.5,
        minWidth: 0,
        borderRadius: 1,
        position: { lg: "sticky" },
        top: 88,
      }}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <PeopleOutlineRounded color="primary" />
          <Typography variant="h3">Staffing summary</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          For the current date range and filters
        </Typography>
        <Box>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", mb: 1 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Coverage
            </Typography>
            <Typography
              variant="body2"
              color="primary"
              sx={{ fontWeight: 700 }}
            >
              {required ? `${coverage}%` : "—"}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={coverage}
            aria-label="Staffed positions"
            sx={{ height: 7, borderRadius: 2, bgcolor: "primary.light" }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            {staffed} of {required} positions staffed
          </Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {[
            {
              label: "Open positions",
              value: missing,
              color: missing ? "warning.main" : "text.primary",
            },
            {
              label: "Draft shifts",
              value: drafts.length,
              color: "text.primary",
            },
            {
              label: "Scheduled hours",
              value: Number(scheduledHours.toFixed(1)),
              color: "primary.main",
            },
            {
              label: "Active shifts",
              value: shifts.length,
              color: "text.primary",
            },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "action.hover" }}
            >
              <Typography variant="h3" component="p" color={item.color}>
                {item.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
        {scheduledWages !== undefined && <Box sx={{ p: 2, bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 2 }}><Typography variant="caption">{wageScope === "self" ? "My estimated scheduled wages" : "Estimated scheduled wages"} · CAD</Typography><Typography variant="h3" component="p">{cad(scheduledWages)}</Typography><Typography variant="caption">Current filters · Base hourly rates</Typography></Box>}
        <Divider />
        <Typography variant="subtitle2">Needs attention</Typography>
        {attention.length ? (
          <Stack spacing={1}>
            {attention.slice(0, 5).map((shift) => (
              <Button
                key={shift.id}
                onClick={() => onOpenShift(shift.id)}
                aria-label={`Review ${shift.categoryName} shift ${shift.id}`}
                sx={{
                  p: 1.25,
                  textAlign: "left",
                  justifyContent: "flex-start",
                  border: 1,
                  borderColor: "divider",
                  color: "text.primary",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {shift.categoryName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Intl.DateTimeFormat("en-CA", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "America/Edmonton",
                    }).format(new Date(shift.startsAt))}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ mt: 0.5, flexWrap: "wrap" }}
                  >
                    {openPositions(shift) > 0 && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label={`${openPositions(shift)} open`}
                      />
                    )}
                    {shift.status === "DRAFT" && (
                      <Chip size="small" label="Draft" />
                    )}
                  </Stack>
                </Box>
              </Button>
            ))}
            {attention.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                {attention.length - 5} more shifts need attention in the
                calendar.
              </Typography>
            )}
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CheckCircleOutlineRounded color="success" fontSize="small" />
            <Typography variant="body2">
              {shifts.length
                ? "All shifts are published and staffed."
                : "Create a shift to start planning."}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
