import { Alert, Button, LinearProgress } from "@mui/material";
export default function QueryState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: Error | null;
  retry: () => unknown;
}) {
  if (loading) return <LinearProgress aria-label="Loading records" />;
  if (error)
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => void retry()}>Retry</Button>}
      >
        {error.message}
      </Alert>
    );
  return null;
}
