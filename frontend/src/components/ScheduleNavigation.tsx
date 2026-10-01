import { useId, useState } from "react";
import { Box, Button, IconButton, MenuItem, Popover, Select, Stack, TextField, Typography } from "@mui/material";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import { addDays, businessDate } from "../api/attendance";
import { weekStart } from "./scheduleInteraction";

export default function ScheduleNavigation({ from, view, onFromChange, onViewChange, onPreview, previewDisabled }: {
  from: string;
  view: "week" | "list";
  onFromChange: (from: string) => void;
  onViewChange: (view: "week" | "list") => void;
  onPreview: () => void;
  previewDisabled: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const id = useId();
  const span = view === "week" ? 7 : 14;
  const lastDay = addDays(from, span - 1);
  const format = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-CA", { ...options, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  const years = from.slice(0, 4) === lastDay.slice(0, 4)
    ? from.slice(0, 4)
    : `${from.slice(0, 4)} – ${lastDay.slice(0, 4)}`;

  return <Stack direction="row" useFlexGap spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
    <Box sx={{ flex: { xs: "1 0 100%", md: "0 0 auto" }, mr: { md: 1 } }}>
      <Typography component="h3" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700, letterSpacing: "-0.6px", lineHeight: 1.25 }}>
        {format(from, { month: "short", day: "numeric" })} – {format(lastDay, { month: "short", day: "numeric" })}
      </Typography>
      <Typography variant="caption" color="text.secondary">{years} · Mountain Time</Typography>
    </Box>
    <Stack direction="row" useFlexGap spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Box role="group" aria-label="Schedule date navigation" sx={{ display: "flex", border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden", bgcolor: "background.paper", "& .MuiIconButton-root": { borderRadius: 0, width: 42, height: 42 }, "& .MuiIconButton-root + .MuiIconButton-root": { borderLeft: 1, borderColor: "divider" } }}>
        <IconButton aria-label={`Previous ${view === "week" ? "week" : "range"}`} onClick={() => onFromChange(addDays(from, -span))}><ChevronLeftRounded /></IconButton>
        <IconButton aria-label="Choose schedule date" aria-haspopup="dialog" aria-expanded={!!anchor} aria-controls={anchor ? id : undefined} onClick={event => setAnchor(event.currentTarget)}><CalendarMonthRounded sx={{ fontSize: 21 }} /></IconButton>
        <IconButton aria-label={`Next ${view === "week" ? "week" : "range"}`} onClick={() => onFromChange(addDays(from, span))}><ChevronRightRounded /></IconButton>
      </Box>
      <Button variant="outlined" onClick={() => onFromChange(weekStart(businessDate()))} sx={{ height: 44, px: 1.5, borderColor: "divider", color: "text.primary" }}>Today</Button>
      <Select value={view} onChange={event => onViewChange(event.target.value as "week" | "list")} inputProps={{ "aria-label": "Schedule view" }} size="small" sx={{ height: 44, minWidth: 90, fontSize: 14, fontWeight: 600, "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" } }}>
        <MenuItem value="week">Week</MenuItem>
        <MenuItem value="list">List</MenuItem>
      </Select>
    </Stack>
    <Button variant="outlined" startIcon={<VisibilityOutlined />} disabled={previewDisabled} onClick={onPreview} sx={{ ml: { md: "auto" }, height: 44, borderColor: "divider", color: "text.primary" }}>Preview schedule</Button>
    <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }} slotProps={{ paper: { id, role: "dialog", "aria-label": "Choose schedule date", sx: { p: 2.5, mt: 1, width: 280 } } }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2">Jump to a week</Typography>
        <TextField autoFocus label="Week of" type="date" size="small" value={from} onChange={event => { if (event.target.value) onFromChange(weekStart(event.target.value)); }} slotProps={{ inputLabel: { shrink: true } }} helperText="Weeks start on Saturday." />
        <Button variant="contained" onClick={() => setAnchor(null)}>Done</Button>
      </Stack>
    </Popover>
  </Stack>;
}
