import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVertRounded";
import {
  getAvatarColor,
  getInitials,
  type Employee,
  type EmployeeStatus,
} from "../../../data/employees";

const STATUS_COLOR: Record<
  EmployeeStatus,
  "success" | "warning" | "default"
> = {
  Active: "success",
  "On Leave": "warning",
  Inactive: "default",
};

type EmployeeTableProps = {
  employees: Employee[];
};

export default function EmployeeTable({ employees }: EmployeeTableProps) {
  return (
    <TableContainer>
      <Table sx={{ minWidth: 820 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 64 }}>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Contact</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Requests</TableCell>
            <TableCell>Hire Date</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell sx={{ color: "text.secondary" }}>
                {employee.id}
              </TableCell>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      fontSize: 13,
                      fontWeight: 700,
                      bgcolor: getAvatarColor(employee.id),
                    }}
                  >
                    {getInitials(employee.name)}
                  </Avatar>
                  <Box>
                    <Link
                      href="#"
                      underline="hover"
                      sx={{ fontWeight: 600, fontSize: 13.5 }}
                    >
                      {employee.name}
                    </Link>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {employee.position}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                {employee.department}
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {employee.phone}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {employee.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={employee.status}
                  color={STATUS_COLOR[employee.status]}
                  variant={employee.status === "Inactive" ? "outlined" : "filled"}
                  sx={{
                    ...(employee.status !== "Inactive" && {
                      bgcolor: (theme) =>
                        theme.palette[STATUS_COLOR[employee.status] as "success"]
                          .light,
                      color: (theme) =>
                        theme.palette[STATUS_COLOR[employee.status] as "success"]
                          .main,
                    }),
                  }}
                />
              </TableCell>
              <TableCell align="center">
                {employee.openRequests > 0 ? (
                  <Chip
                    size="small"
                    label={employee.openRequests}
                    sx={{
                      minWidth: 28,
                      bgcolor: "success.light",
                      color: "success.main",
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    &mdash;
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{employee.hireDate}</TableCell>
              <TableCell align="right">
                <IconButton size="small" aria-label={`Actions for ${employee.name}`}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {employees.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  No employees match your filters.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
