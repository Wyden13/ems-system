import { Box, Button, Typography } from "@mui/material";
import { addDays } from "../../api/attendance";
const date = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
export default function PeriodPicker({
  start,
  onChange,
}: {
  start: string;
  onChange: (start: string) => void;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Button
        onClick={() => onChange(addDays(start, -14))}
        aria-label="Previous pay period"
      >
        Previous
      </Button>
      <Typography sx={{ textAlign: "center", fontSize: 14 }}>
        <Box component="span" sx={{ display: "block", fontWeight: 600 }}>
          Pay period
        </Box>
        {date(start)} – {date(addDays(start, 13))}
      </Typography>
      <Button
        onClick={() => onChange(addDays(start, 14))}
        aria-label="Next pay period"
      >
        Next
      </Button>
    </Box>
  );
}
