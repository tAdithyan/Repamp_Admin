import React, { lazy, Suspense, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, AuthContext } from "./context/AuthContext";

import Login from "./pages/Login/Login";
import AdminLayout from "./components/AdminLayout/AdminLayout";
import Dashboard from "./pages/Dashboard/Dashboard";
import UserManagement from "./pages/Usermanagement/Usermanagement";
import PermissionManagement from "./pages/PermissionManagement/PermissionManagement";
import PickupManagement from "./pages/PickupManagement/PickupManagement";
import WastePricing from "./pages/WastePricing/WastePricing";
import BinManagement from "./pages/BinManagement/BinManagement";
import ActiveAgents from "./pages/ActiveAgents/ActiveAgents";
import AgentDetails from "./pages/AgentDetails/AgentDetails";
import WasteAnalysis from "./pages/WasteAnalysis/WasteAnalysis";
import RecurringPickups from "./pages/RecurringPickups/RecurringPickups";
import ClientPortal from "./pages/ClientPortal/ClientPortal";
import ContractDetails from "./pages/ContractDetails/ContractDetails";
import Account from "./pages/Account/Account";
import Marketplace from "./pages/Marketplace/Marketplace";
import SidebarAccessManagement from "./pages/PermissionManagement/SidebarAccessManagement";
import ServiceAreas from "./pages/ServiceAreas/ServiceAreas";
import Complaints from "./pages/Complaints/Complaints";

// Guest User
import CreateGuestUser from "./pages/Guestuser/Guestuser";

const ContentPages = lazy(() =>
  import("./pages/ContentPages/ContentPages")
);

// =====================================================
// ROLES
// =====================================================

const ADMIN_ROLES = [
  "ROL_1",
  "ROL_2",
  "SuperAdmin",
  "Admin",

];

const CLIENT_ROLES = [
  "ROL_6",
  "CLIENT_ADMIN",
];

// =====================================================
// PROTECTED ROUTE
// =====================================================

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
};

// =====================================================
// DASHBOARD ROUTE
// =====================================================

const DashboardRoute = () => {
  const { appUser } = useContext(AuthContext);

  return CLIENT_ROLES.includes(appUser?.role) ? (
    <ClientPortal />
  ) : (
    <Dashboard />
  );
};

// =====================================================
// ADMIN ONLY ROUTE
// =====================================================

const AdminOnlyRoute = ({ children }) => {
  const { appUser } = useContext(AuthContext);

  const isAdmin = ADMIN_ROLES.includes(appUser?.role);

  if (!isAdmin) {
    return (
      <Navigate
        to="/admin/dashboard"
        replace
      />
    );
  }

  return children;
};

// =====================================================
// CLIENT ONLY ROUTE
// =====================================================

const ClientOnlyRoute = ({ children }) => {
  const { appUser } = useContext(AuthContext);

  return CLIENT_ROLES.includes(appUser?.role) ? (
    children
  ) : (
    <Navigate
      to="/admin/dashboard"
      replace
    />
  );
};

// =====================================================
// SERVICE AREAS ROUTE
// =====================================================

const ServiceAreasRoute = () => {
  const { appUser } = useContext(AuthContext);

  return ADMIN_ROLES.includes(appUser?.role) ? (
    <ServiceAreas />
  ) : (
    <Navigate
      to="/admin/dashboard"
      replace
    />
  );
};

// =====================================================
// COMPLAINTS ROUTE
// =====================================================

const ComplaintsRoute = () => {
  const { appUser } = useContext(AuthContext);

  console.log("appuser",appUser)

  return ADMIN_ROLES.includes(appUser?.role) ? (
    <Complaints />
  ) : (
    <Navigate
      to="/admin/dashboard"
      replace
    />
  );
};

// =====================================================
// MAP PERMISSION ROUTE
// =====================================================

const MapPermissionRoute = ({ children }) => {
  const { appUser, hasPermission } =
    useContext(AuthContext);

  const isAdmin = ADMIN_ROLES.includes(appUser?.role);
  const canReadMap =
    hasPermission("PERM_MAP_READ");

  return isAdmin || canReadMap ? (
    children
  ) : (
    <Navigate
      to="/admin/dashboard"
      replace
    />
  );
};

// =====================================================
// CONTENT PAGES ROUTE
// =====================================================

