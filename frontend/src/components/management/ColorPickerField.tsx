import { Box, ButtonBase, Stack, TextField, Typography } from "@mui/material";

const presets = [
  ["Purple", "#5B4BE1"], ["Blue", "#2563EB"], ["Teal", "#167B80"],
  ["Green", "#258447"], ["Amber", "#C47608"], ["Red", "#C93742"],
  ["Pink", "#C23C86"], ["Slate", "#64748B"],
];

export default function ColorPickerField({ label, value, onChange, disabled, required, error, helper, autoFocus }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helper?: string;
  autoFocus?: boolean;
}) {
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <Box component="fieldset" disabled={disabled} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Typography component="legend" variant="body2" sx={{ mb: 1.5 }}>{label}{required ? " *" : ""}</Typography>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
          <Box component="input" type="color" aria-label={`Choose custom ${label.toLowerCase()}`}
            title="Choose a custom color" value={valid ? value : "#5B4BE1"}
            disabled={disabled} onChange={e => onChange(e.target.value.toUpperCase())}
            sx={{ width: 56, height: 56, flexShrink: 0, p: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1,
              bgcolor: "background.paper", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
              "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
              "&::-webkit-color-swatch-wrapper": { p: 0 }, "&::-webkit-color-swatch": { border: 0, borderRadius: 0.5 },
              "&::-moz-color-swatch": { border: 0, borderRadius: 0.5 } }} />
          <TextField fullWidth label="Hex color" value={value} required={required} disabled={disabled}
            autoFocus={autoFocus} error={error} helperText={helper ?? "Choose a swatch or enter a hex code, e.g. #5B4BE1."}
            onChange={e => onChange(e.target.value.toUpperCase())}
            slotProps={{ htmlInput: { maxLength: 7, spellCheck: false }, input: { sx: { fontFamily: "monospace" } } }} />
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", pl: 0.5 }}>
          {presets.map(([name, color]) => (
            <ButtonBase key={color} type="button" disabled={disabled} title={`${name} (${color})`}
              aria-label={`${name} ${color}`} aria-pressed={value.toUpperCase() === color}
              onClick={() => onChange(color)}
              sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: color,
                border: "3px solid", borderColor: "background.paper", opacity: disabled ? 0.5 : 1,
                outline: "2px solid", outlineColor: value.toUpperCase() === color ? "text.primary" : "transparent",
                "&:focus-visible": { outlineColor: "primary.main", outlineOffset: 3 } }} />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
