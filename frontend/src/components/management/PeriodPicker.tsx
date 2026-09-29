import { Button, Stack, Typography } from "@mui/material";
import { addDays } from "../../api/attendance";
export default function PeriodPicker({
  start,
  onChange,
}: {
  start: string;
  onChange: (start: string) => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "center", flexWrap: "wrap" }}
      useFlexGap
    >
      <Button
        onClick={() => onChange(addDays(start, -14))}
        aria-label="Previous pay period"
      >
        Previous
      </Button>
      <Typography>
        {start} – {addDays(start, 13)}
      </Typography>
      <Button
        onClick={() => onChange(addDays(start, 14))}
        aria-label="Next pay period"
      >
        Next
      </Button>
    </Stack>
  );
}
