import { Alert, Button, LinearProgress, Box } from "@mui/material";
export default function QueryState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: Error | null;
  retry: () => unknown;
}) {
  if (loading)
    return (
      <Box sx={{ py: 2 }}>
        <LinearProgress aria-label="Loading records" />
      </Box>
    );
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
