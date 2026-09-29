import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api, params, send } from "../api/client";
import {
  addDays,
  businessDate,
  currentPeriod,
  dateTime,
  duration,
  midnight,
  parseTime,
  zonedInput,
} from "../api/attendance";
import type {
  AttendanceState,
  Person,
  Score,
  TimeEntry,
} from "../api/attendance";
import { useAuth } from "../auth/context";
import PeriodPicker from "../components/management/PeriodPicker";
import FormDialog from "../components/management/FormDialog";
function AuditDialog({
  entry,
  onClose,
}: {
  entry: TimeEntry;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["attendance", "audit", entry.id],
    queryFn: () =>
      api<
        Array<{
          action: string;
          reason: string;
          reviewer: string;
          occurred_at: string;
          old_clock_in: string;
          old_clock_out: string | null;
          new_clock_in: string;
          new_clock_out: string | null;
          old_status: string;
          new_status: string;
        }>
      >(`/api/time-entries/${entry.id}/history`),
  });
  return (
    <Dialog open onClose={onClose} fullWidth>
      <DialogTitle>Attendance history</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {query.isPending && <CircularProgress />}
          {query.error && <Alert severity="error">{query.error.message}</Alert>}
          {query.data?.length === 0 && (
            <Typography>No reviews or corrections yet.</Typography>
          )}
          {query.data?.map((row, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 2 }}>
              <Typography>
                {row.action} · {dateTime(row.occurred_at)}
              </Typography>
              <Typography>
                {row.old_status} → {row.new_status}
              </Typography>
              <Typography>{row.reason || "No comment"}</Typography>
              {row.action === "ADJUST" && (
                <>
                  <Typography>
                    Before: {dateTime(row.old_clock_in)} –{" "}
                    {row.old_clock_out ? dateTime(row.old_clock_out) : "Open"}
                  </Typography>
                  <Typography>
                    After: {dateTime(row.new_clock_in)} –{" "}
                    {row.new_clock_out ? dateTime(row.new_clock_out) : "Open"}
                  </Typography>
                </>
              )}
            </Paper>
          ))}
          <Button onClick={onClose}>Close</Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
