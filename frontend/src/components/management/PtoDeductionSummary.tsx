import { useQuery } from "@tanstack/react-query";
import { Alert, Stack, Typography } from "@mui/material";
import { api } from "../../api/client";
import type { Balance } from "../../api/workflows";
import QueryState from "./QueryState";

export default function PtoDeductionSummary({
  employeeId,
  ptoTypeId,
  hours,
}: {
  employeeId: string;
  ptoTypeId: string;
  hours: string;
}) {
  const balances = useQuery({
    queryKey: ["pto", "balances", Number(employeeId)],
    enabled: !!employeeId,
    queryFn: ({ signal }) =>
      api<Balance[]>(`/api/pto/balances/employees/${Number(employeeId)}`, {
        signal,
      }),
  });
  if (!employeeId || !ptoTypeId) return null;
  const available = Number(
    balances.data?.find((b) => b.ptoTypeId === Number(ptoTypeId))
      ?.availableHours ?? 0,
  );
  const deduction = Number(hours) || 0;
  const remaining = Number((available - deduction).toFixed(2));
  return (
    <Stack spacing={1}>
      <QueryState
        loading={balances.isPending}
        error={balances.error}
        retry={balances.refetch}
      />
      {balances.data && (
        <>
          <Typography role="status">
            Available PTO: {available} hours · After deduction: {remaining}{" "}
            hours
          </Typography>
          {deduction > available && (
            <Alert severity="warning">
              The deduction exceeds the available PTO. Reserved and used leave
              cannot be deducted.
            </Alert>
          )}
        </>
      )}
    </Stack>
  );
}
