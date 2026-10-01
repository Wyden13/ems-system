import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  useMediaQuery,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import { useAuth } from "../auth/context";
import QueryState from "../components/management/QueryState";
import { api, params } from "../api/client";
import { currentPeriod, dateTime, duration } from "../api/attendance";
import type { PayrollReport } from "../api/attendance";
import PeriodPicker from "../components/management/PeriodPicker";
const money = (value: number | string) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
    Number(value),
  );
export default function PayrollPage() {
  const { account } = useAuth();
  const mobile = useMediaQuery(theme => theme.breakpoints.down("sm"));
  const personal = account?.role === "EMPLOYEE" || account?.role === "SUPERVISOR";
  const [period, setPeriod] = useState(() => currentPeriod());
  const query = useQuery({
    queryKey: ["payroll", account?.id, period],
    queryFn: () =>
      api<PayrollReport>(
        `/api/payroll/estimates?${params({ periodStart: period })}`,
      ),
    refetchInterval: 30000,
  });
  return (
    <Stack spacing={3}>
      <Typography variant="h2">Payroll estimates</Typography>
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <PeriodPicker start={period} onChange={setPeriod} />
          <Button
            sx={{ alignSelf: "flex-start" }}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh estimates
          </Button>
          <QueryState loading={query.isPending} error={query.error} retry={query.refetch} />
          {query.data && (
            <>
              {query.data.estimates.length > 0 && <Paper variant="outlined" sx={{ p: 3, bgcolor: "primary.main", color: "primary.contrastText" }}>
                <Typography variant="body2">{personal ? "My estimated gross pay" : "Total estimated gross pay in your view"}</Typography>
                <Typography variant="h2" component="p" sx={{ mt: 1, mb: 2 }}>{money(query.data.estimates.reduce((sum, e) => sum + Number(e.grossPay), 0))}</Typography>
                <Typography variant="body2">CAD · Approved worked time only. Taxes, deductions and paid leave are excluded.</Typography>
              </Paper>}
              <Typography variant="body2">
                Calculated {dateTime(query.data.calculatedAt)} MT. Includes
                workweek context through {query.data.workweekCoverageEnd}.
              </Typography>
              {query.data.estimates.some((e) => e.provisional) && (
                <Alert severity="warning">
                  Provisional: relevant workweeks are still open or attendance
                  awaits approval. Later approvals may change overtime allocated
                  to this period.
                </Alert>
              )}
              {mobile ? <Stack spacing={2}>
                {query.data.estimates.length === 0 && <Typography>No estimate is available for this period. Check another period or ask your administrator about your employee profile.</Typography>}
                {query.data.estimates.map(e => <Paper key={e.employeeId} variant="outlined" sx={{ p: 2 }}><Stack spacing={1}>
                  <Typography variant="h3">{e.employeeName}</Typography><Typography variant="caption">Employee {e.employeeNumber}</Typography>
                  <Typography variant="h2" component="p">{money(e.grossPay)}</Typography><Chip sx={{ alignSelf: "flex-start" }} label={e.provisional ? "Provisional" : "Estimate"} />
                  <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, "& dd": { m: 0, textAlign: "right" } }}>
                    <Typography component="dt" variant="body2">Hourly rate</Typography><Typography component="dd" variant="body2">{money(e.hourlyRate)}</Typography>
                    <Typography component="dt" variant="body2">Approved time</Typography><Typography component="dd" variant="body2">{duration(e.approvedSeconds)}</Typography>
                    <Typography component="dt" variant="body2">Regular time</Typography><Typography component="dd" variant="body2">{duration(e.regularSeconds)}</Typography>
                    <Typography component="dt" variant="body2">Overtime</Typography><Typography component="dd" variant="body2">{duration(e.overtimeSeconds)}</Typography>
                  </Box>
                  {e.pendingEntries > 0 && <Typography variant="body2">{e.pendingEntries} open or pending entries in related workweeks.</Typography>}
                </Stack></Paper>)}
              </Stack> : <TableContainer tabIndex={0} role="region" aria-label="Pay estimates — scroll horizontally for more columns">
                <Table aria-label="Payroll estimates">
                  <TableHead>
                    <TableRow>
                      {[
                        "Employee",
                        "Hourly rate",
                        "Approved time",
                        "Regular time",
                        "Overtime",
                        "Estimated gross pay",
                        "Status",
                      ].map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {query.data.estimates.map((e) => (
                      <TableRow key={e.employeeId}>
                        <TableCell>
                          {e.employeeName}
                          <Typography
                            variant="caption"
                            sx={{ display: "block" }}
                          >
                            {e.employeeNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>{money(e.hourlyRate)}</TableCell>
                        <TableCell>{duration(e.approvedSeconds)}</TableCell>
                        <TableCell>{duration(e.regularSeconds)}</TableCell>
                        <TableCell>{duration(e.overtimeSeconds)}</TableCell>
                        <TableCell>{money(e.grossPay)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={e.provisional ? "Provisional" : "Estimate"}
                          />
                          {e.pendingEntries > 0 && (
                            <Typography
                              variant="caption"
                              sx={{ display: "block" }}
                            >
                              {e.pendingEntries} open / pending in related
                              workweeks
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {query.data.estimates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          No estimates available for this period. Check another period or ask your administrator about employee setup.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>}
            </>
          )}
          <Accordion disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="subtitle2">How this estimate is calculated</Typography></AccordionSummary>
            <AccordionDetails><Stack spacing={2}>
              <Typography variant="body2">Estimates use approved worked time and current hourly rates. They may change after approvals, corrections or rate changes. They are not final pay.</Typography>
          <Typography variant="body2">
            Overtime: 1.5× the greater of daily hours over 8 or Saturday–Friday
            weekly hours over 44, without double counting. No unpaid break
            deduction is applied.
          </Typography>
              <Typography variant="body2">Paid leave, taxes and deductions are excluded. Provisional estimates can change while related workweeks remain open.</Typography>
            </Stack></AccordionDetails>
          </Accordion>
        </Stack>
      </Paper>
    </Stack>
  );
}
