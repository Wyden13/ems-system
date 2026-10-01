import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableContainer,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api, params, send } from "../api/client";
import { roles, statuses, type Account, type Page } from "../api/types";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { statusLabel } from "../api/workflows";
import FormDialog from "../components/management/FormDialog";
import QueryState from "../components/management/QueryState";
import { useAuth } from "../auth/context";
import { useObjectContextMenu } from "../components/context-menu/context";
import { useObjectControls } from "../components/context-menu/objectControls";
export default function AccountsPage() {
  const contextMenu = useObjectContextMenu();
  const { objectActions, pasteAction } = useObjectControls();
  const { account: current } = useAuth();
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<{
    kind: "create" | "role" | "status" | "details";
    account?: Account;
    initial?: Record<string, string>;
  } | null>(null);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const accounts = useQuery<Page<Account>>({
    placeholderData: (previous, query) =>
      query?.queryKey[1] === current?.id && query?.queryKey[2] === current?.role
        ? previous
        : undefined,
    queryKey: [
      "accounts",
      current?.id,
      current?.role,
      term,
      role,
      status,
      page,
    ],
    queryFn: ({ signal }) =>
      api<Page<Account>>(
        `/api/v1/admin/accounts?${params({ search: term, role, status, page, size: 20 })}`,
        { signal },
      ),
  });
  const selected = form?.account;
  const pasteAccount = (values: Record<string, string>) =>
    setForm({ kind: "create", initial: { role: values.role || "EMPLOYEE" } });
  return (
    <Paper
      sx={{ p: { xs: 2, sm: 3 } }}
      {...contextMenu("Accounts", [
        pasteAction({ kind: "account", onPaste: pasteAccount }),
      ])}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between" }}
        >
          <Typography variant="h2">Accounts</Typography>
          <Button
            variant="contained"
            onClick={() => setForm({ kind: "create" })}
          >
            Add account
          </Button>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            size="small"
            label="Search account email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <TextField
            size="small"
            select
            label="Access role filter"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All roles</MenuItem>
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {statusLabel(r)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            select
            label="Account status filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {statuses.map((s) => (
              <MenuItem key={s} value={s}>
                {statusLabel(s)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        {((accounts.isFetching && !accounts.isPending) || search !== term) && (
          <Typography variant="body2" role="status">
            Updating accounts…
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Login permissions and account status are separate from employee
          records. You cannot change your own role or status here.
        </Typography>
        <QueryState
          loading={accounts.isPending}
          error={accounts.error}
          retry={accounts.refetch}
        />
        <TableContainer
          tabIndex={0}
          role="region"
          aria-label="Account records — scroll horizontally for more columns"
        >
          <Table aria-label="Login accounts">
            <TableHead>
              <TableRow>
                {["Email", "Access role", "Account status", "Actions"].map(
                  (label) => (
                    <TableCell key={label}>{label}</TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.data?.content.map((account) => (
                <TableRow
                  key={account.id}
                  {...contextMenu(
                    account.email,
                    objectActions({
                      copy: {
                        kind: "account",
                        label: account.email,
                        values: { email: account.email, role: account.role },
                      },
                      paste: { kind: "account", onPaste: pasteAccount },
                      edit:
                        account.id !== current?.id
                          ? () => setEditAccount(account)
                          : undefined,
                      editReason:
                        "You cannot change your own role or status here.",
                      details: () => setForm({ kind: "details", account }),
                      deleteReason:
                        "Accounts can be disabled using Change status.",
                    }),
                  )}
                >
                  <TableCell>
                    <Button
                      onClick={() => setForm({ kind: "details", account })}
                    >
                      {account.email}
                    </Button>
                  </TableCell>
                  <TableCell>{statusLabel(account.role)}</TableCell>
                  <TableCell>{statusLabel(account.status)}</TableCell>
                  <TableCell>
                    <Button
                      disabled={account.id === current?.id}
                      onClick={() => setForm({ kind: "role", account })}
                    >
                      Change role
                    </Button>
                    <Button
                      disabled={account.id === current?.id}
                      onClick={() => setForm({ kind: "status", account })}
                    >
                      Change status
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {accounts.data?.content.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    No accounts match your filters.{" "}
                    <Button
                      onClick={() => {
                        setSearch("");
                        setRole("");
                        setStatus("");
                        setPage(0);
                      }}
                    >
                      Clear filters
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={accounts.data?.totalElements ?? 0}
          page={page}
          rowsPerPage={20}
          rowsPerPageOptions={[20]}
          onPageChange={(_, value) => setPage(value)}
        />
      </Stack>
      {form && (
        <FormDialog
          submitLabel={
            form.kind === "create"
              ? "Create account"
              : form.kind === "role"
                ? "Change role"
                : "Change status"
          }
          summary={
            selected ? (
              <Typography>
                {selected.email} · {statusLabel(selected.role)} ·{" "}
                {statusLabel(selected.status)}
              </Typography>
            ) : undefined
          }
          successMessage={
            form.kind === "create"
              ? "Login account created. Link it to an employee under Employees for personal workforce access."
              : "Account updated."
          }
          title={
            form.kind === "create"
              ? "Add account"
              : form.kind === "details"
                ? "Account details"
                : `Change account ${form.kind}`
          }
          notice={
            form.kind === "role" || form.kind === "status"
              ? "Refresh sessions are revoked. Existing access tokens expire within 15 minutes. The employee record is unchanged."
              : form.initial
                ? "Enter a unique email and a new password for the copied access role."
                : undefined
          }
          fields={
            form.kind === "create"
              ? [
                  {
                    name: "email",
                    label: "Email",
                    type: "email",
                    required: true,
                  },
                  {
                    name: "password",
                    label: "Initial password",
                    type: "password",
                    required: true,
                    maxLength: 72,
                    helper: "8–72 characters",
                  },
                  {
                    name: "role",
                    label: "Access role",
                    required: true,
                    options: roles.map((value) => ({
                      value,
                      label: statusLabel(value),
                    })),
                  },
                ]
              : form.kind === "details"
                ? [
                    "id",
                    "email",
                    "role",
                    "status",
                    "createdAt",
                    "updatedAt",
                    "lastLoginAt",
                  ].map((name) => ({ name, label: name }))
                : [
                    {
                      name: form.kind,
                      label:
                        form.kind === "role" ? "Access role" : "Account status",
                      options: (form.kind === "role" ? roles : statuses).map(
                        (value) => ({ value, label: statusLabel(value) }),
                      ),
                    },
                  ]
          }
          initial={
            selected
              ? Object.fromEntries(
                  Object.entries(selected).map(([key, value]) => [
                    key,
                    value == null ? "" : String(value),
                  ]),
                )
              : { role: "EMPLOYEE", ...form.initial }
          }
          onClose={() => setForm(null)}
          onSave={
            form.kind === "details"
              ? undefined
              : async (values) => {
                  await send(
                    `/api/v1/admin/accounts${selected ? `/${selected.id}/${form.kind}` : ""}`,
                    selected ? "PATCH" : "POST",
                    selected
                      ? { [form.kind]: values[form.kind] }
                      : {
                          email: values.email,
                          password: values.password,
                          role: values.role,
                        },
                  );
                  await Promise.all([
                    cache.invalidateQueries({ queryKey: ["accounts"] }),
                    cache.invalidateQueries({ queryKey: ["account-options"] }),
                    cache.invalidateQueries({ queryKey: ["account-option"] }),
                  ]);
                }
          }
        />
      )}
      <Dialog
        open={!!editAccount}
        onClose={() => setEditAccount(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="edit-account-title"
      >
        <DialogTitle id="edit-account-title">Edit account</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{editAccount?.email}</Typography>
          <Stack spacing={1}>
            <Button
              variant="outlined"
              onClick={() => {
                if (editAccount)
                  setForm({ kind: "role", account: editAccount });
                setEditAccount(null);
              }}
            >
              Change role
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                if (editAccount)
                  setForm({ kind: "status", account: editAccount });
                setEditAccount(null);
              }}
            >
              Change status
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAccount(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
