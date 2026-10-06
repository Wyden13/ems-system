import DashboardPanel from "../ui/DashboardPanel";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api } from "../../api/client";
import {
  dateTime,
  duration,
  type CurrentAttendance,
} from "../../api/attendance";
import { useAuth } from "../../auth/context";
import QueryState from "./QueryState";

export default function CurrentEmployees() {
  const { account } = useAuth();
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const current = useQuery({
    queryKey: ["attendance", "current-employees", account?.id, account?.role],
    queryFn: ({ signal }) =>
      api<CurrentAttendance>("/api/time-entries/current", { signal }),
    refetchInterval: 15000,
    staleTime: 0,
  });
  const serverNow = current.data
    ? Date.parse(current.data.serverTime) +
      Math.max(0, tick - current.dataUpdatedAt)
    : tick;
  return (
    <DashboardPanel title="Current employees" action={<Stack
          direction="row"
          useFlexGap
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          {current.data && (
            <Chip
              label={`${current.data.employees.length} clocked in`}
              color="success"
              variant="outlined"
            />
          )}
          <Button
            disabled={current.isFetching}
            onClick={() => void current.refetch()}
          >
            Refresh current employees
          </Button>
        </Stack>}>
        <Typography variant="body2" color="text.secondary">
          Employees currently clocked in
          {account?.role === "SUPERVISOR" ? " in your department" : ""}. Updates
          every 15 seconds.
        </Typography>
        <QueryState
          loading={current.isPending}
          error={current.error}
          retry={current.refetch}
        />
        {current.data && (
          <TableContainer
            tabIndex={0}
            role="region"
            aria-label="Current employees — scroll horizontally for more columns"
          >
            <Table
              size="small"
              aria-label="Current employees"
              sx={{ minWidth: 600 }}
            >
              <TableHead>
                <TableRow>
                  {[
                    "Employee",
                    "Employee number",
                    "Clocked in (MT)",
                    "Elapsed time",
                  ].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {current.data.employees.map((e) => (
                  <TableRow key={e.entryId}>
                    <TableCell>{e.name}</TableCell>
                    <TableCell>{e.employeeNumber}</TableCell>
                    <TableCell>{dateTime(e.clockIn)}</TableCell>
                    <TableCell>
                      {duration((serverNow - Date.parse(e.clockIn)) / 1000)}
                    </TableCell>
                  </TableRow>
                ))}
                {current.data.employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      No employees are currently clocked in.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
    </DashboardPanel>
  );
}
