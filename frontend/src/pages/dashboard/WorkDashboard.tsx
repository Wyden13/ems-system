import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import PendingActionsOutlined from "@mui/icons-material/PendingActionsOutlined";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/context";
import { api, params } from "../../api/client";
import { addDays, businessDate, midnight, currentPeriod, type PayrollReport } from "../../api/attendance";
import { type Balance, type LeaveRequest, type Shift } from "../../api/workflows";
import QueryState from "../../components/management/QueryState";
import useAttendanceClock from "../../hooks/useAttendanceClock";
import { AttendanceClockPanel } from "../../components/management/AttendanceClockPanel";
import CurrentEmployees from "../../components/management/CurrentEmployees";
import { LeaveRequestCard, ShiftCard } from "./DashboardDetailCards";

export default function WorkDashboard() {
  const { account } = useAuth();
  const admin = account?.role === "ADMIN";
  const manager = admin || account?.role === "MANAGER";
  const reviewer = account?.role !== "EMPLOYEE";
  const day = businessDate();
  const period = currentPeriod();
  const clock = useAttendanceClock();
  const shifts = useQuery({ queryKey: ["work-dashboard", "shifts", day],
    queryFn: ({ signal }) => api<Shift[]>(`/api/shifts?${params({ from: midnight(day), to: midnight(addDays(day, 14)) })}`, { signal }) });
  const requests = useQuery({ queryKey: ["work-dashboard", "pto"],
    queryFn: ({ signal }) => api<LeaveRequest[]>("/api/pto/requests", { signal }) });
  const balance = useQuery({ queryKey: ["work-dashboard", "balance"], enabled: !!clock.state.data,
    queryFn: ({ signal }) => api<Balance[]>("/api/pto/balances/me", { signal }) });
  const payroll = useQuery({ queryKey: ["work-dashboard", "payroll"], enabled: !!clock.state.data,
    queryFn: ({ signal }) => api<PayrollReport>(`/api/payroll/estimates?employeeId=${clock.state.data?.employeeId}`, { signal }) });
  const review = useQuery({ queryKey: ["work-dashboard", "attendance", period], enabled: manager,
    queryFn: ({ signal }) => api<{ pendingApproval: number }>(`/api/timesheets/summary?from=${period}&to=${addDays(period, 13)}`, { signal }) });
  const upcoming = shifts.data?.filter(s => s.status !== "CANCELLED").sort((a, b) => a.startsAt.localeCompare(b.startsAt)) ?? [];
  const gaps = upcoming.filter(s => s.assignments.filter(a => ["ASSIGNED", "ACCEPTED"].includes(a.status)).length < s.requiredEmployees);
  const pending = requests.data?.filter(r => r.status === "PENDING") ?? [];
  const estimate = payroll.data?.estimates[0];
  const panel = { p: { xs: 2, sm: 3 }, height: "100%" };
  const myClock = <Paper sx={panel}><Stack spacing={2}><Typography variant="h3">My attendance</Typography><AttendanceClockPanel clock={clock} /><Button component={Link} to="/attendance" sx={{ alignSelf: "flex-start" }}>View attendance records</Button></Stack></Paper>;
  const workPanel = { ...panel, display: "flex", flexDirection: "column", border: "1px solid", borderColor: "divider", borderRadius: 3, minWidth: 0 };
  const schedule = <Paper component="section" aria-labelledby="dashboard-schedule-title" sx={workPanel}><Stack spacing={2} sx={{ flex: 1 }}>
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Box sx={{ p: 1.25, bgcolor: "#F0EEFD", borderRadius: 2, display: "flex", color: "primary.main" }}><EventAvailableOutlined /></Box>
      <Box><Typography id="dashboard-schedule-title" variant="h3">{reviewer ? "Staffing and schedule" : "My next shifts"}</Typography><Typography variant="caption" color="text.secondary">Next 14 days · Mountain Time</Typography></Box>
    </Stack>
    <QueryState loading={shifts.isPending} error={shifts.error} retry={shifts.refetch} />
    {shifts.data && reviewer && upcoming.length > 0 && <Alert severity={gaps.length ? "warning" : "success"} sx={{ borderRadius: 2, "& .MuiAlert-message": { fontWeight: 600 } }}>{gaps.length ? `${gaps.length} ${gaps.length === 1 ? "shift needs" : "shifts need"} staffing in the next 14 days.` : "No staffing gaps in the next 14 days."}</Alert>}
    {shifts.data && upcoming.length === 0 && <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default", borderRadius: 2 }}><Typography variant="body2" sx={{ fontWeight: 700 }}>No upcoming shifts</Typography><Typography variant="caption" color="text.secondary">{reviewer ? "Open the schedule to create a shift." : "Contact your supervisor if you expected a shift."}</Typography></Paper>}
    <Stack spacing={1.5}>{upcoming.slice(0, 3).map(s => <ShiftCard key={s.id} shift={s} reviewer={reviewer} />)}</Stack>
    {upcoming.length > 3 && <Typography variant="caption" color="text.secondary">Showing 3 of {upcoming.length} upcoming shifts</Typography>}
    <Box sx={{ flex: 1 }} />
    <Button component={Link} to="/schedule" variant="outlined" endIcon={<ArrowForwardRounded />} sx={{ alignSelf: "flex-start" }}>{reviewer ? "Plan shifts" : "View schedule"}</Button>
  </Stack></Paper>;
  const visibleRequests = reviewer ? pending : requests.data ?? [];
  const timeOff = <Paper component="section" aria-labelledby="dashboard-time-off-title" sx={workPanel}><Stack spacing={2} sx={{ flex: 1 }}>
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Box sx={{ p: 1.25, bgcolor: "#F0EEFD", borderRadius: 2, display: "flex", color: "primary.main" }}><PendingActionsOutlined /></Box>
      <Box><Typography id="dashboard-time-off-title" variant="h3">{reviewer ? "Time-off review" : "My time off"}</Typography><Typography variant="caption" color="text.secondary">{reviewer ? "Requests in your view" : "Requests and available balances"}</Typography></Box>
    </Stack>
    <QueryState loading={requests.isPending} error={requests.error ?? balance.error} retry={() => { void requests.refetch(); if (clock.state.data) void balance.refetch(); }} />
    {requests.data && <Paper variant="outlined" sx={{ p: 2, bgcolor: pending.length ? "warning.light" : "success.light", borderColor: "transparent", borderRadius: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Typography sx={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: pending.length ? "warning.main" : "success.main" }}>{pending.length}</Typography>
        <Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{pending.length === 1 ? "Request" : "Requests"} awaiting approval</Typography><Typography variant="caption" color="text.secondary">{pending.length ? reviewer ? "Ready for review" : "Pending a decision" : "You're all caught up"}</Typography></Box>
      </Stack>
    </Paper>}
    <Stack spacing={1.5}>{visibleRequests.slice(0, 3).map(r => <LeaveRequestCard key={r.id} request={r} />)}</Stack>
    {visibleRequests.length > 3 && <Typography variant="caption" color="text.secondary">Showing 3 of {visibleRequests.length} requests</Typography>}
    {balance.data?.map(b => <Paper key={b.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Stack direction="row" useFlexGap spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{b.ptoTypeName}</Typography><Box><Typography component="span" sx={{ fontWeight: 700, color: "primary.main" }}>{b.availableHours} hours</Typography><Typography component="span" variant="caption" color="text.secondary"> available</Typography></Box></Stack></Paper>)}
    {balance.data?.length === 0 && <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Typography variant="body2" color="text.secondary">No balance allocated. Ask your administrator for an opening balance.</Typography></Paper>}
    <Box sx={{ flex: 1 }} />
    <Button component={Link} to={reviewer ? "/pto?status=PENDING" : "/pto"} variant="contained" endIcon={<ArrowForwardRounded />} sx={{ alignSelf: "flex-start" }}>{reviewer ? "Review time off" : "Request time off"}</Button>
  </Stack></Paper>;
  return <Stack spacing={3} sx={{ minWidth: 0 }}>
    {!admin && <Typography variant="h2">{account?.role === "EMPLOYEE" ? "My work" : account?.role === "SUPERVISOR" ? "Department overview" : "Organization overview"}</Typography>}
    {admin && <Paper sx={panel}><Stack spacing={2}><Typography variant="h3">Administration</Typography><Typography variant="body2" color="text.secondary">Create a login account, then link it to an employee for personal workforce access.</Typography><Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}><Button component={Link} to="/accounts" variant="outlined">Manage accounts</Button><Button component={Link} to="/employees" variant="outlined">Manage employees</Button><Button component={Link} to="/organization" variant="outlined">Organization setup</Button></Stack></Stack></Paper>}
    {reviewer && <CurrentEmployees />}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>
      {!reviewer && myClock}
      {reviewer ? timeOff : schedule}
      {reviewer ? schedule : timeOff}
      {manager && <Paper sx={panel}><Stack spacing={2}><Typography variant="h3">Attendance review</Typography><QueryState loading={review.isPending} error={review.error} retry={review.refetch} />{review.data && <Typography>{review.data.pendingApproval} {review.data.pendingApproval === 1 ? "entry" : "entries"} awaiting approval across employees you can view in this pay period</Typography>}<Typography variant="body2" color="text.secondary">Select an employee in attendance records to review their entries.</Typography><Button component={Link} to="/attendance?status=PENDING_APPROVAL" sx={{ alignSelf: "flex-start" }}>Review attendance</Button></Stack></Paper>}
      {reviewer && !admin && myClock}
      {clock.state.data && <Paper sx={panel}><Stack spacing={2}><Typography variant="h3">My gross-pay estimate</Typography><QueryState loading={payroll.isPending} error={payroll.error} retry={payroll.refetch} />{estimate ? <><Typography variant="h2" component="p">{new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(estimate.grossPay))}</Typography><Chip sx={{ alignSelf: "flex-start" }} label={estimate.provisional ? "Provisional estimate" : "Estimate"} /><Typography variant="body2">Approved worked time only. Taxes, deductions and paid leave are excluded.</Typography></> : payroll.data && <Typography>No estimate is available for this period.</Typography>}<Button component={Link} to="/payroll" sx={{ alignSelf: "flex-start" }}>View pay details</Button></Stack></Paper>}
    </Box>
  </Stack>;
}
