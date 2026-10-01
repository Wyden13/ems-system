import { useId } from "react";
import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { localTimeCandidates } from "../../api/attendance";

export default function MountainDateTimeField({
  label,
  value,
  onChange,
  disabled,
  required,
  error,
  helper,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helper?: string;
  autoFocus?: boolean;
}) {
  const helperId = useId();
  const [date = "", rawTime = ""] = value.split("T");
  const time = rawTime.slice(0, 8);
  const candidates = localTimeCandidates(value);
  const complete = !!date && !!time;
  const invalid = complete && candidates.length === 0;
  const ambiguous = candidates.length > 1;
  const change = (nextDate: string, nextTime: string) => {
    const wall = `${nextDate}T${nextTime.length === 5 ? nextTime + ":00" : nextTime}`;
    const choices = localTimeCandidates(wall);
    onChange(choices.length === 1 ? choices[0] : wall);
  };
  return (
    <Stack
      spacing={1}
      component="fieldset"
      sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
    >
      <Typography component="legend" variant="subtitle2">
        {label} · Mountain Time
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          fullWidth
          autoFocus={autoFocus}
          type="date"
          label={`${label} date`}
          value={date}
          required={required}
          disabled={disabled}
          error={error || invalid}
          onChange={(e) => change(e.target.value, time)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { "aria-describedby": helper || invalid ? helperId : undefined } }}
        />
        <TextField
          fullWidth
          type="time"
          label={`${label} time`}
          value={time}
          required={required}
          disabled={disabled}
          error={error || invalid}
          onChange={(e) => change(date, e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 1, "aria-describedby": helper || invalid ? helperId : undefined } }}
        />
      </Stack>
      {ambiguous && (
        <TextField
          select
          label={`${label} occurrence`}
          value={candidates.includes(value) ? value : ""}
          required
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          helperText="Clocks turn back on this date. Choose which occurrence you mean."
        >
          {candidates.map((candidate, index) => (
            <MenuItem key={candidate} value={candidate}>
              {index === 0
                ? "First occurrence (daylight time)"
                : "Second occurrence (standard time)"}
            </MenuItem>
          ))}
        </TextField>
      )}
      {(helper || invalid) && (
        <Typography
          id={helperId}
          variant="body2"
          color={error || invalid ? "error.main" : "text.secondary"}
          role={error || invalid ? "alert" : undefined}
        >
          {invalid
            ? "This time does not exist when clocks move forward. Choose another time."
            : helper}
        </Typography>
      )}
    </Stack>
  );
}
