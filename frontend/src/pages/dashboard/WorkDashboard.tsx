import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/context";
import { api,params } from "../../api/client";
import { addDays,businessDate,midnight,dateTime,duration,type AttendanceState,type PayrollReport } from "../../api/attendance";
import { statusLabel,type Balance,type LeaveRequest,type Shift } from "../../api/workflows";
import QueryState from "../../components/management/QueryState";
export default function WorkDashboard(){
 const {account}=useAuth();const admin=account?.role==='ADMIN',manager=admin||account?.role==='MANAGER';const day=businessDate();
 const clock=useQuery({queryKey:['attendance','state'],enabled:!admin,queryFn:({signal})=>api<AttendanceState>('/api/time-entries/state',{signal})});
 const shifts=useQuery({queryKey:['work-dashboard','shifts',day],queryFn:({signal})=>api<Shift[]>(`/api/shifts?${params({from:midnight(day),to:midnight(addDays(day,14))})}`,{signal})});
 const requests=useQuery({queryKey:['work-dashboard','pto'],queryFn:({signal})=>api<LeaveRequest[]>('/api/pto/requests',{signal})});
 const balance=useQuery({queryKey:['work-dashboard','balance'],enabled:!!clock.data,queryFn:({signal})=>api<Balance[]>('/api/pto/balances/me',{signal})});
 const payroll=useQuery({queryKey:['work-dashboard','payroll'],enabled:!!clock.data,queryFn:({signal})=>api<PayrollReport>(`/api/payroll/estimates?employeeId=${clock.data?.employeeId}`,{signal})});
 const review=useQuery({queryKey:['work-dashboard','attendance',day],enabled:manager,queryFn:({signal})=>api<{pendingApproval:number}>(`/api/timesheets/summary?from=${addDays(day,-13)}&to=${day}`,{signal})});
 return <Stack spacing={2}>
  {!admin&&<Typography variant="h2">{account?.role==='EMPLOYEE'?'My work':account?.role==='SUPERVISOR'?'Department overview':'Organization overview'}</Typography>}
  {!admin&&<Paper sx={{p:2}}><Typography variant="h3">My attendance</Typography><QueryState loading={clock.isPending} error={clock.error} retry={clock.refetch}/>{clock.data&&<Typography>{clock.data.active?'Clocked in':'Clocked out'} · Recorded today: {duration(clock.data.todaySeconds)}</Typography>}{clock.error&&<Alert severity="info">If your employee profile is not linked, ask an administrator to select your login under Employees → Linked login account.</Alert>}<Button component={Link} to="/attendance">Open attendance</Button></Paper>}
  <Paper sx={{p:2}}><Typography variant="h3">Upcoming schedule</Typography><QueryState loading={shifts.isPending} error={shifts.error} retry={shifts.refetch}/>{shifts.data?.length===0&&<Typography>No shifts in the next 14 days.</Typography>}{shifts.data?.filter(s=>s.status!=='CANCELLED').slice(0,5).map(s=><Typography key={s.id}>{s.categoryName} · {dateTime(s.startsAt)} · {s.status}</Typography>)}<Button component={Link} to="/schedule">Open schedule</Button></Paper>
  <Paper sx={{p:2}}><Typography variant="h3">Time off</Typography><QueryState loading={requests.isPending} error={requests.error??balance.error} retry={()=>{void requests.refetch();if(clock.data)void balance.refetch();}}/>{requests.data&&<Typography>{requests.data.filter(r=>r.status==='PENDING').length} pending requests in your permitted view</Typography>}{requests.data?.slice(0,3).map(r=><Typography key={r.id}>{r.ptoTypeName}: {r.startDate} – {r.endDate} · {statusLabel(r.status)}</Typography>)}{balance.data?.map(b=><Typography key={b.id}>My {b.ptoTypeName}: {b.availableHours} hours available</Typography>)}<Button component={Link} to="/pto">Open time off</Button></Paper>
  {manager&&<Paper sx={{p:2}}><Typography variant="h3">Attendance review</Typography><QueryState loading={review.isPending} error={review.error} retry={review.refetch}/>{review.data&&<Typography>{review.data.pendingApproval} pending entries in the last 14 days</Typography>}<Button component={Link} to="/attendance">Review attendance</Button></Paper>}
  {clock.data&&<Paper sx={{p:2}}><Typography variant="h3">My gross-pay estimate</Typography><QueryState loading={payroll.isPending} error={payroll.error} retry={payroll.refetch}/>{payroll.data?.estimates[0]&&<Typography>{new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(payroll.data.estimates[0].grossPay))} · approved worked time only{payroll.data.estimates[0].provisional?' · provisional':''}</Typography>}<Button component={Link} to="/payroll">Open payroll estimates</Button></Paper>}
 </Stack>;
}
