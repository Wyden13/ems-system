import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import PeopleOutlineRounded from "@mui/icons-material/PeopleOutlineRounded";
import { statusLabel, type LeaveRequest, type Shift } from "../../api/workflows";
import { compactDateRange, compactShiftTime } from "./dashboardDates";

const detailCard = { p: 2, borderRadius: 2.5, minWidth: 0, borderColor: "divider" };
const metadata = { display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" };

export function LeaveRequestCard({ request }: { request: LeaveRequest }) {
  const pending = request.status === "PENDING" || request.status === "APPROVING";
  const amount = request.requestedAmount ?? request.hours;
  const unit = request.requestUnit === "DAYS" && request.requestedAmount != null ? "day" : "hour";
  return <Paper component="article" aria-label={`${request.ptoTypeName} request`} variant="outlined" sx={{ ...detailCard, borderLeft: "3px solid", borderLeftColor: pending ? "warning.main" : "divider" }}>
    <Stack spacing={1.5}>
      <Stack direction="row" useFlexGap spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{request.ptoTypeName}</Typography>
        <Chip size="small" label={statusLabel(request.status)} color={pending ? "warning" : request.status === "APPROVED" ? "success" : "default"} variant="outlined" />
      </Stack>
      <Box sx={{ ...metadata, color: "text.primary" }}>
        <CalendarTodayOutlined sx={{ fontSize: 17, color: "text.secondary", flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{compactDateRange(request.startDate, request.endDate)}</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary"><Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{amount} {unit}{Number(amount) === 1 ? "" : "s"}</Box> requested</Typography>
    </Stack>
  </Paper>;
}

export function ShiftCard({ shift, reviewer }: { shift: Shift; reviewer: boolean }) {
  const assigned = shift.assignments.filter(a => ["ASSIGNED", "ACCEPTED"].includes(a.status)).length;
  const open = Math.max(0, shift.requiredEmployees - assigned);
  const when = compactShiftTime(shift.startsAt, shift.endsAt);
  return <Paper component="article" aria-label={`${shift.categoryName} shift`} variant="outlined" sx={{ ...detailCard, ...(reviewer && open > 0 && { borderColor: "warning.main", bgcolor: "#FFFCF7" }) }}>
    <Stack spacing={1.25}>
      <Stack direction="row" useFlexGap spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{shift.categoryName}</Typography>
        <Chip size="small" label={statusLabel(shift.status)} color={shift.status === "PUBLISHED" ? "success" : "default"} variant="outlined" />
      </Stack>
      <Stack direction="row" useFlexGap spacing={1.5} sx={{ flexWrap: "wrap" }}>
        <Box sx={metadata}><CalendarTodayOutlined sx={{ fontSize: 16, flexShrink: 0 }} /><Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>{when.date}</Typography></Box>
        <Box sx={metadata}><AccessTimeRounded sx={{ fontSize: 16, flexShrink: 0 }} /><Typography variant="caption">{when.time}{when.overnight ? " · Overnight" : ""}</Typography></Box>
      </Stack>
      {reviewer && <Stack direction="row" useFlexGap spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", pt: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
        <Box sx={metadata}><PeopleOutlineRounded sx={{ fontSize: 17 }} /><Typography variant="caption"><Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{assigned}/{shift.requiredEmployees}</Box> staffed</Typography></Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: open ? "warning.main" : "success.main" }}>{open ? `${open} open ${open === 1 ? "spot" : "spots"}` : "Fully staffed"}</Typography>
      </Stack>}
    </Stack>
  </Paper>;
}
