import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { ApiError } from "../../api/client";
export interface Field {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "date";
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  helper?: string;
  min?: string;
  max?: string;
  step?: string;
  maxLength?: number;
}
export default function FormDialog({
  title,
  fields,
  initial,
  onClose,
  onSave,
  notice,
}: {
  title: string;
  fields: Field[];
  initial: Record<string, string>;
  onClose: () => void;
  onSave?: (values: Record<string, string>) => Promise<void>;
  notice?: string;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!onSave || pending) return;
          setPending(true);
          setError(null);
          try {
            await onSave(values);
            onClose();
          } catch (failure) {
            setError(failure as Error);
          } finally {
            setPending(false);
          }
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {notice && <Alert severity="info">{notice}</Alert>}
            {error && <Alert severity="error">{error.message}</Alert>}
            {fields.map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                type={field.type ?? "text"}
                select={!!field.options}
                required={field.required}
                value={values[field.name] ?? ""}
                disabled={pending || !onSave || field.disabled}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.name]: e.target.value }))
                }
                error={error instanceof ApiError && !!error.fields[field.name]}
                helperText={
                  (error instanceof ApiError && error.fields[field.name]) ||
                  field.helper
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: {
                    min: field.min,
                    max: field.max,
                    step: field.step,
                    maxLength: field.maxLength,
                    autoComplete:
                      field.type === "password" ? "new-password" : undefined,
                  },
                }}
              >
                {field.options?.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={onClose}>
            {onSave ? "Cancel" : "Close"}
          </Button>
          {onSave && (
            <Button type="submit" variant="contained" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
