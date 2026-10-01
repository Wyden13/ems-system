import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import { ApiError } from "../../api/client";
import { dateTime, duration } from "../../api/attendance";
import useAttendanceClock from "../../hooks/useAttendanceClock";
import QueryState from "./QueryState";

export function AttendanceClockPanel({
  clock,
}: {
  clock: ReturnType<typeof useAttendanceClock>;
}) {
  const { state, action, elapsed, todaySeconds } = clock;
  return (
    <Stack spacing={2}>
      <QueryState
        loading={state.isPending}
        error={state.error}
        retry={state.refetch}
      />
      {state.error instanceof ApiError && state.error.status === 404 && (
        <Alert severity="info">
          Your login needs a linked employee profile. Ask your administrator to
          link it under Employees → Login access.
        </Alert>
      )}
      {state.data && (
        <>
          <Chip
            sx={{ alignSelf: "flex-start" }}
            color={state.data.active ? "success" : "default"}
            label={state.data.active ? "Clocked in" : "Clocked out"}
          />
          <Typography
            variant="h2"
            component="p"
            aria-label="Session duration"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {duration(elapsed)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Current session · Today’s recorded time: {duration(todaySeconds)}
          </Typography>
          {state.data.active && (
            <Typography variant="body2">
              Started {dateTime(state.data.active.clockIn)} MT
            </Typography>
          )}
          <Button
            variant="contained"
            size="large"
            sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
            disabled={action.isPending || state.isFetching}
            onClick={() => action.mutate()}
          >
            {action.isPending
              ? state.data.active
                ? "Clocking out…"
                : "Clocking in…"
              : state.data.active
                ? "Clock Out"
                : "Clock In"}
          </Button>
        </>
      )}
      {action.error && (
        <Alert severity="error">
          {action.error.message} Check your clock status before retrying.
        </Alert>
      )}
    </Stack>
  );
}
export default function AttendanceClock() {
  return <AttendanceClockPanel clock={useAttendanceClock()} />;
}
