import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
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
import { api, params } from "../api/client";
import { currentPeriod, dateTime, duration } from "../api/attendance";
import type { PayrollReport } from "../api/attendance";
import PeriodPicker from "../components/management/PeriodPicker";
const money = (value: number | string) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
    Number(value),
  );
export default function PayrollPage() {
  const [period, setPeriod] = useState(() => currentPeriod());
  const query = useQuery({
    queryKey: ["payroll", period],
    queryFn: () =>
      api<PayrollReport>(
        `/api/payroll/estimates?${params({ periodStart: period })}`,
      ),
    refetchInterval: 30000,
  });
  return (
    <Stack spacing={3}>
      <Typography variant="h2">Payroll estimates</Typography>
      <Alert severity="info">
        Estimated gross pay in CAD, using approved time and current hourly
        rates. Estimates can change when attendance is approved or corrected, or
        pay rates change. No taxes or deductions are included.
      </Alert>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <PeriodPicker start={period} onChange={setPeriod} />
          <Typography variant="body2">
            Overtime: 1.5× the greater of daily hours over 8 or Saturday–Friday
            weekly hours over 44, without double counting. No scheduled break
            deduction is applied while scheduling is unavailable.
          </Typography>
          <Button
            sx={{ alignSelf: "flex-start" }}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh estimates
          </Button>
          {query.isPending && <CircularProgress aria-label="Loading payroll" />}
          {query.error && <Alert severity="error">{query.error.message}</Alert>}
          {query.data && (
            <>
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
              <TableContainer>
                <Table>
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
                          No employees available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
