import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { addDays } from "../api/attendance";
import type { ScheduleOptions, Shift } from "../api/workflows";
import { scheduleTable } from "./schedulePreview";
import { downloadSchedule } from "./scheduleExport";

export default function SchedulePreviewDialog({
  shifts,
  options,
  from,
  span,
  showCoverage,
  onClose,
}: {
  shifts: Shift[];
  options: ScheduleOptions;
  from: string;
  span: number;
  showCoverage: boolean;
  onClose: () => void;
}) {
  const mobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const table = scheduleTable(shifts, options, from, span, showCoverage);
  const to = addDays(from, span - 1);
  return (
    <Dialog
      open
      fullWidth
      maxWidth="xl"
      fullScreen={mobile}
      onClose={onClose}
      aria-labelledby="schedule-preview-title"
    >
      <DialogTitle id="schedule-preview-title">Schedule preview</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            useFlexGap
            spacing={1}
            sx={{ flexWrap: "wrap", alignItems: "center" }}
          >
            <Typography sx={{ flex: 1 }}>
              {from} – {to} · Mountain Time
            </Typography>
            <Button
              variant="outlined"
              onClick={() => downloadSchedule(table, from, to, "csv")}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              onClick={() => downloadSchedule(table, from, to, "xlsx")}
            >
              Export Excel
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            All employees and shifts you can view in this date range. Cancelled
            shifts are excluded.
            {showCoverage &&
              " Open coverage hours show unfilled staffing hours."}
          </Typography>
          <TableContainer
            tabIndex={0}
            role="region"
            aria-label="Schedule preview — scroll horizontally for all dates"
            sx={{ maxHeight: "65vh" }}
          >
            <Table
              stickyHeader
              size="small"
              aria-label="Schedule preview roster"
            >
              <TableHead>
                <TableRow>
                  {table[0].map((cell, i) => (
                    <TableCell
                      key={i}
                      sx={{
                        minWidth:
                          i === 0
                            ? 170
                            : i === 1 || i === table[0].length - 1
                              ? 100
                              : i === 2
                                ? 120
                                : 140,
                        ...(i === 0
                          ? { position: "sticky", left: 0, zIndex: 4 }
                          : {}),
                      }}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {table.slice(1).map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell
                        key={j}
                        sx={{
                          whiteSpace: "pre-line",
                          verticalAlign: "top",
                          ...(j === 0
                            ? {
                                position: "sticky",
                                left: 0,
                                bgcolor: "background.paper",
                                zIndex: 1,
                                fontWeight: 600,
                              }
                            : {}),
                        }}
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close preview</Button>
      </DialogActions>
    </Dialog>
  );
}
