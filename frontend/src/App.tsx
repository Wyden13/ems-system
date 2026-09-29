import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import AuthProvider from "./auth/AuthProvider";
import { useAuth } from "./auth/context";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
const ProfilePage=lazy(()=>import("./pages/ProfilePage"));
const EmployeeManagementPage=lazy(()=>import("./pages/EmployeeManagementPage"));
const OrganizationPage=lazy(()=>import("./pages/OrganizationPage"));
const AccountsPage=lazy(()=>import("./pages/AccountsPage"));
const AttendancePage=lazy(()=>import("./pages/AttendancePage"));
const PayrollPage=lazy(()=>import("./pages/PayrollPage"));
const SchedulePage=lazy(()=>import("./pages/SchedulePage"));
const PTOPage=lazy(()=>import("./pages/PTOPage"));
const WorkDashboard=lazy(()=>import("./pages/dashboard/WorkDashboard"));
import AdminDashboard from "./pages/dashboard/AdminDashboard";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000 },
    mutations: { retry: false },
  },
});
function AdminOnly() {
  return useAuth().account?.role === "ADMIN" ? (
    <Outlet />
  ) : (
    <Navigate to="/profile" replace />
  );
}
function ApplicationRoutes() {
  const { account, loading, error, restore } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <Box sx={{ p: 5 }}>
        <CircularProgress aria-label="Restoring session" />
      </Box>
    );
  if (error)
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => void restore()}>Retry</Button>}
      >
        {error.message}
      </Alert>
    );
  const landing = "/dashboard";
  if (!account)
    return location.pathname === "/login" ? (
      <LoginPage />
    ) : (
      <Navigate to="/login" replace />
    );
  return (
    <AppLayout>
      <Suspense fallback={<CircularProgress aria-label="Loading page" />}><Routes>
        <Route element={<AdminOnly />}>
          
          <Route path="/employees" element={<EmployeeManagementPage />} />
          <Route path="/organization" element={<OrganizationPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
        </Route>
        <Route path="/dashboard" element={account.role === "ADMIN" ? <><AdminDashboard /><WorkDashboard /></> : <WorkDashboard />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/pto" element={<PTOPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Routes></Suspense>
    </AppLayout>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ApplicationRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
