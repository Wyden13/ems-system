import { useQuery } from "@tanstack/react-query";
import { Alert, Link, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../api/client";
import { businessDate, dateTime } from "../../api/attendance";
import type { LeaveRequest, Shift } from "../../api/workflows";
import QueryState from "./QueryState";

export default function PtoConflictSummary({
  request,
}: {
  request: LeaveRequest;
}) {
  const conflicts = useQuery({
    queryKey: ["pto", "conflicts", request.id],
    enabled: request.status === "PENDING",
    queryFn: ({ signal }) =>
      api<{ shiftIds: number[] }>(`/api/pto/requests/${request.id}/conflicts`, {
        signal,
      }),
  });
  const ids = conflicts.data?.shiftIds ?? [];
  const shifts = useQuery({
    queryKey: ["pto", "conflict-shifts", request.id, ids],
    enabled: ids.length > 0,
    queryFn: ({ signal }) =>
      Promise.all(ids.map((id) => api<Shift>(`/api/shifts/${id}`, { signal }))),
  });
  if (request.status !== "PENDING") return null;
  return (
    <Stack spacing={1}>
      <QueryState
        loading={conflicts.isPending || (ids.length > 0 && shifts.isPending)}
        error={conflicts.error ?? shifts.error}
        retry={() => {
          void conflicts.refetch();
          if (ids.length) void shifts.refetch();
        }}
      />
      {conflicts.data && (
        <Alert severity={ids.length ? "warning" : "info"}>
          {ids.length
            ? "Conflicting shifts must have this employee's assignments removed before approval."
            : "No conflicting shift assignments."}
        </Alert>
      )}
      {shifts.data?.map((shift) => (
        <Link
          key={shift.id}
          component={RouterLink}
          to={`/schedule?from=${businessDate(new Date(shift.startsAt))}&shift=${shift.id}#shift-${shift.id}`}
        >
          {shift.categoryName} · {dateTime(shift.startsAt)} –{" "}
          {dateTime(shift.endsAt)} · Shift {shift.id}
        </Link>
      ))}
    </Stack>
  );
}
