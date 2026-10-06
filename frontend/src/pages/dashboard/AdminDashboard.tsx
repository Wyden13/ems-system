import { useQuery } from "@tanstack/react-query";
import { Paper, Stack, Typography } from "@mui/material";
import { api } from "../../api/client";
import QueryState from "../../components/management/QueryState";
export default function AdminDashboard() {
  const summary = useQuery({
    queryKey: ["employee-summary"],
    queryFn: ({ signal }) =>
      api<{ total: number; active: number; inactive: number }>(
        "/api/employees/summary",
        { signal },
      ),
  });
  return (
    <Stack spacing={2}>
      <Typography variant="h2">Workforce overview</Typography>
      <QueryState
        loading={summary.isPending}
        error={summary.error}
        retry={summary.refetch}
      />
      {summary.data && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          {(["total", "active", "inactive"] as const).map((key) => (
            <Paper key={key} sx={{ p: 2, flex: 1 }}>
              <Typography sx={{ textTransform: "capitalize" }}>
                {key} employees
              </Typography>
              <Typography variant="h2" component="p">
                {summary.data[key]}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
