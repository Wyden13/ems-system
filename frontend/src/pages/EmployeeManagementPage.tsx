import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api, params, send } from "../api/client";
import {
  roles,
  type Account,
  type Department,
  type Employee,
  type Page,
} from "../api/types";
import FormDialog, { type Field } from "../components/management/FormDialog";
import QueryState from "../components/management/QueryState";
async function accountOptions(signal: AbortSignal) {
  const accounts: Account[] = [];
  for (let page = 0; ; page++) {
    const result = await api<Page<Account>>(
      `/api/v1/admin/accounts?page=${page}&size=100`,
      { signal },
    );
    accounts.push(...result.content);
    if (page + 1 >= result.totalPages) return accounts;
  }
}
export default function EmployeeManagementPage() {
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<{
    employee?: Employee;
    readonly?: boolean;
  } | null>(null);
  const [activation, setActivation] = useState<Employee | null>(null);
  const employees = useQuery({
    queryKey: ["employees", search, active, department, page],
    queryFn: ({ signal }) =>
      api<Page<Employee>>(
        `/api/employees?${params({ search, active, departmentId: department, page, size: 20 })}`,
        { signal },
      ),
  });
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: ({ signal }) => api<Department[]>("/api/departments", { signal }),
  });
  const accounts = useQuery({
    queryKey: ["account-options"],
    queryFn: ({ signal }) => accountOptions(signal),
    enabled: form !== null,
  });
  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const fields: Field[] = [
    {
      name: "employeeNumber",
      label: "Employee number",
      disabled: true,
      helper: form?.employee
        ? undefined
        : "Assigned in creation order when you save.",
    },
    { name: "firstName", label: "First name", required: true, maxLength: 50 },
    { name: "lastName", label: "Last name", required: true, maxLength: 50 },
    {
      name: "email",
      label: "Employee email",
      type: "email",
      required: true,
      maxLength: 320,
    },
    {
      name: "departmentId",
      label: "Department",
      required: true,
      options: [
        { value: "", label: "Choose a department" },
        ...(departments.data ?? [])
          .filter((d) => !d.archived || d.id === form?.employee?.departmentId)
          .map((d) => ({
            value: String(d.id),
            label: `${d.name}${d.archived ? " (archived)" : ""}`,
          })),
      ],
    },
    { name: "jobTitle", label: "Job title", maxLength: 100 },
    {
      name: "role",
      label: "Workforce role",
      required: true,
      options: roles.map((value) => ({ value, label: value })),
      helper: "This does not change login permissions.",
    },
    {
      name: "hireDate",
      label: "Hire date",
      type: "date",
      required: true,
      max: today,
    },
    {
      name: "payRate",
      label: "Pay rate",
      type: "number",
      min: "0",
      step: "0.01",
      required: true,
    },
    { name: "phoneNumber", label: "Phone number", maxLength: 40 },
    { name: "address", label: "Address", maxLength: 500 },
    {
      name: "birthDate",
      label: "Birth date",
      type: "date",
      max: yesterday.toLocaleDateString("en-CA"),
    },
    {
      name: "userAccountId",
      label: "Linked login account",
      options: [
        { value: "", label: "No linked account" },
        ...(accounts.data ?? []).map((a) => ({
          value: a.id,
          label: `${a.email} (${a.role}, ${a.status})`,
        })),
      ],
      helper:
        "Required for personal attendance, scheduling and PTO access. Employee activation and account status are managed separately.",
    },
  ];
  async function invalidate() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["employees"] }),
      cache.invalidateQueries({ queryKey: ["employee-summary"] }),
    ]);
  }
  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="h2">Employees</Typography>
          <Button variant="contained" onClick={() => setForm({})}>
            Add Employee
          </Button>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            size="small"
            label="Search employees"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <TextField
            size="small"
            select
            label="Status"
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
          <TextField
            size="small"
            select
            label="Department filter"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All departments</MenuItem>
            {departments.data?.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
                {d.archived ? " (archived)" : ""}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <QueryState
          loading={employees.isPending || departments.isPending}
          error={employees.error || departments.error}
          retry={() => {
            void employees.refetch();
            void departments.refetch();
          }}
        />
        {!employees.isError && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {[
                    "Number",
                    "Name",
                    "Department",
                    "Email",
                    "Status",
                    "Actions",
                  ].map((label) => (
                    <TableCell key={label}>{label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.data?.content.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.employeeNumber}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => setForm({ employee, readonly: true })}
                      >
                        {employee.firstName} {employee.lastName}
                      </Button>
                      <Typography variant="caption" sx={{ display: "block" }}>
                        {employee.jobTitle}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {departments.data?.find(
                        (d) => d.id === employee.departmentId,
                      )?.name ?? `Department #${employee.departmentId}`}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      {employee.active ? "Active" : "Inactive"}
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => setForm({ employee })}>
                        Edit
                      </Button>
                      <Button onClick={() => setActivation(employee)}>
                        {employee.active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {employees.data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      No employees match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div"
          count={employees.data?.totalElements ?? 0}
          page={page}
          rowsPerPage={20}
          rowsPerPageOptions={[20]}
          onPageChange={(_, value) => setPage(value)}
        />
      </Stack>
      {form &&
        (accounts.isPending || departments.isPending ? (
          <Alert severity="info">Loading form options…</Alert>
        ) : accounts.error || departments.error ? (
          <Alert
            severity="error"
            action={
              <Button
                onClick={() => {
                  void accounts.refetch();
                  void departments.refetch();
                }}
              >
                Retry
              </Button>
            }
          >
            Could not load form options.{" "}
            <Button onClick={() => setForm(null)}>Cancel</Button>
          </Alert>
        ) : (
          <FormDialog
            title={
              form.readonly
                ? "Employee details"
                : form.employee
                  ? "Edit employee"
                  : "Add Employee"
            }
            fields={fields}
            initial={
              form.employee
                ? Object.fromEntries(
                    Object.entries(form.employee).map(([key, value]) => [
                      key,
                      value == null ? "" : String(value),
                    ]),
                  )
                : { role: "EMPLOYEE", employeeNumber: "Assigned automatically" }
            }
            onClose={() => setForm(null)}
            onSave={
              form.readonly
                ? undefined
                : async (values) => {
                    const payload: Record<string, string | number | null> =
                      Object.fromEntries(
                        fields
                          .filter((f) => !f.disabled)
                          .map((f) => [f.name, values[f.name] || null]),
                      );
                    payload.departmentId = Number(values.departmentId);
                    await send(
                      `/api/employees${form.employee ? `/${form.employee.id}` : ""}`,
                      form.employee ? "PUT" : "POST",
                      payload,
                    );
                    await invalidate();
                  }
            }
          />
        ))}
      {activation && (
        <FormDialog
          title={`${activation.active ? "Deactivate" : "Activate"} employee`}
          fields={[]}
          initial={{}}
          notice="This changes the employee record only. The linked login account status stays unchanged."
          onClose={() => setActivation(null)}
          onSave={async () => {
            await send(
              `/api/employees/${activation.id}/${activation.active ? "deactivate" : "activate"}`,
              "POST",
            );
            await invalidate();
          }}
        />
      )}
    </Paper>
  );
}
