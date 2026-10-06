import { StatusGroups } from "../components/ui/StatusGroups";
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
  type Department,
  type Employee,
  type Page,
} from "../api/types";
import FormDialog, { type Field } from "../components/management/FormDialog";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { useAuth } from "../auth/context";
import { statusLabel } from "../api/workflows";
import { businessDate, addDays } from "../api/attendance";
import QueryState from "../components/management/QueryState";
import { useObjectContextMenu } from "../components/context-menu/context";
import { useObjectControls } from "../components/context-menu/objectControls";
export default function EmployeeManagementPage() {
  const contextMenu = useObjectContextMenu();
  const { objectActions, pasteAction } = useObjectControls();
  const cache = useQueryClient();
  const { account } = useAuth();
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search);
  const [jobTitle, setJobTitle] = useState("");
  const jobTitleTerm = useDebouncedValue(jobTitle.trim());
  const [active, setActive] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<{
    employee?: Employee;
    readonly?: boolean;
    initial?: Record<string, string>;
  } | null>(null);
  const [activation, setActivation] = useState<Employee | null>(null);
  const employees = useQuery<Page<Employee>>({
    placeholderData: (previous, query) => query?.queryKey[1] === account?.id && query?.queryKey[2] === account?.role ? previous : undefined,
    queryKey: ["employees", account?.id, account?.role, term, active, department, jobTitleTerm, page],
    queryFn: ({ signal }) =>
      api<Page<Employee>>(
        `/api/employees?${params({ search: term, active, departmentId: department, jobTitle: jobTitleTerm, page, size: 20 })}`,
        { signal },
      ),
  });
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: ({ signal }) => api<Department[]>("/api/departments", { signal }),
  });
  const today = businessDate();
  const yesterday = addDays(today, -1);
  const fields: Field[] = [
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
      options: roles.map((value) => ({ value, label: statusLabel(value) })),
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
      label: "Hourly pay (CAD)",
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
      max: yesterday,
    },
    {
      name: "userAccountId",
      label: "Linked login account",
      type: "account",
      helper:
        "Link a login account so this employee can use attendance, schedule and time off. Employee status and login access are managed separately.",
    },
  ].map(field => ({ ...field, section: ["firstName", "lastName", "email"].includes(field.name) ? "Identity" : field.name === "userAccountId" ? "Login access" : ["phoneNumber", "address", "birthDate"].includes(field.name) ? "Optional personal details" : "Employment", optionalSection: ["phoneNumber", "address", "birthDate"].includes(field.name) })) as Field[];
  async function invalidate() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["employees"] }),
      cache.invalidateQueries({ queryKey: ["employee-summary"] }),
    ]);
  }
  const pasteEmployee = (values: Record<string, string>) => setForm({ initial: {
    ...Object.fromEntries(fields.filter(f => f.name !== 'userAccountId').map(f => [f.name, values[f.name] ?? ''])),
    role: values.role || 'EMPLOYEE', email: '', userAccountId: '',
  } });
  const employeeTemplate = (employee: Employee) => Object.fromEntries(fields.filter(f => f.name !== 'userAccountId').map(f => {
    const value = employee[f.name as keyof Employee];
    return [f.name, value == null ? '' : String(value)];
  }));
  const clearFilters = () => { setSearch(""); setActive(""); setDepartment(""); setJobTitle(""); setPage(0); };
  return (
    <Paper sx={{ p: 2 }} {...contextMenu('Employees', [pasteAction({ kind: 'employee', onPaste: pasteEmployee })])}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
          <Typography variant="h2">Employees</Typography>
          <Button variant="contained" onClick={() => setForm({})}>
            Add employee
          </Button>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
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
            label="Job title filter"
            placeholder="e.g. Technician"
            value={jobTitle}
            onChange={(e) => { setJobTitle(e.target.value); setPage(0); }}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            sx={{ minWidth: 180 }}
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
          {(search || active || department || jobTitle) && <Button onClick={clearFilters}>Clear filters</Button>}
        </Stack>
        {(employees.isFetching && !employees.isPending || search !== term || jobTitle.trim() !== jobTitleTerm) && <Typography role="status" variant="body2">Updating employees…</Typography>}
        <QueryState
          loading={employees.isPending || departments.isPending}
          error={employees.error || departments.error}
          retry={() => {
            void employees.refetch();
            void departments.refetch();
          }}
        />
        {!employees.isError && (
          <TableContainer tabIndex={0} role="region" aria-label="Employee records — scroll horizontally for more columns">
            <Table aria-label="Employees">
              <TableHead>
                <TableRow>
                  {[
                    "Number",
                    "Name",
                    "Job title",
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
                <StatusGroups items={employees.data?.content ?? []} category={employee => employee.active ? "Active" : "Inactive"} tableColumns={7}>{employee => (
                  <TableRow key={employee.id} {...contextMenu(`${employee.firstName} ${employee.lastName}`, objectActions({
                    copy: { kind: 'employee', label: `${employee.firstName} ${employee.lastName}`, values: employeeTemplate(employee) },
                    paste: { kind: 'employee', onPaste: pasteEmployee },
                    edit: () => setForm({ employee }), details: () => setForm({ employee, readonly: true }),
                    deleteReason: 'Employee records can be deactivated using the row controls.',
                  }))}>
                    <TableCell>{employee.employeeNumber}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => setForm({ employee, readonly: true })}
                      >
                        {employee.firstName} {employee.lastName}
                      </Button>
                    </TableCell>
                    <TableCell>{employee.jobTitle?.trim() || "—"}</TableCell>
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
                )}</StatusGroups>
                {employees.data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
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
        (departments.isPending ? (
          <Alert severity="info">Loading form options…</Alert>
        ) : departments.error ? (
          <Alert
            severity="error"
            action={
              <Button
                onClick={() => {
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
                  : "Add employee"
            }
            grouped
            submitLabel={form.employee ? "Save employee" : "Create employee"}
            pendingLabel={form.employee ? "Saving employee…" : "Creating employee…"}
            successMessage={form.employee ? "Employee updated." : "Employee created."}
            summary={<Typography variant="body2">{form.employee ? `Employee number: ${form.employee.employeeNumber}` : "Employee number is assigned automatically. Create a login under Accounts first, then link it below if personal access is needed."}</Typography>}
            fields={fields}
            notice={form.initial ? 'Review the copied details and enter a unique email. The new employee will receive a new number and has no linked login.' : undefined}
            initial={
              form.employee
                ? Object.fromEntries(
                    Object.entries(form.employee).map(([key, value]) => [
                      key,
                      value == null ? "" : String(value),
                    ]),
                  )
                : { role: "EMPLOYEE", employeeNumber: "Assigned automatically", ...form.initial }
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
          submitLabel={`${activation.active ? "Deactivate" : "Activate"} employee`}
          submitColor={activation.active ? "error" : "primary"}
          summary={<Typography>{activation.firstName} {activation.lastName} · {activation.employeeNumber}</Typography>}
          successMessage={`Employee ${activation.active ? "deactivated" : "activated"}.`}
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