const ContentPagesRoute = () => {
  const { appUser } = useContext(AuthContext);

  return ADMIN_ROLES.includes(appUser?.role) ? (
    <Suspense
      fallback={
        <div className="content-pages-state">
          Loading page editor…
        </div>
      }
    >
      <ContentPages />
    </Suspense>
  ) : (
    <Navigate
      to="/admin/dashboard"
      replace
    />
  );
};

// =====================================================
// APP
// =====================================================

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>

            {/* =================================================
                ROOT
            ================================================= */}

            <Route
              path="/"
              element={
                <Navigate
                  to="/login"
                  replace
                />
              }
            />

            {/* =================================================
                LOGIN
            ================================================= */}

            <Route
              path="/login"
              element={<Login />}
            />

            {/* =================================================
                ADMIN
            ================================================= */}

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >

              {/* ===============================================
                  DEFAULT ADMIN ROUTE
              =============================================== */}

              <Route
                index
                element={
                  <Navigate
                    to="/admin/dashboard"
                    replace
                  />
                }
              />

              {/* ===============================================
                  DASHBOARD
              =============================================== */}

              <Route
                path="dashboard"
                element={<DashboardRoute />}
              />

              {/* ===============================================
                  USERS
              =============================================== */}

              <Route
                path="usermanagement"
                element={<UserManagement />}
              />

              {/* ===============================================
                  CREATE GUEST USER
              =============================================== */}

              <Route
                path="guest-user"
                element={
                
                    <CreateGuestUser />
              
                }
              />

              {/* ===============================================
                  PERMISSIONS
              =============================================== */}

              <Route
                path="permissionManagement"
                element={
                  <PermissionManagement />
                }
              />

              {/* ===============================================
                  PICKUPS
              =============================================== */}

              <Route
                path="pickups"
                element={
              
                    <PickupManagement />
                 
                }
              />

              {/* ===============================================
                  COMPLAINTS
              =============================================== */}

              <Route
                path="complaints"
                element={
                  <ComplaintsRoute />
                }
              />

              {/* ===============================================
                  CONTENT PAGES
              =============================================== */}

              <Route
                path="content-pages"
                element={
                  <ContentPagesRoute />
                }
              />

              {/* ===============================================
                  WASTE PRICING
              =============================================== */}

              <Route
                path="waste-pricing"
                element={
                  <WastePricing />
                }
              />

              {/* ===============================================
                  SERVICE AREAS
              =============================================== */}

              <Route
                path="service-areas"
                element={
                  <ServiceAreasRoute />
                }
              />

              {/* ===============================================
                  BIN MANAGEMENT
              =============================================== */}

              <Route
                path="bins"
                element={
                  <BinManagement />
                }
              />

              {/* ===============================================
                  ACTIVE AGENTS
              =============================================== */}

              <Route
                path="active-agents"
                element={
                
                    <ActiveAgents />
                
                }
              />

              {/* ===============================================
                  AGENTS
              =============================================== */}

              <Route
                path="agents"
                element={
                 
                    <AgentDetails />
                
                }
              />

              {/* ===============================================
                  WASTE ANALYSIS
              =============================================== */}

              <Route
                path="waste-analysis"
                element={
                    <WasteAnalysis />
                }
              />

              {/* ===============================================
                  RECURRING PICKUPS
              =============================================== */}

              <Route
                path="recurring-pickups"
                element={
            
                    <RecurringPickups />
               
                }
              />

              {/* ===============================================
                  CONTRACT DETAILS
              =============================================== */}

              <Route
                path="contract-details"
                element={
                  // <ClientOnlyRoute>
                    <ContractDetails />
                  // </ClientOnlyRoute>
                }
              />

              {/* ===============================================
                  SIDEBAR ACCESS
              =============================================== */}

              <Route
                path="sidebar-access"
                element={
                  <SidebarAccessManagement />
                }
              />

              {/* ===============================================
                  ACCOUNT
              =============================================== */}

              <Route
                path="account"
                element={<Account />}
              />

              {/* ===============================================
                  MARKETPLACE
              =============================================== */}

              <Route
                path="marketplace/:section?"
                element={<Marketplace />}
              />

              {/* ===============================================
                  UNKNOWN ADMIN ROUTE
              =============================================== */}

              <Route
                path="*"
                element={
                  <Navigate
                    to="/admin/dashboard"
                    replace
                  />
                }
              />

            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;