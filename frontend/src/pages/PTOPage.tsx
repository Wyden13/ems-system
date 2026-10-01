import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/context";
import { api, send, params } from "../api/client";
import { businessDate, dateTime } from "../api/attendance";
import {
  processing,
  statusLabel,
  type Balance,
  type LeaveRequest,
  type PtoType,
  type WorkforcePerson,
} from "../api/workflows";
import FormDialog, { type Field } from "../components/management/FormDialog";
import PtoConflictSummary from "../components/management/PtoConflictSummary";
import PtoDeductionSummary from "../components/management/PtoDeductionSummary";
import QueryState from "../components/management/QueryState";
import { useObjectContextMenu, type ContextAction } from "../components/context-menu/context";
import { useObjectControls } from "../components/context-menu/objectControls";
type Form = {
  title: string;
  fields: Field[];
  initial: Record<string, string>;
  notice?: string;
  summary?: string;
  request?: LeaveRequest;
  validate?: (values: Record<string, string>) => Record<string, string>;
  save: (v: Record<string, string>) => Promise<unknown>;
};
export default function PTOPage() {
  const contextMenu = useObjectContextMenu();
  const { objectActions, pasteAction } = useObjectControls();
  const { account } = useAuth();
  const cache = useQueryClient();
  const admin = account?.role === "ADMIN",
    reviewer = account?.role !== "EMPLOYEE";
  const canDeduct = admin || account?.role === "MANAGER";
  const [section, setSection] = useState("requests");
  const [employee, setEmployee] = useState("");
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") === "PENDING" ? "PENDING" : "");
  const [form, setForm] = useState<Form | null>(null);
  const [details, setDetails] = useState<LeaveRequest | null>(null);
  const people = useQuery({
    queryKey: ["pto", "people"],
    queryFn: ({ signal }) =>
      api<WorkforcePerson[]>("/api/pto/people", { signal }),
  });
  const types = useQuery({
    queryKey: ["pto", "types"],
    queryFn: ({ signal }) => api<PtoType[]>("/api/pto/types", { signal }),
  });
  const own = people.data?.find((p) => p.self);
  const selected = employee ? Number(employee) : own?.id;
  const requests = useQuery({
    queryKey: ["pto", "requests", employee, status],
    queryFn: ({ signal }) =>
      api<LeaveRequest[]>(
        `/api/pto/requests?${params({ employeeId: employee, status })}`,
        { signal },
      ),
    refetchInterval: (q) =>
      q.state.data?.some((r) => processing(r.status)) ? 5000 : false,
  });
  const balances = useQuery({
    queryKey: ["pto", "balances", selected],
    enabled: !!selected,
    queryFn: ({ signal }) =>
      api<Balance[]>(`/api/pto/balances/employees/${selected}`, { signal }),
    refetchInterval: requests.data?.some((r) => processing(r.status))
      ? 5000
      : false,
  });
  const ledger = useQuery({
    queryKey: ["pto", "ledger", selected],
    enabled: !!selected,
    queryFn: ({ signal }) =>
      api<
        {
          id: number;
          entryType: string;
          hoursDelta: number;
          reason: string;
          ptoTypeName: string;
        }[]
      >(`/api/pto/ledger/${selected}`, { signal }),
  });
  const history = useQuery({
    queryKey: ["pto", "history", details?.id],
    enabled: !!details,
    queryFn: ({ signal }) =>
      api<
        {
          id: number;
          action: string;
          reason: string;
          actor: string;
          occurredAt: string;
        }[]
      >(`/api/pto/requests/${details?.id}/history`, { signal }),
  });
  const ownBalances = useQuery({
    queryKey: ["pto", "balances", own?.id], enabled: !!own && form?.title === "Request time off",
    queryFn: ({ signal }) => api<Balance[]>(`/api/pto/balances/employees/${own?.id}`, { signal }),
  });
  const refresh = () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: ["pto"] }),
      cache.invalidateQueries({ queryKey: ["schedule"] }),
      cache.invalidateQueries({ queryKey: ["work-dashboard"] }),
    ]);
  function requestForm(initial: Record<string, string> = {}) {
    const key = crypto.randomUUID();
    setForm({
      title: "Request time off",
      validate: v => {
        const errors: Record<string, string> = {};
        if (v.endDate < v.startDate) errors.endDate = "End date must be on or after start date.";
        return errors;
      },
      notice:
        "Hours are entered explicitly and reserved immediately. Approved date-based leave blocks assignments on the entire selected local dates. Paid leave is not included in gross-pay estimates yet.",
      fields: [
        {
          name: "ptoTypeId",
          label: "Leave type",
          required: true,
          options: (types.data ?? []).map((t) => ({
            value: String(t.id),
            label: t.name,
          })),
        },
        {
          name: "startDate",
          label: "Start date",
          type: "date",
          min: businessDate(),
          required: true,
        },
        {
          name: "endDate",
          label: "End date",
          type: "date",
          min: businessDate(),
          required: true,
        },
        {
          name: "hours",
          label: "Hours",
          type: "number",
          min: "0.25",
          step: "0.25",
          required: true,
        },
        { name: "reason", label: "Leave reason", required: true, maxLength: 500 },
      ],
      initial,
      save: (v) =>
        send("/api/pto/requests", "POST", {
          ...v,
          requestKey: key,
          ptoTypeId: Number(v.ptoTypeId),
          hours: Number(v.hours),
        }),
    });
  }
  function typeForm(t?: PtoType) {
    setForm({
      title: t ? "Edit leave type" : "Create leave type",
      fields: [
        { name: "name", label: "Type name", required: true, maxLength: 100 },
        {
          name: "paid",
          label: "Paid leave",
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ],
        },
      ],
      initial: t ? { name: t.name, paid: String(t.paid) } : { paid: "true" },
      notice:
        "Balances are allocated manually. This label does not add PTO pay to estimates.",
      save: (v) =>
        send(
          t ? `/api/pto/types/${t.id}` : "/api/pto/types",
          t ? "PUT" : "POST",
          {
            name: v.name,
            paid: v.paid === "true",
            accrualRatePerPeriod: 0,
            maxCarryover: 0,
          },
        ),
    });
  }
  function adjust() {
    const key = crypto.randomUUID();
    setForm({
      title: "Adjust PTO balance",
      notice:
        "Use positive hours for an opening allocation or credit; negative hours for a reduction. Every adjustment is audited.",
      fields: [
        {
          name: "employeeId",
          label: "Employee",
          required: true,
          options: (people.data ?? []).map((p) => ({
            value: String(p.id),
            label: p.name,
          })),
        },
        {
          name: "ptoTypeId",
          label: "Leave type",
          required: true,
          options: (types.data ?? []).map((t) => ({
            value: String(t.id),
            label: t.name,
          })),
        },
        {
          name: "hoursDelta",
          label: "Hours adjustment",
          type: "number",
          step: "0.25",
          required: true,
        },
        { name: "reason", label: "Reason", required: true, maxLength: 500 },
      ],
      initial: { employeeId: selected ? String(selected) : "" },
      save: (v) =>
        send("/api/pto/balances/adjust", "POST", {
          ...v,
          requestKey: key,
          employeeId: Number(v.employeeId),
          ptoTypeId: Number(v.ptoTypeId),
          hoursDelta: Number(v.hoursDelta),
        }),
    });
  }
  function decision(r: LeaveRequest, decision: string) {
    setForm({
      title: decision === "APPROVED" ? "Approve time off" : "Reject time off",
      request: r,
      summary: requestContext(r),
      notice:
        "Approval reserves the selected dates against new assignments. Review any conflicting assignments below before approving.",
      fields: [{ name: "comment", label: "Comment", maxLength: 500 }],
      initial: {},
      save: async (v) => {
        try {
          return await send(`/api/pto/requests/${r.id}/decision`, "POST", {
            ...v,
            version: r.version,
            decision,
          });
        } finally {
          await refresh();
        }
      },
    });
  }
  function deduct() {
    const key = crypto.randomUUID();
    setForm({
      title: "Deduct PTO",
      notice: "Enter the hours to subtract from the employee’s available PTO. The deduction and your reason will appear in balance history.",
      fields: [
        { name: "employeeId", label: "Employee", required: true, options: (people.data ?? []).map(p => ({ value: String(p.id), label: p.name })) },
        { name: "ptoTypeId", label: "Leave type", required: true, options: (types.data ?? []).map(t => ({ value: String(t.id), label: t.name })) },
        { name: "hours", label: "Hours to deduct", type: "number", min: "0.25", step: "0.25", required: true },
        { name: "reason", label: "Deduction reason", required: true, maxLength: 500 },
      ],
      initial: { employeeId: selected ? String(selected) : "" },
      validate: v => {
        const errors: Record<string, string> = {};
        if (!Number.isFinite(Number(v.hours)) || Number(v.hours) <= 0) errors.hours = "Enter a positive number of hours to deduct.";
        if (!v.reason?.trim()) errors.reason = "Enter a reason for this deduction.";
        return errors;
      },
      save: async v => {
        await send("/api/pto/balances/deduct", "POST", {
          requestKey: key, employeeId: Number(v.employeeId), ptoTypeId: Number(v.ptoTypeId),
          hours: Number(v.hours), reason: v.reason.trim(),
        });
        setEmployee(v.employeeId);
      },
    });
  }
  const requestContext = (r: LeaveRequest) => `${people.data?.find(p => p.id === r.employeeId)?.name ?? "Employee"} · ${r.ptoTypeName} · ${r.startDate} – ${r.endDate} · ${r.hours} hours`;
  const cancelRequest = (r: LeaveRequest) => setForm({
    title: 'Cancel time off', summary: requestContext(r),
    fields: [{ name: 'reason', label: 'Reason', required: true, maxLength: 500 }],
    initial: {},
    save: v => send(`/api/pto/requests/${r.id}/cancel`, 'POST', { ...v, version: r.version }),
  });
  const requestActions = (r: LeaveRequest): ContextAction[] => objectActions({
    copy: { kind: 'pto-request', label: `${r.ptoTypeName} request`, values: { ptoTypeId: String(r.ptoTypeId), startDate: r.startDate, endDate: r.endDate, hours: String(r.hours), reason: r.reason ?? '' } },
    paste: { kind: 'pto-request', disabled: !types.data || !people.data, onPaste: requestForm },
    editReason: 'Submitted requests cannot be edited. Cancel the request and create a new one.',
    deleteReason: 'Use Cancel request on the card to retain request history.',
    details: () => setDetails(r),
  });
  return (
    <Stack spacing={3} {...contextMenu('Time off', [pasteAction({ kind: 'pto-request', disabled: !types.data || !people.data, onPaste: requestForm })])}>
      <Typography variant="h2">Time off</Typography>
      {admin && <Tabs value={section} onChange={(_, value) => setSection(value)} aria-label="Time-off sections"><Tab value="requests" label="Requests and balances" /><Tab value="settings" label="Leave administration" /></Tabs>}
      <Alert severity="info">
        PTO balances are allocated by an administrator. Gross-pay estimates
        include approved worked time only.
      </Alert>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {own && (
          <Button variant="contained" disabled={!types.data || !people.data} onClick={() => requestForm()}>
            Request time off
          </Button>
        )}
        {canDeduct && section === "requests" && <Button disabled={!types.data || !people.data} onClick={deduct}>Deduct PTO</Button>}
        {admin && section === "settings" && (
          <>
            <Button onClick={adjust}>Adjust balance</Button>
            <Button onClick={() => typeForm()}>Create leave type</Button>
          </>
        )}
      </Stack>
      <QueryState
        loading={people.isPending || types.isPending}
        error={people.error ?? types.error}
        retry={() => {
          void people.refetch();
          void types.refetch();
        }}
      />
      {!own && people.data && (
        <Alert severity="info">
          Your login has no linked employee profile. An administrator can link
          it under Employees → Linked login account. You can still perform
          permitted management actions.
        </Alert>
      )}
      {section === "requests" && <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          label="Employee filter"
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
          sx={{ minWidth: { xs: 0, sm: 230 }, width: { xs: "100%", sm: "auto" } }}
        >
          <MenuItem value="">All employees you can view</MenuItem>
          {people.data?.map((p) => (
            <MenuItem key={p.id} value={String(p.id)}>
              {p.name}
              {p.self ? " (you)" : ""}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Request status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: { xs: 0, sm: 190 }, width: { xs: "100%", sm: "auto" } }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {[
            "PENDING",
            "APPROVING",
            "APPROVED",
            "REJECTED",
            "CANCELLING",
            "CANCELLED",
          ].map((s) => (
            <MenuItem key={s} value={s}>
              {statusLabel(s)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>}
      {section === "requests" && selected && (
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="h3">
              PTO balances — {people.data?.find((p) => p.id === selected)?.name}
            </Typography>
            <QueryState
              loading={balances.isPending}
              error={balances.error}
              retry={balances.refetch}
            />
            {balances.data?.length === 0 && (
              <Typography>
                No allocation yet. Ask an administrator to add an opening
                balance.
              </Typography>
            )}
            {balances.data?.map((b) => (
              <Typography key={b.id}>
                {b.ptoTypeName}: {b.availableHours} available ·{" "}
                {b.reservedHours} reserved · {b.usedHours} used ·{" "}
                {b.accruedHours} allocated hours
              </Typography>
            ))}
          </Stack>
        </Paper>
      )}
      {section === "requests" && <QueryState
        loading={requests.isPending}
        error={requests.error}
        retry={requests.refetch}
      />}
      {section === "requests" && requests.data?.length === 0 && (
        <Alert severity="info">No time-off requests match these filters. <Button onClick={() => { setEmployee(""); setStatus(""); }}>Clear filters</Button></Alert>
      )}
      {section === "requests" && requests.data?.map((r) => (
        <Paper key={r.id} sx={{ p: 2 }} {...contextMenu(`${r.ptoTypeName} · ${r.startDate} – ${r.endDate}`, requestActions(r))}>
          <Stack spacing={1}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Typography variant="h3">
                {people.data?.find((p) => p.id === r.employeeId)?.name ??
                  `Employee ${r.employeeId}`}{" "}
                · {r.ptoTypeName}
              </Typography>
              <Chip label={statusLabel(r.status)} />
            </Stack>
            <Typography>
              {r.startDate} – {r.endDate} · {r.hours} hours
            </Typography>
            {r.reason && <Typography>Leave reason: {r.reason}</Typography>}
            {r.comment && <Typography>{r.comment}</Typography>}
            {r.operationError && (
              <Alert severity={processing(r.status) ? "info" : "warning"}>
                {r.operationError}
              </Alert>
            )}
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Button
                onClick={() => setDetails(details?.id === r.id ? null : r)}
              >
                History and conflicts
              </Button>
              {reviewer &&
                r.employeeId !== own?.id &&
                r.status === "PENDING" && (
                  <>
                    <Button onClick={() => decision(r, "APPROVED")}>
                      Approve
                    </Button>
                    <Button onClick={() => decision(r, "REJECTED")}>
                      Reject
                    </Button>
                  </>
                )}
              {["PENDING", "APPROVED"].includes(r.status) && (
                <Button
                  color="error"
                  onClick={() => cancelRequest(r)}
                >
                  Cancel request
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      ))}
      {details && <Dialog open fullWidth aria-labelledby="pto-history-title" onClose={() => setDetails(null)}>
        <DialogTitle id="pto-history-title">Request history and conflicts</DialogTitle>
        <DialogContent dividers><Stack spacing={2}>
          <Typography>{requestContext(details)}</Typography>
          {details.reason && <Typography>Leave reason: {details.reason}</Typography>}
          <PtoConflictSummary request={details} />
          <QueryState loading={history.isPending} error={history.error} retry={history.refetch} />
          {history.data?.length === 0 && <Typography>No history recorded yet.</Typography>}
          {history.data?.map(h => <Typography key={h.id}>{statusLabel(h.action)} · {h.reason || "No comment"} · {dateTime(h.occurredAt)} MT</Typography>)}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setDetails(null)}>Close history</Button></DialogActions>
      </Dialog>}
      {section === "requests" && selected && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h3">Balance history</Typography>
          <QueryState
            loading={ledger.isPending}
            error={ledger.error}
            retry={ledger.refetch}
          />
          {ledger.data?.map((l) => (
            <Typography key={l.id}>
              {l.ptoTypeName}: {l.hoursDelta} hours · {l.entryType} · {l.reason}
            </Typography>
          ))}
        </Paper>
      )}
      {admin && section === "settings" && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h3">Leave types</Typography>
          {types.data?.map((t) => (
            <Stack key={t.id} direction={{ xs: "column", sm: "row" }}>
              <Typography sx={{ flex: 1 }}>
                {t.name} · {t.paid ? "Paid" : "Unpaid"}
              </Typography>
              <Button onClick={() => typeForm(t)}>Edit</Button>
              <Button
                onClick={() =>
                  setForm({
                    title: "Delete unused leave type",
                    summary: t.name,
                    fields: [],
                    initial: {},
                    notice:
                      "Types with balances or requests cannot be deleted.",
                    save: () => send(`/api/pto/types/${t.id}`, "DELETE"),
                  })
                }
              >
                Delete
              </Button>
            </Stack>
          ))}
        </Paper>
      )}
      {form && (
        <FormDialog
          title={form.title}
          submitLabel={form.title.startsWith("Edit") ? form.title.replace("Edit", "Save") : form.title}
          pendingLabel="Submitting…"
          submitColor={/^(Cancel|Delete|Reject|Deduct)/.test(form.title) ? "error" : "primary"}
          cancelLabel={form.title === "Cancel time off" ? "Keep request" : "Cancel"}
          successMessage={form.title === "Deduct PTO" ? "PTO deducted. The balance and history have been updated." : "Time-off action submitted. Check the request status for completion."}
          summary={form.summary ? <Typography>{form.summary}</Typography> : undefined}
          validate={v => {
            const errors = { ...form.validate?.(v) };
            if (form.title === "Request time off") {
              const available = ownBalances.data?.find(b => b.ptoTypeId === Number(v.ptoTypeId))?.availableHours ?? 0;
              if (!ownBalances.data) errors.hours = "Wait for your balance to load, or retry below.";
              else if (Number(v.hours) > available) errors.hours = `Only ${available} hours are available for this leave type.`;
            }
            return errors;
          }}
          renderSummary={v => form.title === "Request time off" ? <Stack spacing={2}>
            <QueryState loading={ownBalances.isPending} error={ownBalances.error} retry={ownBalances.refetch} />
            {ownBalances.data && <Typography role="status">Available: {ownBalances.data.find(b => b.ptoTypeId === Number(v.ptoTypeId))?.availableHours ?? 0} hours · After this request: {Number(((ownBalances.data.find(b => b.ptoTypeId === Number(v.ptoTypeId))?.availableHours ?? 0) - (Number(v.hours) || 0)).toFixed(2))} hours</Typography>}
            {v.startDate && v.endDate && <Typography>{v.startDate} – {v.endDate} · {v.hours || "0"} hours requested</Typography>}
            <Typography variant="body2">Approved leave blocks assignments for the entire selected dates. Requested hours are entered manually; paid leave is excluded from pay estimates.</Typography>
          </Stack> : form.title === "Deduct PTO" ? <PtoDeductionSummary employeeId={v.employeeId} ptoTypeId={v.ptoTypeId} hours={v.hours} /> : form.request && form.title.startsWith("Approve") ? <PtoConflictSummary request={form.request} /> : null}
          fields={form.fields}
          initial={form.initial}
          notice={form.notice}
          onClose={() => setForm(null)}
          onSave={async (v) => {
            await form.save(v);
            await refresh();
          }}
        />
      )}
    </Stack>
  );
}
