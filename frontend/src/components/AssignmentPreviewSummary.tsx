import { useEffect } from "react";
import { Alert, CircularProgress, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { checkAssignment, previewKey } from "../api/scheduling";
import type { AssignmentCandidate } from "../api/workflows";

export default function AssignmentPreviewSummary({
  candidate,
  onWarningShown,
}: {
  candidate?: AssignmentCandidate;
  onWarningShown?: (candidate: AssignmentCandidate) => void;
}) {
  const preview = useQuery({
    queryKey: candidate
      ? previewKey(candidate)
      : ["schedule", "assignment-preview", "empty"],
    queryFn: ({ signal }) => checkAssignment(candidate!, signal),
    enabled: !!candidate,
    retry: false,
  });
  useEffect(() => {
    if (candidate && preview.data?.state === "WARNING")
      onWarningShown?.(candidate);
  }, [candidate, preview.data, onWarningShown]);
  if (!candidate)
    return (
      <Alert severity="info">
        Choose an employee, department, and valid shift times to check
        availability.
      </Alert>
    );
  if (preview.isPending)
    return (
      <Stack direction="row" spacing={1} role="status">
        <CircularProgress size={16} />
        <Typography variant="body2">
          Checking availability and conflicts…
        </Typography>
      </Stack>
    );
  if (preview.error)
    return (
      <Alert severity="error">
        Availability check failed. {preview.error.message} Try again before
        assigning.
      </Alert>
    );
  return (
    <Alert
      severity={
        preview.data.state === "BLOCKED"
          ? "error"
          : preview.data.state === "WARNING"
            ? "warning"
            : "success"
      }
    >
      {preview.data.reasons.join(" ")}
      {preview.data.state === "WARNING" &&
        " Continuing will assign this employee despite the availability warning."}
    </Alert>
  );
}
