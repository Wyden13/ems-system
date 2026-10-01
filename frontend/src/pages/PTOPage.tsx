import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
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
import AddRounded from "@mui/icons-material/AddRounded";
import PtoSummaryCards from "../components/management/PtoSummaryCards";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/context";
import { api, send, params } from "../api/client";
import { dateTime } from "../api/attendance";
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
import TimeOffRequestDialog from "../components/management/TimeOffRequestDialog";
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
  const [requestInitial, setRequestInitial] = useState<Record<string, string> | null>(null);
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
    queryKey: ["pto", "balances", own?.id], enabled: !!own && requestInitial !== null,
    queryFn: ({ signal }) => api<Balance[]>(`/api/pto/balances/employees/${own?.id}`, { signal }),
  });
  const refresh = () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: ["pto"] }),
      cache.invalidateQueries({ queryKey: ["schedule"] }),
      cache.invalidateQueries({ queryKey: ["work-dashboard"] }),
    ]);
  function requestForm(initial: Record<string, string> = {}) {
    setRequestInitial(initial);
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
    copy: { kind: 'pto-request', label: `${r.ptoTypeName} request`, values: { ptoTypeId: String(r.ptoTypeId), startDate: r.startDate, endDate: r.endDate, hours: String(r.hours), reason: r.reason ?? '', requestUnit: r.requestUnit ?? 'HOURS', requestedHours: String(r.requestedAmount ?? r.hours), reasonCategory: r.reasonCategory ?? '' } },
    paste: { kind: 'pto-request', disabled: !types.data || !people.data, onPaste: requestForm },
    editReason: 'Submitted requests cannot be edited. Cancel the request and create a new one.',
    deleteReason: 'Use Cancel request on the row to retain request history.',
    details: () => setDetails(r),
  });
  return (
    <Stack spacing={3} {...contextMenu('Time off', [pasteAction({ kind: 'pto-request', disabled: !types.data || !people.data, onPaste: requestForm })])}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h2">{reviewer ? "Time off" : "My time off"}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Submit and track requests, approvals, and PTO balances.</Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {canDeduct && section === "requests" && <Button variant="outlined" disabled={!types.data || !people.data} onClick={deduct}>Deduct PTO</Button>}
          {own && <Button variant="contained" startIcon={<AddRounded />} disabled={!types.data || !people.data} onClick={() => requestForm()}>Request time off</Button>}
          {admin && section === "settings" && <><Button onClick={adjust}>Adjust balance</Button><Button variant="contained" onClick={() => typeForm()}>Create leave type</Button></>}
        </Stack>
      </Stack>
      {admin && <Tabs value={section} onChange={(_, value) => setSection(value)} aria-label="Time-off sections"><Tab value="requests" label="Requests and balances" /><Tab value="settings" label="Leave administration" /></Tabs>}
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
      {section === "requests" && <>
        <PtoSummaryCards
          balances={selected && !balances.error && !balances.isPending ? balances.data : undefined}
          requests={!requests.error && !requests.isPending ? requests.data : undefined}
          employeeName={people.data?.find(p => p.id === selected)?.name}
        />
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Stack spacing={2} sx={{ p: { xs: 2, sm: 2.5 }, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="h3">Time-off requests</Typography>
              <Typography variant="caption" color="text.secondary">{requests.isPending ? "Loading requests…" : `${requests.data?.length ?? 0} ${requests.data?.length === 1 ? "request" : "requests"}`}</Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                size="small"
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
                size="small"
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
            </Stack>

          </Stack>
          <Box sx={{ px: { xs: 2, sm: 2.5 } }}><QueryState loading={requests.isPending} error={requests.error} retry={requests.refetch} /></Box>
          {requests.data?.length === 0 && <Box sx={{ p: 3 }}><Typography color="text.secondary">No time-off requests match these filters.</Typography><Button onClick={() => { setEmployee(""); setStatus(""); }}>Clear filters</Button></Box>}
          {!!requests.data?.length && <Box role="table" aria-label="Time-off requests">
            <Box role="row" sx={{ display: { xs: "none", lg: "grid" }, gridTemplateColumns: "minmax(150px, 1.2fr) minmax(170px, 1.3fr) 100px 145px minmax(220px, 1.5fr)", gap: 2, px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "#FAFCFA" }}>
              {["Leave type", "Dates", "Duration", "Status", "Actions"].map(label => <Typography key={label} role="columnheader" sx={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.8px", color: "text.secondary" }}>{label}</Typography>)}
            </Box>
            {requests.data.map(r => <Box key={r.id} role="row" {...contextMenu(`${r.ptoTypeName} · ${r.startDate} – ${r.endDate}`, requestActions(r))} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr) minmax(0, 1fr)", lg: "minmax(150px, 1.2fr) minmax(170px, 1.3fr) 100px 145px minmax(220px, 1.5fr)" }, alignItems: "center", gap: { xs: 1.5, lg: 2 }, px: { xs: 2, sm: 2.5 }, py: 2.5, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 }, "&:hover": { bgcolor: "#FCFDFC" } }}>
              <Box role="cell" sx={{ gridColumn: { xs: "1 / -1", lg: "auto" }, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{r.ptoTypeName}</Typography>
                {reviewer && <Typography variant="caption" color="text.secondary">{people.data?.find(p => p.id === r.employeeId)?.name ?? `Employee ${r.employeeId}`}</Typography>}
                {r.reasonCategory && r.reasonCategory.toLowerCase() !== r.ptoTypeName.toLowerCase() && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{r.reasonCategory}</Typography>}
              </Box>
              <Box role="cell">
                <Typography variant="caption" color="text.secondary" sx={{ display: { lg: "none" } }}>Dates</Typography>
                <Typography variant="body2">{dateRange(r.startDate, r.endDate)}</Typography>
              </Box>
              <Box role="cell">
                <Typography variant="caption" color="text.secondary" sx={{ display: { lg: "none" } }}>Duration</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.requestUnit === "DAYS" && r.requestedAmount != null ? `${r.requestedAmount} ${Number(r.requestedAmount) === 1 ? "day" : "days"}` : `${r.hours} hours`}</Typography>
                {r.requestUnit === "DAYS" && <Typography variant="caption" color="text.secondary">{r.hours} PTO hours</Typography>}
              </Box>
              <Box role="cell"><Chip size="small" label={r.status === "PENDING" ? "Pending" : statusLabel(r.status)} sx={{ fontWeight: 700, px: 1, borderRadius: "999px", ...badgeStyle(r.status) }} /></Box>
              <Box role="cell" sx={{ gridColumn: { xs: "1 / -1", lg: "auto" } }}>
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
              </Box>
              {r.operationError && <Alert sx={{ gridColumn: "1 / -1" }} severity={processing(r.status) ? "info" : "warning"}>{r.operationError}</Alert>}
            </Box>)}
          </Box>}
        </Paper>
      </>}
      {details && <Dialog open fullWidth aria-labelledby="pto-history-title" onClose={() => setDetails(null)}>
        <DialogTitle id="pto-history-title">Request history and conflicts</DialogTitle>
        <DialogContent dividers><Stack spacing={2}>
          <Typography>{requestContext(details)}</Typography>
          {details.reasonCategory && <Typography>Reason for leave: {details.reasonCategory}</Typography>}
          {details.reason && <Typography>Leave reason: {details.reason}</Typography>}
          {details.comment && <Typography>Reviewer comment: {details.comment}</Typography>}
          {details.employeeSignature && <Typography>Employee Signature: {details.employeeSignature}{details.signedAt ? ` · Signed ${dateTime(details.signedAt)}` : ""}</Typography>}
          <PtoConflictSummary request={details} />
          <QueryState loading={history.isPending} error={history.error} retry={history.refetch} />
          {history.data?.length === 0 && <Typography>No history recorded yet.</Typography>}
          {history.data?.map(h => <Typography key={h.id}>{statusLabel(h.action)} · {h.reason || "No comment"} · {dateTime(h.occurredAt)} MT</Typography>)}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setDetails(null)}>Close history</Button></DialogActions>
      </Dialog>}
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
            <Typography variant="caption" color="text.secondary">Balances are allocated by an administrator. Day equivalents use 8 hours. PTO pay is excluded from gross-pay estimates.</Typography>
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
      {requestInitial !== null && <TimeOffRequestDialog
        types={types.data ?? []}
        balances={ownBalances.data}
        loading={ownBalances.isPending}
        balanceError={ownBalances.error}
        retry={ownBalances.refetch}
        initial={requestInitial}
        onClose={() => setRequestInitial(null)}
        onSaved={refresh}
      />}
      {form && (
        <FormDialog
          title={form.title}
          submitLabel={form.title.startsWith("Edit") ? form.title.replace("Edit", "Save") : form.title}
          pendingLabel="Submitting…"
          submitColor={/^(Cancel|Delete|Reject|Deduct)/.test(form.title) ? "error" : "primary"}
          cancelLabel={form.title === "Cancel time off" ? "Keep request" : "Cancel"}
          successMessage={form.title === "Deduct PTO" ? "PTO deducted. The balance and history have been updated." : "Time-off action submitted. Check the request status for completion."}
          summary={form.summary ? <Typography>{form.summary}</Typography> : undefined}
          validate={form.validate}
          renderSummary={v => form.title === "Deduct PTO" ? <PtoDeductionSummary employeeId={v.employeeId} ptoTypeId={v.ptoTypeId} hours={v.hours} /> : form.request && form.title.startsWith("Approve") ? <PtoConflictSummary request={form.request} /> : null}
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

function dateRange(start: string, end: string) {
  const format = (day: string, year = false) => new Intl.DateTimeFormat("en-CA", {
    month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
  return start === end ? format(start, true) : `${format(start, start.slice(0, 4) !== end.slice(0, 4))} – ${format(end, true)}`;
}

function badgeStyle(status: string) {
  if (status === "APPROVED") return { bgcolor: "#E8F5EB", color: "#28763F" };
  if (["PENDING", "APPROVING", "CANCELLING"].includes(status)) return { bgcolor: "#FFF3DF", color: "#966411" };
  if (status === "REJECTED") return { bgcolor: "#FDEDEB", color: "#B34940" };
  return { bgcolor: "#EEF0F4", color: "#596273" };
}
