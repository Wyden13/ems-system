import { useId, type ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

export default function DashboardPanel({ title, description, action, children, mobileOrder = 0 }: { title: string; description?: string; action?: ReactNode; children: ReactNode; mobileOrder?: number }) {
  const id = useId();
  return <Paper component="section" aria-labelledby={id} sx={{ minWidth: 0, overflow: "hidden", order: { xs: mobileOrder, lg: 0 } }}>
    <Stack direction="row" useFlexGap spacing={1} sx={{ px: 2, py: 1.25, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", borderBottom: 1, borderColor: "divider" }}>
      <Box sx={{ minWidth: 0 }}><Typography id={id} variant="h3">{title}</Typography>{description && <Typography variant="caption" color="text.secondary">{description}</Typography>}</Box>
      {action}
    </Stack>
    <Stack spacing={1.5} sx={{ p: 2 }}>{children}</Stack>
  </Paper>;
}
