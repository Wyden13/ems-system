import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
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

import DashboardPanel from "../../components/ui/DashboardPanel";
import { StatusGroups } from "../../components/ui/StatusGroups";
import { workGroup } from "../../components/ui/statusGrouping";

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
  const myClock = <DashboardPanel title="My attendance" mobileOrder={reviewer ? 3 : 0} action={<Button component={Link} to="/attendance">View attendance records</Button>}><AttendanceClockPanel clock={clock} /></DashboardPanel>;
  const schedule = <DashboardPanel mobileOrder={1} title={reviewer ? "Staffing and schedule" : "My next shifts"} description="Next 14 days · Mountain Time" action={<Button component={Link} to="/schedule" variant="outlined">{reviewer ? "Plan shifts" : "View schedule"}</Button>}>
    <QueryState loading={shifts.isPending} error={shifts.error} retry={shifts.refetch} />
    {shifts.data && reviewer && upcoming.length > 0 && <Alert severity={gaps.length ? "warning" : "success"}>{gaps.length ? `${gaps.length} ${gaps.length === 1 ? "shift needs" : "shifts need"} staffing in the next 14 days.` : "No staffing gaps in the next 14 days."}</Alert>}
    {shifts.data && upcoming.length === 0 && <Box><Typography variant="body2" sx={{ fontWeight: 600 }}>No upcoming shifts</Typography><Typography variant="caption" color="text.secondary">{reviewer ? "Open the schedule to create a shift." : "Contact your supervisor if you expected a shift."}</Typography></Box>}
    {upcoming.length > 0 && <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden", "& article": { border: 0, borderBottom: 1, borderColor: "divider" }, "& article:last-child": { borderBottom: 0 } }}><StatusGroups items={upcoming.slice(0, 3)} category={shift => workGroup(shift.status)}>{shift => <ShiftCard key={shift.id} shift={shift} reviewer={reviewer} />}</StatusGroups></Box>}
    {upcoming.length > 3 && <Typography variant="caption" color="text.secondary">Showing 3 of {upcoming.length} upcoming shifts</Typography>}
  </DashboardPanel>;
  const visibleRequests = reviewer ? pending : requests.data ?? [];
  const timeOff = <DashboardPanel mobileOrder={reviewer ? 0 : 2} title={reviewer ? "Time-off review" : "My time off"} description={reviewer ? "Requests in your view" : "Requests and available balances"} action={<Button component={Link} to={reviewer ? "/pto?status=PENDING" : "/pto"} variant="outlined">{reviewer ? "Review time off" : "Request time off"}</Button>}>
    <QueryState loading={requests.isPending} error={requests.error ?? balance.error} retry={() => { void requests.refetch(); if (clock.state.data) void balance.refetch(); }} />
    {requests.data && <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}><Typography sx={{ fontSize: 24, fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{pending.length}</Typography><Box><Typography variant="body2">{pending.length === 1 ? "request" : "requests"} awaiting approval</Typography><Typography variant="caption" color="text.secondary">{pending.length ? reviewer ? "Ready for review" : "Pending a decision" : "You're all caught up"}</Typography></Box></Stack>}
    {visibleRequests.length > 0 && <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden", "& article": { border: 0, borderBottom: 1, borderColor: "divider" }, "& article:last-child": { borderBottom: 0 } }}><StatusGroups items={visibleRequests.slice(0, 3)} category={request => workGroup(request.status)}>{request => <LeaveRequestCard key={request.id} request={request} />}</StatusGroups></Box>}
    {visibleRequests.length > 3 && <Typography variant="caption" color="text.secondary">Showing 3 of {visibleRequests.length} requests</Typography>}
    {balance.data?.map(b => <Stack key={b.id} direction="row" useFlexGap spacing={1} sx={{ py: 1, borderTop: 1, borderColor: "divider", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{b.ptoTypeName}</Typography><Box><Typography component="span" sx={{ fontWeight: 600 }}>{b.availableHours} hours</Typography><Typography component="span" variant="caption" color="text.secondary"> available</Typography></Box></Stack>)}
    {balance.data?.length === 0 && <Typography variant="body2" color="text.secondary">No balance allocated. Ask your administrator for an opening balance.</Typography>}
  </DashboardPanel>;
  const attendanceReview = <DashboardPanel title="Attendance review" mobileOrder={2} action={<Button component={Link} to="/attendance?status=PENDING_APPROVAL">Review attendance</Button>}><QueryState loading={review.isPending} error={review.error} retry={review.refetch} />{review.data && <Typography>{review.data.pendingApproval} {review.data.pendingApproval === 1 ? "entry" : "entries"} awaiting approval across employees you can view in this pay period</Typography>}<Typography variant="body2" color="text.secondary">Select an employee in attendance records to review their entries.</Typography></DashboardPanel>;
  const payEstimate = <DashboardPanel title="My gross-pay estimate" mobileOrder={4} action={<Button component={Link} to="/payroll">View pay details</Button>}><QueryState loading={payroll.isPending} error={payroll.error} retry={payroll.refetch} />{estimate ? <><Typography variant="h2" component="p">{new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(estimate.grossPay))}</Typography><Chip sx={{ alignSelf: "flex-start" }} label={estimate.provisional ? "Provisional estimate" : "Estimate"} /><Typography variant="body2">Approved worked time only. Taxes, deductions and paid leave are excluded.</Typography></> : payroll.data && <Typography>No estimate is available for this period.</Typography>}</DashboardPanel>;
  return <Stack spacing={2} sx={{ minWidth: 0 }}>
    {!admin && <Typography variant="h2">{account?.role === "EMPLOYEE" ? "My work" : account?.role === "SUPERVISOR" ? "Department overview" : "Organization overview"}</Typography>}
    {admin && <DashboardPanel title="Administration" action={<Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}><Button component={Link} to="/accounts" variant="outlined">Manage accounts</Button><Button component={Link} to="/employees" variant="outlined">Manage employees</Button><Button component={Link} to="/organization" variant="outlined">Organization setup</Button></Stack>}><Typography variant="body2" color="text.secondary">Create a login account, then link it to an employee for personal workforce access.</Typography></DashboardPanel>}
    {reviewer && <CurrentEmployees />}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2, alignItems: "start" }}>
      <Box sx={{ display: { xs: "contents", lg: "flex" }, flexDirection: "column", gap: 2, minWidth: 0 }}>
        {reviewer ? timeOff : myClock}
        {manager && attendanceReview}
        {!reviewer && timeOff}
        {reviewer && clock.state.data && payEstimate}
      </Box>
      <Box sx={{ display: { xs: "contents", lg: "flex" }, flexDirection: "column", gap: 2, minWidth: 0 }}>
        {schedule}
        {reviewer && !admin && myClock}
        {!reviewer && clock.state.data && payEstimate}
      </Box>
    </Box>
  </Stack>;
}
