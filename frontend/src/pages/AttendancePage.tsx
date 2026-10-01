import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
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
  useMediaQuery,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { api, params, send } from "../api/client";
import {
  addDays,
  currentPeriod,
  dateTime,
  duration,
  midnight,
  parseTime,
  zonedInput,
} from "../api/attendance";
import type { Person, Score, TimeEntry } from "../api/attendance";
import { useAuth } from "../auth/context";
import useAttendanceClock from "../hooks/useAttendanceClock";
import { AttendanceClockPanel } from "../components/management/AttendanceClockPanel";
import { statusLabel } from "../api/workflows";
import PeriodPicker from "../components/management/PeriodPicker";
import FormDialog from "../components/management/FormDialog";
import {
  useObjectContextMenu,
  type ContextAction,
} from "../components/context-menu/context";
import { useObjectControls } from "../components/context-menu/objectControls";
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
  const contextMenu = useObjectContextMenu();
  const { objectActions } = useObjectControls();
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const manages = account?.role === "MANAGER" || account?.role === "ADMIN";
  const [period, setPeriod] = useState(() => currentPeriod());
  const [selected, setSelected] = useState("");
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(
    ["OPEN", "PENDING_APPROVAL", "APPROVED", "REJECTED"].includes(
      searchParams.get("status") ?? "",
    )
      ? searchParams.get("status")!
      : "",
  );
  const clock = useAttendanceClock();
  const serverNow = clock.serverNow;
  const mobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const [form, setForm] = useState<{
    entry: TimeEntry;
    action: "approve" | "reject" | "adjust";
  } | null>(null);
  const [history, setHistory] = useState<TimeEntry | null>(null);
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
  const entryActions = (entry: TimeEntry): ContextAction[] =>
    objectActions({
      copy: {
        kind: "attendance",
        label: `attendance ${dateTime(entry.clockIn)}`,
        values: {
          clockIn: entry.clockIn,
          clockOut: entry.clockOut ?? "",
          status: statusLabel(entry.status),
        },
      },
      edit:
        manages && !person?.self
          ? () => setForm({ entry, action: "adjust" })
          : undefined,
      editReason: "Only managers can correct another employee’s attendance.",
      deleteReason:
        "Attendance history is retained. Use Edit to make an audited correction.",
      details: () => setHistory(entry),
    });
  const recordActions = (entry: TimeEntry) => (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
      <Button onClick={() => setHistory(entry)}>History</Button>
      {manages && !person?.self && (
        <>
          {entry.status === "PENDING_APPROVAL" && (
            <>
              <Button onClick={() => setForm({ entry, action: "approve" })}>
                Approve
              </Button>
              <Button
                color="error"
                onClick={() => setForm({ entry, action: "reject" })}
              >
                Reject
              </Button>
            </>
          )}
          <Button onClick={() => setForm({ entry, action: "adjust" })}>
            Correct
          </Button>
        </>
      )}
    </Stack>
  );
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h2">Attendance</Typography>
        <Typography color="text.secondary">
          Mountain Time · {dateTime(new Date(serverNow).toISOString())}
        </Typography>
      </Box>
      {account?.role !== "ADMIN" && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <AttendanceClockPanel clock={clock} />
        </Paper>
      )}
      <Alert severity="info">
        No unpaid break deduction is applied. Completed time must be approved
        before it appears in payroll estimates.
      </Alert>
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
                    {s ? statusLabel(s) : "All statuses"}
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
                  {score.data.status !== "AVAILABLE" ||
                  score.data.missPercentage === null ||
                  score.data.expectedEvents === 0
                    ? score.data.expectedEvents === 0
                      ? "No completed shifts"
                      : "Not available"
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
          {rows.data &&
            (mobile ? (
              <Stack spacing={2}>
                {rows.data.length === 0 && (
                  <Typography>No attendance entries in this period.</Typography>
                )}
                {rows.data.map((entry) => (
                  <Paper
                    key={entry.id}
                    variant="outlined"
                    sx={{ p: 2 }}
                    {...contextMenu(
                      `Attendance · ${dateTime(entry.clockIn)}`,
                      entryActions(entry),
                    )}
                  >
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">
                        {dateTime(entry.clockIn)} MT
                      </Typography>
                      <Typography>
                        Clock out:{" "}
                        {entry.clockOut
                          ? dateTime(entry.clockOut)
                          : "Still clocked in"}
                      </Typography>
                      <Typography>
                        Recorded:{" "}
                        {entry.clockOut
                          ? duration(entry.workedSeconds)
                          : "In progress"}{" "}
                        · {statusLabel(entry.status)}
                      </Typography>
                      {recordActions(entry)}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <TableContainer
                tabIndex={0}
                role="region"
                aria-label="Attendance records — scroll horizontally for more columns"
              >
                <Table aria-label="Attendance records">
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
                      <TableRow
                        key={entry.id}
                        {...contextMenu(
                          `Attendance · ${dateTime(entry.clockIn)}`,
                          entryActions(entry),
                        )}
                      >
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
                        <TableCell>{statusLabel(entry.status)}</TableCell>
                        <TableCell>{recordActions(entry)}</TableCell>
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
            ))}
        </Stack>
      </Paper>
      {history && (
        <AuditDialog entry={history} onClose={() => setHistory(null)} />
      )}
      {form && (
        <FormDialog
          submitLabel={
            form.action === "adjust"
              ? "Save correction"
              : form.action === "approve"
                ? "Approve attendance"
                : "Reject attendance"
          }
          pendingLabel="Submitting…"
          submitColor={form.action === "reject" ? "error" : "primary"}
          summary={
            <Typography>
              {person?.name} · {dateTime(form.entry.clockIn)} –{" "}
              {form.entry.clockOut
                ? dateTime(form.entry.clockOut)
                : "Still clocked in"}{" "}
              MT
            </Typography>
          }
          successMessage={
            form.action === "adjust"
              ? "Attendance corrected. It requires approval again."
              : `Attendance ${form.action === "approve" ? "approved" : "rejected"}.`
          }
          validate={(values) =>
            form.action === "adjust" &&
            Date.parse(values.clockOut) <= Date.parse(values.clockIn)
              ? { clockOut: "Clock-out must be after clock-in." }
              : ({} as Record<string, string>)
          }
          title={
            form.action === "adjust"
              ? "Correct attendance"
              : form.action === "approve"
                ? "Approve attendance"
                : "Reject attendance"
          }
          notice={
            form.action === "adjust"
              ? "Corrections are audited and require approval again. All dates and times use Mountain Time."
              : undefined
          }
          fields={
            form.action === "adjust"
              ? [
                  {
                    name: "clockIn",
                    label: "Clock-in",
                    type: "datetime",
                    required: true,
                    helper:
                      "Seconds are preserved when correcting existing records.",
                  },
                  {
                    name: "clockOut",
                    label: "Clock-out",
                    type: "datetime",
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
