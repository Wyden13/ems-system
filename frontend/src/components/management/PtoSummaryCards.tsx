import { Box, Paper, Stack, Typography } from "@mui/material";
import type { Balance, LeaveRequest } from "../../api/workflows";

export default function PtoSummaryCards({
  balances,
  requests,
  employeeName,
}: {
  balances?: Balance[];
  requests?: LeaveRequest[];
  employeeName?: string;
}) {
  const total = (field: "availableHours" | "usedHours") =>
    balances?.reduce((sum, balance) => sum + Number(balance[field]), 0);
  const available = total("availableHours"),
    used = total("usedHours");
  const days = (hours: number | undefined) =>
    hours === undefined ? "—" : `${Number((hours / 8).toFixed(2))} days`;
  const cards = [
    {
      label: "Available PTO",
      value: days(available),
      detail:
        available === undefined
          ? "Select an employee to see balances"
          : `${available} hours · ${employeeName ?? "Selected employee"}`,
    },
    {
      label: "Pending requests",
      value:
        requests?.filter(
          (r) => r.status === "PENDING" || r.status === "APPROVING",
        ).length ?? "—",
      detail: "Awaiting approval · current view",
    },
    {
      label: "Approved requests",
      value: requests?.filter((r) => r.status === "APPROVED").length ?? "—",
      detail: "Approved leave · current view",
    },
    {
      label: "Used PTO",
      value: days(used),
      detail:
        used === undefined
          ? "Select an employee to see balances"
          : `${used} hours used · allocated balances`,
    },
  ];
  return (
    <Box
      component="section"
      aria-label="Time-off overview"
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      {cards.map((card) => (
        <Paper
          key={card.label}
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: "background.paper",
            borderRadius: 1,
            borderColor: "divider",
            minWidth: 0,
          }}
        >
          <Stack spacing={1}>
            <Typography
              component="h3"
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.7px",
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              {card.label}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 24, sm: 28 },
                fontWeight: 700,
                letterSpacing: "-0.7px",
                lineHeight: 1.2,
              }}
            >
              {card.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {card.detail}
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}
