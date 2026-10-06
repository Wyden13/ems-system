import { Box, Chip, Stack, Typography } from "@mui/material";
import { dateTime } from "../api/attendance";
import { statusLabel, type ScheduleOptions, type Shift } from "../api/workflows";
import { activeAssignments } from "./scheduleRoster";

/** Shared, labeled shift information for details and confirmation dialogs. */
export default function ShiftSummary({ shift, options }: {
  shift: Shift;
  options?: ScheduleOptions;
}) {
  const department = options?.departments.find(d => d.id === shift.departmentId);
  const location = department?.locationName
    ?? options?.departments.find(d => d.locationId === shift.locationId)?.locationName
    ?? `Location ${shift.locationId}`;
  const assigned = activeAssignments(shift).length;
  const fields = [
    ["Location", location],
    ["Department", department?.name ?? "Department unavailable"],
    ["Start", dateTime(shift.startsAt)],
    ["End", dateTime(shift.endsAt)],
    ["Required job role", shift.requiredJobRole || "Not specified"],
    ["Needed staff", `${assigned} of ${shift.requiredEmployees} assigned · ${Math.max(0, shift.requiredEmployees - assigned)} needed`],
  ];

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">Shift title</Typography>
          <Typography variant="h3" sx={{ overflowWrap: "anywhere" }}>{shift.categoryName}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Shift {shift.id}</Typography>
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Status</Typography>
          <Chip size="small" label={statusLabel(shift.status)} />
        </Box>
      </Stack>
      <Box sx={{ bgcolor: "action.hover", p: 2, borderRadius: 2 }}>
        <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          {fields.map(([label, value]) => (
            <Box key={label} sx={{ minWidth: 0 }}>
              <Typography component="dt" variant="body2" color="text.secondary">{label}</Typography>
              <Typography component="dd" sx={{ m: 0, mt: 0.5, overflowWrap: "anywhere" }}>{value}</Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>All times shown in Mountain Time.</Typography>
      </Box>
    </Stack>
  );
}
