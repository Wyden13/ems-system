import { Box, Paper, Stack, Typography } from "@mui/material";
import type { Balance, LeaveRequest } from "../../api/workflows";

export default function PtoSummaryCards({ balances, requests, employeeName }: {
  balances?: Balance[];
  requests?: LeaveRequest[];
  employeeName?: string;
}) {
  const total = (field: "availableHours" | "usedHours") => balances?.reduce((sum, balance) => sum + Number(balance[field]), 0);
  const available = total("availableHours"), used = total("usedHours");
  const days = (hours: number | undefined) => hours === undefined ? "—" : `${Number((hours / 8).toFixed(2))} days`;
  const cards = [
    { label: "Available PTO", value: days(available), detail: available === undefined ? "Select an employee to see balances" : `${available} hours · ${employeeName ?? "Selected employee"}`, tint: "#F0F8F2", color: "#2D7545" },
    { label: "Pending requests", value: requests?.filter(r => r.status === "PENDING" || r.status === "APPROVING").length ?? "—", detail: "Awaiting approval · current view", tint: "#FFFAF0", color: "#986815" },
    { label: "Approved requests", value: requests?.filter(r => r.status === "APPROVED").length ?? "—", detail: "Approved leave · current view", tint: "#F2F8F5", color: "#2D7545" },
    { label: "Used PTO", value: days(used), detail: used === undefined ? "Select an employee to see balances" : `${used} hours used · allocated balances`, tint: "#F5F5FC", color: "#5D5297" },
  ];
  return <Box component="section" aria-label="Time-off overview" sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: { xs: 1.5, sm: 2 } }}>
    {cards.map(card => <Paper key={card.label} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: card.tint, borderRadius: 3, borderColor: "rgba(37, 64, 48, 0.08)", minWidth: 0 }}>
      <Stack spacing={1}>
        <Typography component="h3" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: card.color }}>{card.label}</Typography>
        <Typography sx={{ fontSize: { xs: 26, sm: 32 }, fontWeight: 700, letterSpacing: "-0.7px", lineHeight: 1.2 }}>{card.value}</Typography>
        <Typography variant="caption" color="text.secondary">{card.detail}</Typography>
      </Stack>
    </Paper>)}
  </Box>;
}
