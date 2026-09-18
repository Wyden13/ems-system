import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import UploadIcon from "@mui/icons-material/FileUploadOutlined";
import EmployeeTable from "../components/features/employees/EmployeeTable";
import { EMPLOYEES, type EmployeeStatus } from "../data/employees";

const STATUS_FILTERS: Array<EmployeeStatus | "All"> = [
  "All",
  "Active",
  "On Leave",
  "Inactive",
];

export default function EmployeeManagementPage() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EmployeeStatus | "All">("All");

  const employees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return EMPLOYEES.filter((employee) => {
      const matchesStatus = status === "All" || employee.status === status;
      const matchesQuery =
        !query ||
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [search, status]);

  return (
    <Paper variant="outlined" sx={{ border: 1, borderColor: "divider" }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 3,
          pt: 2.5,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ letterSpacing: 0.6, textTransform: "uppercase" }}
        >
          Company Employees
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            minHeight: 36,
            "& .MuiTab-root": { minHeight: 36, fontSize: 13 },
          }}
        >
          <Tab label="Employees" />
          <Tab label="Live View" />
          <Tab label="Org Chart" />
        </Tabs>
      </Box>
      <Divider sx={{ mt: 1.5 }} />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ px: 3, py: 2, alignItems: { md: "center" } }}
      >
        <TextField
          size="small"
          placeholder="Search employee"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: { xs: "100%", md: 260 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    fontSize="small"
                    sx={{ color: "text.secondary" }}
                  />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          size="small"
          select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as EmployeeStatus | "All")
          }
          sx={{ width: { xs: "100%", md: 160 } }}
        >
          {STATUS_FILTERS.map((option) => (
            <MenuItem key={option} value={option} sx={{ fontSize: 13 }}>
              {option}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<AddIcon />}>
            Add Employee
          </Button>
          <Button variant="outlined" startIcon={<UploadIcon />}>
            Import
          </Button>
        </Stack>
      </Stack>

      {tab === 0 ? (
        <EmployeeTable employees={employees} />
      ) : (
        <Box sx={{ px: 3, py: 8, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {tab === 1 ? "Live view" : "Org chart"} is not built yet.
          </Typography>
        </Box>
      )}

      <Divider />
      <Box sx={{ px: 3, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Showing {employees.length} of {EMPLOYEES.length} employees
        </Typography>
      </Box>
    </Paper>
  );
}
