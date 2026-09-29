import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../auth/context";
import { api, send, params } from "../api/client";
import { businessDate } from "../api/attendance";
import {
  processing,
  statusLabel,
  type Balance,
  type LeaveRequest,
  type PtoType,
  type WorkforcePerson,
} from "../api/workflows";
import FormDialog, { type Field } from "../components/management/FormDialog";
import QueryState from "../components/management/QueryState";
type Form = {
  title: string;
  fields: Field[];
  initial: Record<string, string>;
  notice?: string;
  save: (v: Record<string, string>) => Promise<unknown>;
};
export default function PTOPage() {
  const { account } = useAuth();
  const cache = useQueryClient();
  const admin = account?.role === "ADMIN",
    reviewer = account?.role !== "EMPLOYEE";
  const [employee, setEmployee] = useState("");
  const [status, setStatus] = useState("");
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
  const conflicts = useQuery({
    queryKey: ["pto", "conflicts", details?.id],
    enabled: !!details && details.status === "PENDING",
    queryFn: ({ signal }) =>
      api<{ shiftIds: number[] }>(
        `/api/pto/requests/${details?.id}/conflicts`,
        { signal },
      ),
  });
  const refresh = () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: ["pto"] }),
      cache.invalidateQueries({ queryKey: ["schedule"] }),
      cache.invalidateQueries({ queryKey: ["work-dashboard"] }),
    ]);
  function requestForm() {
    const key = crypto.randomUUID();
    setForm({
      title: "Request time off",
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
      ],
      initial: {},
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
      title: decision === "APPROVED" ? "Approve PTO" : "Reject PTO",
      notice:
        "Approval checks for conflicting shift assignments. Cancel those assignments before approving.",
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
  return (
    <Stack spacing={2}>
      <Typography variant="h2">Paid Time Off</Typography>
      <Alert severity="info">
        PTO balances are allocated by an administrator. Gross-pay estimates
        include approved worked time only.
      </Alert>
      <Stack direction="row" spacing={1}>
        {own && (
          <Button variant="contained" onClick={requestForm}>
            Request time off
          </Button>
        )}
        {admin && (
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
      <Stack direction="row" spacing={2}>
        <TextField
          select
          label="Employee filter"
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
          sx={{ minWidth: 230 }}
        >
          <MenuItem value="">All permitted employees</MenuItem>
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
          sx={{ minWidth: 190 }}
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
      {selected && (
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
      <QueryState
        loading={requests.isPending}
        error={requests.error}
        retry={requests.refetch}
      />
      {requests.data?.length === 0 && (
        <Alert severity="info">No time-off requests match these filters.</Alert>
      )}
      {requests.data?.map((r) => (
        <Paper key={r.id} sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={2}>
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
            {r.comment && <Typography>{r.comment}</Typography>}
            {r.operationError && (
              <Alert severity={processing(r.status) ? "info" : "warning"}>
                {r.operationError}
              </Alert>
            )}
            <Stack direction="row" spacing={1}>
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
                  onClick={() =>
                    setForm({
                      title: "Cancel PTO",
                      fields: [
                        {
                          name: "reason",
                          label: "Reason",
                          required: true,
                          maxLength: 500,
                        },
                      ],
                      initial: {},
                      save: (v) =>
                        send(`/api/pto/requests/${r.id}/cancel`, "POST", {
                          ...v,
                          version: r.version,
                        }),
                    })
                  }
                >
                  Cancel request
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      ))}
      {details && (
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="h3">Request {details.id} history</Typography>
            <QueryState
              loading={history.isPending}
              error={history.error ?? conflicts.error}
              retry={() => {
                void history.refetch();
                void conflicts.refetch();
              }}
            />
            {conflicts.data && (
              <Alert
                severity={conflicts.data.shiftIds.length ? "warning" : "info"}
              >
                {conflicts.data.shiftIds.length
                  ? `Conflicting shifts: ${conflicts.data.shiftIds.join(", ")}. Remove these assignments before approval.`
                  : "No conflicting shift assignments."}
              </Alert>
            )}
            {history.data?.map((h) => (
              <Typography key={h.id}>
                {h.action} · {h.reason} ·{" "}
                {new Date(h.occurredAt).toLocaleString()}
              </Typography>
            ))}
            <Button onClick={() => setDetails(null)}>Close history</Button>
          </Stack>
        </Paper>
      )}
      {selected && (
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
      {admin && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h3">Leave types</Typography>
          {types.data?.map((t) => (
            <Stack key={t.id} direction="row">
              <Typography sx={{ flex: 1 }}>
                {t.name} · {t.paid ? "Paid" : "Unpaid"}
              </Typography>
              <Button onClick={() => typeForm(t)}>Edit</Button>
              <Button
                onClick={() =>
                  setForm({
                    title: "Delete unused leave type",
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
