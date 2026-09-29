import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api, params, send } from "../api/client";
import { roles, statuses, type Account, type Page } from "../api/types";
import FormDialog from "../components/management/FormDialog";
import QueryState from "../components/management/QueryState";
import { useAuth } from "../auth/context";
export default function AccountsPage() {
  const { account: current } = useAuth();
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<{
    kind: "create" | "role" | "status" | "details";
    account?: Account;
  } | null>(null);
  const accounts = useQuery({
    queryKey: ["accounts", search, role, status, page],
    queryFn: ({ signal }) =>
      api<Page<Account>>(
        `/api/v1/admin/accounts?${params({ search, role, status, page, size: 20 })}`,
        { signal },
      ),
  });
  const selected = form?.account;
  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
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
                {r}
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
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <QueryState
          loading={accounts.isPending}
          error={accounts.error}
          retry={accounts.refetch}
        />
        <Table>
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
              <TableRow key={account.id}>
                <TableCell>
                  <Button onClick={() => setForm({ kind: "details", account })}>
                    {account.email}
                  </Button>
                </TableCell>
                <TableCell>{account.role}</TableCell>
                <TableCell>{account.status}</TableCell>
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
                  No accounts match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
                    options: roles.map((value) => ({ value, label: value })),
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
                        (value) => ({ value, label: value }),
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
              : { role: "EMPLOYEE" }
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
                  ]);
                }
          }
        />
      )}
    </Paper>
  );
}
