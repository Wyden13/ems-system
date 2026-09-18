import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import SupervisorDashboard from "./pages/dashboard/SupervisorDashboard";
import AttendancePage from "./pages/AttendancePage";
import SchedulePage from "./pages/SchedulePage";
import PTOPage from "./pages/PTOPage";
import PayrollPage from "./pages/PayrollPage";
import EmployeeManagementPage from "./pages/EmployeeManagementPage";
// import ProfilePage from "./pages/profile/Profile";
// import Settings from "./pages/settings/Settings";

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<SupervisorDashboard />} />
          <Route path="/employees" element={<EmployeeManagementPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/pto" element={<PTOPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          {/* <Route path="/profile" element={<Profile />} /> */}
          {/* <Route path="/settings" element={<Settings />} /> */}
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
