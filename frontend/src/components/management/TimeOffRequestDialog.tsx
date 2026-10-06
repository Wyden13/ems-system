import { useId, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { ApiError, send } from "../../api/client";
import { businessDate } from "../../api/attendance";
import type { Balance, PtoType } from "../../api/workflows";
import { useFeedback } from "../feedback/context";
import QueryState from "./QueryState";

const LEAVE_REASONS = [
  "Vacation",
  "Personal leave",
  "Funeral",
  "Bereavement",
  "Jury duty",
  "Family reason",
  "Medical leave",
  "Sick leave",
  "Parental leave",
  "Other",
];

export default function TimeOffRequestDialog({
  types,
  balances,
  loading,
  balanceError,
  retry,
  initial,
  onClose,
  onSaved,
}: {
  types: PtoType[];
  balances?: Balance[];
  loading: boolean;
  balanceError: Error | null;
  retry: () => unknown;
  initial: Record<string, string>;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const id = useId();
  const feedback = useFeedback();
  const key = useRef(crypto.randomUUID());
  const [values, setValues] = useState({
    ptoTypeId: initial.ptoTypeId ?? "",
    startDate: initial.startDate ?? "",
    endDate: initial.endDate ?? "",
    requestUnit: initial.requestUnit ?? "DAYS",
    requestedHours: initial.requestedHours ?? "",
    hours: initial.hours ?? "",
    reasonCategory: initial.reasonCategory ?? "",
    reason: initial.reason ?? "",
    employeeSignature: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const days =
    values.startDate && values.endDate
      ? Math.round(
          (Date.parse(`${values.endDate}T12:00:00Z`) -
            Date.parse(`${values.startDate}T12:00:00Z`)) /
            86400000,
        ) + 1
      : 0;
  const durationHours =
    values.requestUnit === "DAYS"
      ? Math.max(0, days) * 8
      : Number(values.requestedHours);
  const hours = values.hours.trim() ? Number(values.hours) : durationHours;
  const available = Number(
    balances?.find((b) => b.ptoTypeId === Number(values.ptoTypeId))
      ?.availableHours ?? 0,
  );
  const change = (name: keyof typeof values, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "", hours: "" }));
    setError(null);
  };
  const fieldProps = (name: keyof typeof values) => ({
    value: values[name],
    disabled: pending,
    fullWidth: true,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => change(name, event.target.value),
    error: !!errors[name],
    helperText: errors[name],
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const invalid: Record<string, string> = {};
    if (!values.ptoTypeId) invalid.ptoTypeId = "Choose a leave type.";
    if (!values.startDate || values.startDate < businessDate())
      invalid.startDate = "Choose today or a future date.";
    if (!values.endDate || days < 1 || !Number.isFinite(days))
      invalid.endDate = "End date must be on or after start date.";
    else if (days > 366)
      invalid.endDate = "Choose a date range of up to one year.";
    if (
      values.requestUnit === "HOURS" &&
      (!values.requestedHours.trim() ||
        !validHours(Number(values.requestedHours)))
    )
      invalid.requestedHours =
        "Enter at least 0.25 hours, with up to two decimal places.";
    if (!validHours(hours))
      invalid.hours =
        "Total hours must be at least 0.25, with up to two decimal places.";
    else if (loading || !balances || balanceError)
      invalid.hours = "Wait for your balance to load, or retry below.";
    else if (hours > available)
      invalid.hours = `Only ${available} hours are available for this leave type.`;
    if (!LEAVE_REASONS.includes(values.reasonCategory))
      invalid.reasonCategory = "Choose a reason for leave.";
    if (!values.employeeSignature.trim())
      invalid.employeeSignature = "Type your full name to sign this request.";
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setPending(true);
    setError(null);
    try {
      await send("/api/pto/requests", "POST", {
        ...values,
        requestKey: key.current,
        ptoTypeId: Number(values.ptoTypeId),
        hours: values.hours.trim() ? hours : null,
        requestedHours:
          values.requestUnit === "HOURS" ? Number(values.requestedHours) : null,
        reason: values.reason.trim(),
        employeeSignature: values.employeeSignature.trim(),
      });
      await onSaved();
      feedback("Time-off request submitted.");
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught
          : new Error("Could not submit your request."),
      );
      if (caught instanceof ApiError) setErrors(caught.fields);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      aria-labelledby={`${id}-title`}
      onClose={() => {
        if (!pending) onClose();
      }}
      slotProps={{
        paper: {
          sx: { m: { xs: 2, sm: 4 }, maxHeight: "calc(100dvh - 32px)" },
        },
      }}
    >
      <Box
        component="form"
        noValidate
        onSubmit={submit}
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <DialogTitle id={`${id}-title`}>Request time off</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error.message}</Alert>}
            <TextField
              autoFocus
              select
              label="Leave type"
              required
              {...fieldProps("ptoTypeId")}
              helperText={
                errors.ptoTypeId ||
                "Choose the PTO balance to use for this request."
              }
            >
              {types.map((type) => (
                <MenuItem key={type.id} value={String(type.id)}>
                  {type.name}
                </MenuItem>
              ))}
            </TextField>
            <Box>
              <Typography id={`${id}-unit`} variant="subtitle2" sx={{ mb: 1 }}>
                Request time off in
              </Typography>
              <ToggleButtonGroup
                value={values.requestUnit}
                exclusive
                aria-labelledby={`${id}-unit`}
                disabled={pending}
                onChange={(_, unit: string | null) => {
                  if (unit) change("requestUnit", unit);
                }}
                fullWidth
                size="small"
              >
                <ToggleButton value="DAYS">Days</ToggleButton>
                <ToggleButton value="HOURS">Hours</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Start date"
                type="date"
                required
                {...fieldProps("startDate")}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: businessDate() },
                }}
              />
              <TextField
                label="End date"
                type="date"
                required
                {...fieldProps("endDate")}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: values.startDate || businessDate() },
                }}
              />
            </Stack>
            {values.requestUnit === "DAYS" ? (
              <Typography variant="body2" color="text.secondary">
                {days > 0
                  ? `${days} ${days === 1 ? "day" : "days"} selected · ${days * 8} hours`
                  : "Select your dates to calculate the duration."}{" "}
                · 8 hours per day, including weekends.
              </Typography>
            ) : (
              <TextField
                label="Hours requested"
                type="number"
                required
                {...fieldProps("requestedHours")}
                slotProps={{
                  htmlInput: { min: "0.25", max: "99999999.99", step: "0.25" },
                }}
              />
            )}
            <TextField
              label="Total hours (optional)"
              type="number"
              {...fieldProps("hours")}
              helperText={
                errors.hours ||
                `Leave blank to use ${values.requestUnit === "DAYS" ? "8 hours per selected day" : "the hours requested"}. Enter a value to override this total.`
              }
              slotProps={{
                htmlInput: { min: "0.25", max: "99999999.99", step: "0.25" },
              }}
            />
            <TextField
              select
              label="Reason for leave"
              required
              {...fieldProps("reasonCategory")}
            >
              {LEAVE_REASONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Additional details (optional)"
              multiline
              minRows={2}
              {...fieldProps("reason")}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
              <QueryState
                loading={loading}
                error={balanceError}
                retry={retry}
              />
              {balances && !balanceError && (
                <Stack spacing={0.5}>
                  <Typography role="status" variant="body2">
                    Available: {available} hours · After this request:{" "}
                    {Number(
                      (
                        available - (Number.isFinite(hours) ? hours : 0)
                      ).toFixed(2),
                    )}{" "}
                    hours
                  </Typography>
                  <Typography variant="subtitle2">
                    {Number.isFinite(hours) ? hours : 0} total hours requested
                  </Typography>
                </Stack>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Hours are reserved when submitted. Approved leave blocks shifts
              for the entire selected dates. Paid leave is excluded from pay
              estimates.
            </Typography>
            <Divider />
            <TextField
              label="Employee Signature"
              required
              {...fieldProps("employeeSignature")}
              helperText={
                errors.employeeSignature ||
                "Type your full name to confirm this time-off request."
              }
              slotProps={{ htmlInput: { maxLength: 200, autoComplete: "off" } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? "Submitting…" : "Request time off"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function validHours(hours: number) {
  return (
    Number.isFinite(hours) &&
    hours >= 0.25 &&
    hours <= 99999999.99 &&
    Math.abs(hours * 100 - Math.round(hours * 100)) < 0.000001
  );
}