export default function AttendancePage() {
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const manages = account?.role === "MANAGER" || account?.role === "ADMIN";
  const [period, setPeriod] = useState(() => currentPeriod());
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("");
  const [tick, setTick] = useState(() => Date.now());
  const [form, setForm] = useState<{
    entry: TimeEntry;
    action: "approve" | "reject" | "adjust";
  } | null>(null);
  const [history, setHistory] = useState<TimeEntry | null>(null);
  const requestId = useRef<string | null>(null);
  const state = useQuery({
    queryKey: ["attendance", "state"],
    queryFn: ({ signal }) => api<AttendanceState>("/api/time-entries/state", { signal }),
    enabled: account?.role !== "ADMIN",
    refetchInterval: 30000,
  });
  const people = useQuery({
    queryKey: ["attendance", "people"],
    queryFn: () => api<Person[]>("/api/time-entries/people"),
  });
  const personId =
    selected ||
    String(people.data?.find((p) => p.self)?.id ?? people.data?.[0]?.id ?? "");
  const person = people.data?.find((p) => String(p.id) === personId);
  const rows = useQuery({
    queryKey: ["attendance", "entries", personId, period, status],
    enabled: !!personId,
    queryFn: () =>
      api<TimeEntry[]>(
        `/api/time-entries?${params({ employeeId: personId, from: midnight(period), to: midnight(addDays(period, 14)), status: status || undefined })}`,
      ),
    refetchInterval: 30000,
  });
  const score = useQuery({
    queryKey: ["attendance", "score", personId, period],
    enabled: !!personId,
    queryFn: () =>
      api<Score>(
        `/api/timesheets/score?${params({ employeeId: personId, from: period, to: addDays(period, 13) })}`,
      ),
  });
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["attendance"] }),
      queryClient.invalidateQueries({ queryKey: ["payroll"] }),
    ]);
  };
  const clockAction = useMutation({
    mutationFn: async () => {
      if (state.data?.active)
        return send<TimeEntry>("/api/time-entries/clock-out", "POST", {
          entryId: state.data.active.id,
        });
      requestId.current ??= crypto.randomUUID();
      return send<TimeEntry>("/api/time-entries/clock-in", "POST", {
        requestId: requestId.current,
      });
    },
    onSuccess: async () => {
      requestId.current = null;
      await invalidate();
    },
    onError: () => {
      void invalidate();
    },
  });
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const serverNow = state.data
    ? Date.parse(state.data.serverTime) +
      Math.max(0, tick - state.dataUpdatedAt)
    : tick;
  const today = businessDate(new Date(serverNow));
  const stateDay = state.data
    ? businessDate(new Date(state.data.serverTime))
    : today;
  useEffect(() => {
    if (stateDay !== today)
      void queryClient.invalidateQueries({ queryKey: ["attendance", "state"] });
  }, [today, stateDay, queryClient]);
  const elapsed = state.data?.active
    ? Math.max(0, (serverNow - Date.parse(state.data.active.clockIn)) / 1000)
    : 0;
  const todaySeconds = state.data
    ? stateDay === today
      ? state.data.todaySeconds +
        (state.data.active
          ? Math.max(0, (serverNow - Date.parse(state.data.serverTime)) / 1000)
          : 0)
      : Math.min(
          elapsed,
          Math.max(0, (serverNow - Date.parse(midnight(today))) / 1000),
        )
    : 0;
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h2">Attendance</Typography>
        <Typography color="text.secondary">
          Mountain Time · {dateTime(new Date(serverNow).toISOString())}
        </Typography>
      </Box>
      {account?.role !== "ADMIN" && (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            {state.isPending && (
              <CircularProgress aria-label="Loading clock status" />
            )}
            {state.error && (
              <Alert
                severity="error"
                action={
                  <Button onClick={() => void state.refetch()}>Retry</Button>
                }
              >
                {state.error.message}
              </Alert>
            )}
            {state.data && (
              <>
                <Chip
                  sx={{ alignSelf: "flex-start" }}
                  color={state.data.active ? "success" : "default"}
                  label={state.data.active ? "Clocked in" : "Clocked out"}
                />
                <Typography variant="h3" aria-label="Session duration">
                  {duration(elapsed)}
                </Typography>
                <Typography>
                  Today’s recorded time: {duration(todaySeconds)}
                </Typography>
                {state.data.active && (
                  <Typography>
                    Clocked in {dateTime(state.data.active.clockIn)}
                  </Typography>
                )}
                <Button
                  variant="contained"
                  size="large"
                  sx={{ alignSelf: "flex-start" }}
                  disabled={clockAction.isPending || state.isFetching}
                  onClick={() => clockAction.mutate()}
                >
                  {clockAction.isPending
                    ? "Saving…"
                    : state.data.active
                      ? "Clock Out"
                      : "Clock In"}
                </Button>
              </>
            )}
            {clockAction.error && (
              <Alert severity="error">{clockAction.error.message}</Alert>
            )}
          </Stack>
        </Paper>
      )}
      <Alert severity="info">
        Scheduled break deductions and attendance scoring are deferred. No scheduled break deduction is
        applied. Completed time must be approved before it appears in payroll.
      </Alert>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h3">Attendance records</Typography>
          <PeriodPicker start={period} onChange={setPeriod} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {people.data && people.data.length > 0 && (
              <TextField
                select
                label="Employee"
                value={personId}
                onChange={(e) => setSelected(e.target.value)}
                sx={{ minWidth: 240 }}
              >
                {people.data.map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    {p.name} · {p.employeeNumber}
                    {p.self ? " (you)" : ""}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 190 }}
            >
              {["", "OPEN", "PENDING_APPROVAL", "APPROVED", "REJECTED"].map(
                (s) => (
                  <MenuItem key={s} value={s}>
                    {s ? s.replaceAll("_", " ") : "All statuses"}
                  </MenuItem>
                ),
              )}
            </TextField>
          </Stack>
          {people.error && (
            <Alert
              severity="error"
              action={
                <Button onClick={() => void people.refetch()}>Retry</Button>
              }
            >
              {people.error.message}
            </Alert>
          )}
          {people.data?.length === 0 && (
            <Typography>No employees available.</Typography>
          )}
          {score.data && (
            <Box>
              <Typography>
                Schedule miss percentage:{" "}
                <strong>
                  {score.data.missPercentage === null
                    ? "Not available"
                    : `${score.data.missPercentage}%`}
                </strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {score.data.explanation}
              </Typography>
            </Box>
          )}
          {score.error && <Alert severity="error">{score.error.message}</Alert>}
          {rows.isPending && personId && (
            <CircularProgress aria-label="Loading attendance" />
          )}
          {rows.error && (
            <Alert
              severity="error"
              action={
                <Button onClick={() => void rows.refetch()}>Retry</Button>
              }
            >
              {rows.error.message}
            </Alert>
          )}
          {rows.data && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {[
                      "Clock in (MT)",
                      "Clock out (MT)",
                      "Recorded time",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{dateTime(entry.clockIn)}</TableCell>
                      <TableCell>
                        {entry.clockOut
                          ? dateTime(entry.clockOut)
                          : "Still clocked in"}
                      </TableCell>
                      <TableCell>
                        {entry.clockOut
                          ? duration(entry.workedSeconds)
                          : "In progress"}
                      </TableCell>
                      <TableCell>{entry.status.replaceAll("_", " ")}</TableCell>
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ flexWrap: "wrap" }}
                        >
                          <Button onClick={() => setHistory(entry)}>
                            History
                          </Button>
                          {manages && !person?.self && (
                            <>
                              {entry.status === "PENDING_APPROVAL" && (
                                <>
                                  <Button
                                    onClick={() =>
                                      setForm({ entry, action: "approve" })
                                    }
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    color="error"
                                    onClick={() =>
                                      setForm({ entry, action: "reject" })
                                    }
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                onClick={() =>
                                  setForm({ entry, action: "adjust" })
                                }
                              >
                                Correct
                              </Button>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        No attendance entries in this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </Paper>
      {history && (
        <AuditDialog entry={history} onClose={() => setHistory(null)} />
      )}
      {form && (
        <FormDialog
          title={
            form.action === "adjust"
              ? "Correct attendance"
              : form.action === "approve"
                ? "Approve attendance"
                : "Reject attendance"
          }
          notice={
            form.action === "adjust"
              ? "Corrections are audited and require approval again. Use Mountain Time with its UTC offset to distinguish daylight saving changes."
              : undefined
          }
          fields={
            form.action === "adjust"
              ? [
                  {
                    name: "clockIn",
                    label: "Clock-in (Mountain time)",
                    required: true,
                    helper: "YYYY-MM-DDTHH:mm:ss-06:00 (MDT) or -07:00 (MST)",
                  },
                  {
                    name: "clockOut",
                    label: "Clock-out (Mountain time)",
                    required: true,
                  },
                  {
                    name: "reason",
                    label: "Reason",
                    required: true,
                    maxLength: 500,
                  },
                ]
              : [{ name: "comment", label: "Comment", maxLength: 500 }]
          }
          initial={
            form.action === "adjust"
              ? {
                  clockIn: zonedInput(form.entry.clockIn),
                  clockOut: zonedInput(
                    form.entry.clockOut ?? new Date(serverNow).toISOString(),
                  ),
                  reason: "",
                }
              : { comment: "" }
          }
          onClose={() => setForm(null)}
          onSave={async (values) => {
            const body =
              form.action === "adjust"
                ? {
                    version: form.entry.version,
                    clockIn: parseTime(values.clockIn),
                    clockOut: parseTime(values.clockOut),
                    reason: values.reason,
                  }
                : { version: form.entry.version, comment: values.comment };
            await send(
              `/api/time-entries/${form.entry.id}/${form.action}`,
              "POST",
              body,
            );
            await invalidate();
          }}
        />
      )}
    </Stack>
  );
}
