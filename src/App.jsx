import React, { lazy, Suspense, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login/Login';
import AdminLayout from './components/AdminLayout/AdminLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import UserManagement from './pages/Usermanagement/Usermanagement';
import PermissionManagement from './pages/PermissionManagement/PermissionManagement';
import PickupManagement from './pages/PickupManagement/PickupManagement';
import WastePricing from './pages/WastePricing/WastePricing';
import BinManagement from './pages/BinManagement/BinManagement';
import ActiveAgents from './pages/ActiveAgents/ActiveAgents';
import AgentDetails from './pages/AgentDetails/AgentDetails';
import WasteAnalysis from './pages/WasteAnalysis/WasteAnalysis';
import RecurringPickups from './pages/RecurringPickups/RecurringPickups';
import ClientPortal from './pages/ClientPortal/ClientPortal';
import ContractDetails from './pages/ContractDetails/ContractDetails';
import Account from './pages/Account/Account';
import Marketplace from './pages/Marketplace/Marketplace';
import SidebarAccessManagement from './pages/PermissionManagement/SidebarAccessManagement';
import ServiceAreas from './pages/ServiceAreas/ServiceAreas';
import Complaints from './pages/Complaints/Complaints';
const ContentPages = lazy(() => import('./pages/ContentPages/ContentPages'));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};
const DashboardRoute = () => {
  const { appUser } = useContext(AuthContext);
  return ['ROL_6', 'CLIENT_ADMIN'].includes(appUser?.role) ? <ClientPortal /> : <Dashboard />;
};
const AdminOnlyRoute = ({ children }) => {
  const { appUser } = useContext(AuthContext);
  return ['ROL_6', 'CLIENT_ADMIN'].includes(appUser?.role)
    ? <Navigate to="/admin/contract-details" replace />
    : children;
};
const ClientOnlyRoute = ({ children }) => {
  const { appUser } = useContext(AuthContext);
  return ['ROL_6', 'CLIENT_ADMIN'].includes(appUser?.role)
    ? children
    : <Navigate to="/admin/dashboard" replace />;
};
const ServiceAreasRoute = () => {
  const { appUser } = useContext(AuthContext);
  return ['ROL_1', 'ROL_2', 'SuperAdmin', 'Admin'].includes(appUser?.role)
    ? <ServiceAreas />
    : <Navigate to="/admin/dashboard" replace />;
};
const ComplaintsRoute = () => {
  const { appUser } = useContext(AuthContext);
  return ['ROL_1', 'ROL_2', 'SuperAdmin', 'Admin'].includes(appUser?.role)
    ? <Complaints />
    : <Navigate to="/admin/dashboard" replace />;
};
const ContentPagesRoute = () => {
  const { appUser } = useContext(AuthContext);
  return ['ROL_1', 'ROL_2', 'SuperAdmin', 'Admin'].includes(appUser?.role)
    ? <Suspense fallback={<div className="content-pages-state">Loading page editor…</div>}><ContentPages /></Suspense>
    : <Navigate to="/admin/dashboard" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardRoute />} />
              <Route path='usermanagement' element={<UserManagement />} />
              <Route path='permissionManagement' element={<PermissionManagement />} />
              <Route path="pickups" element={<AdminOnlyRoute><PickupManagement /></AdminOnlyRoute>} />
              <Route path="complaints" element={<ComplaintsRoute />} />
              <Route path="content-pages" element={<ContentPagesRoute />} />
              <Route path="waste-pricing" element={<WastePricing />} />
              <Route path="service-areas" element={<ServiceAreasRoute />} />
              <Route path="bins" element={<BinManagement />} />
              <Route path="active-agents" element={<ActiveAgents />} />
              <Route path="agents" element={<AdminOnlyRoute><AgentDetails /></AdminOnlyRoute>} />
              <Route path="waste-analysis" element={<AdminOnlyRoute><WasteAnalysis /></AdminOnlyRoute>} />
              <Route path="recurring-pickups" element={<AdminOnlyRoute><RecurringPickups /></AdminOnlyRoute>} />
              <Route path="contract-details" element={<ClientOnlyRoute><ContractDetails /></ClientOnlyRoute>} />
              <Route path="sidebar-access" element={<SidebarAccessManagement />} />
              <Route path="account" element={<Account />} />
              <Route path="marketplace/:section?" element={<Marketplace />} />

              <Route path="*" element={<DashboardRoute />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

