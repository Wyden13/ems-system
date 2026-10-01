import { useId, useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import { ApiError } from "../../api/client";
import { parseTime } from "../../api/attendance";
import { useFeedback } from "../feedback/context";
import MountainDateTimeField from "./MountainDateTimeField";
import AccountPicker from "./AccountPicker";
export interface Field {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "date"
    | "time"
    | "datetime"
    | "account";
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  helper?: string;
  min?: string;
  max?: string;
  step?: string;
  maxLength?: number;
  section?: string;
  optionalSection?: boolean;
}
export default function FormDialog({
  title,
  fields,
  initial,
  onClose,
  onSave,
  notice,
  submitLabel,
  pendingLabel,
  cancelLabel = "Cancel",
  submitColor = "primary",
  summary,
  renderSummary,
  validate,
  onValuesChange,
  successMessage,
  grouped = false,
}: {
  title: string;
  fields: Field[];
  initial: Record<string, string>;
  onClose: () => void;
  onSave?: (values: Record<string, string>) => Promise<void>;
  notice?: string;
  submitLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  submitColor?: "primary" | "error";
  summary?: ReactNode;
  renderSummary?: (values: Record<string, string>) => ReactNode;
  validate?: (values: Record<string, string>) => Record<string, string>;
  onValuesChange?: (
    values: Record<string, string>,
    name: string,
  ) => Record<string, string>;
  successMessage?: string;
  grouped?: boolean;
}) {
  const id = useId();
  const feedback = useFeedback();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<Error | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const change = (name: string, value: string) => {
    setValues((previous) => {
      const next = { ...previous, [name]: value };
      return onValuesChange?.(next, name) ?? next;
    });
    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
  };
  const first = fields.find((f) => !f.disabled)?.name;
  const field = (f: Field) => {
    const helper =
      fieldErrors[f.name] ||
      (error instanceof ApiError && error.fields[f.name]) ||
      f.helper;
    const invalid =
      !!fieldErrors[f.name] ||
      (error instanceof ApiError && !!error.fields[f.name]);
    const disabled = pending || !onSave || f.disabled;
    if (f.type === "datetime")
      return (
        <MountainDateTimeField
          key={f.name}
          label={f.label}
          value={values[f.name] ?? ""}
          onChange={(v) => change(f.name, v)}
          disabled={disabled}
          required={f.required}
          error={invalid}
          helper={helper}
          autoFocus={f.name === first}
        />
      );
    if (f.type === "account")
      return (
        <AccountPicker
          key={f.name}
          label={f.label}
          value={values[f.name] ?? ""}
          onChange={(v) => change(f.name, v)}
          disabled={disabled}
          error={invalid}
          helper={helper}
        />
      );
    return (
      <TextField
        key={f.name}
        fullWidth
        autoFocus={f.name === first}
        label={f.label}
        type={f.type ?? "text"}
        select={!!f.options}
        required={f.required}
        value={values[f.name] ?? ""}
        disabled={disabled}
        onChange={(e) => change(f.name, e.target.value)}
        error={invalid}
        helperText={helper}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: {
            min: f.min,
            max: f.max,
            step: f.step,
            maxLength: f.maxLength,
            autoComplete:
              f.type === "password"
                ? f.name === "currentPassword"
                  ? "current-password"
                  : "new-password"
                : undefined,
          },
        }}
      >
        {f.options?.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  };
  const sections = [...new Set([
    ...fields.filter((f) => !f.optionalSection),
    ...fields.filter((f) => f.optionalSection),
  ].map((f) => f.section ?? "Details"))];
  return (
    <Dialog
      open
      fullWidth
      maxWidth={grouped ? "md" : "sm"}
      aria-labelledby={`${id}-title`}
      aria-describedby={notice || summary ? `${id}-description` : undefined}
      onClose={() => {
        if (!pending) onClose();
      }}
      slotProps={{
        paper: {
          sx: { maxHeight: "calc(100dvh - 32px)", m: { xs: 2, sm: 4 } },
        },
      }}
    >
      <Box
        component="form"
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!onSave || pending) return;
          const errors = { ...validate?.(values) };
          for (const f of fields.filter((f) => f.type === "datetime")) {
            try {
              if (values[f.name] || f.required) parseTime(values[f.name] ?? "");
            } catch (failure) {
              errors[f.name] = (failure as Error).message;
            }
          }
          setFieldErrors(errors);
          setError(null);
          if (Object.values(errors).some(Boolean)) {
            if (fields.some((f) => f.optionalSection && errors[f.name]))
              setOptionalOpen(true);
            setError(
              new Error("Check the highlighted fields before continuing."),
            );
            return;
          }
          setPending(true);
          try {
            await onSave(values);
            feedback(successMessage ?? `${submitLabel ?? title} completed.`);
            onClose();
          } catch (failure) {
            setError(failure as Error);
            if (
              failure instanceof ApiError &&
              fields.some((f) => f.optionalSection && failure.fields[f.name])
            )
              setOptionalOpen(true);
          } finally {
            setPending(false);
          }
        }}
      >
        <DialogTitle id={`${id}-title`}>{title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {(notice || summary) && (
              <Stack spacing={2} id={`${id}-description`}>
                {summary}
                {notice && <Alert severity="info">{notice}</Alert>}
              </Stack>
            )}
            {error && <Alert severity="error">{error.message}</Alert>}
            {grouped
              ? sections.map((section) => {
                  const items = fields.filter(
                    (f) => (f.section ?? "Details") === section,
                  );
                  const content = (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                        },
                        gap: 2,
                      }}
                    >
                      {items.map((f) => (
                        <Box
                          key={f.name}
                          sx={{
                            minWidth: 0,
                            gridColumn:
                              f.type === "account" ? "1 / -1" : undefined,
                          }}
                        >
                          {field(f)}
                        </Box>
                      ))}
                    </Box>
                  );
                  return items.some((f) => f.optionalSection) ? (
                    <Accordion
                      key={section}
                      expanded={optionalOpen}
                      onChange={(_, open) => setOptionalOpen(open)}
                      disableGutters
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h3" component="h2">
                          {section}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>{content}</AccordionDetails>
                    </Accordion>
                  ) : (
                    <Stack key={section} spacing={2}>
                      <Typography variant="h3" component="h2">
                        {section}
                      </Typography>
                      {content}
                    </Stack>
                  );
                })
              : fields.map(field)}
            {renderSummary?.(values)}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={onClose}>
            {onSave ? cancelLabel : "Close"}
          </Button>
          {onSave && (
            <Button
              type="submit"
              variant="contained"
              color={submitColor}
              disabled={pending}
            >
              {pending ? (pendingLabel ?? "Saving…") : (submitLabel ?? "Save")}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
