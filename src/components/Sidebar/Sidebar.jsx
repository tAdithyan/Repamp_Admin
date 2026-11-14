import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Sun,
  Moon,
  Truck,
  BadgeIndianRupee,
  Trash2,
  MapPinned,
  CalendarClock,
  FileText,
  ChevronsLeft,
  ChevronsRight,
  Map,
  MessageSquareWarning,
  PanelsTopLeft,
  ShieldCheck,
} from "lucide-react";

import { ThemeContext } from "../../context/ThemeContext";
import { AuthContext } from "../../context/AuthContext";
import logo from "../../assets/logo.jpeg";
import "./Sidebar.css";
import { useSidebarAccess } from "../../context/SidebarAccess";

const Sidebar = ({ collapsed = false, onToggle }) => {
  const { sections } = useSidebarAccess();
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const { logout, appUser, hasPermission } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  const navItems = [
    {
      id: "dashboard",
      path: "/admin/dashboard",
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
    },
      {
      id: "waste-analysis",
      path: "/admin/waste-analysis",
      name: "Waste Analysis",
      icon: <LayoutDashboard size={20} />,
    },
    {
      id: "pickups",
      path: "/admin/pickups",
      name: "Pickups",
      icon: <Truck size={20} />,
    },
    { id: "recurring-pickups",
      path: "/admin/recurring-pickups",
      name: "Recurring Pickups",
      icon: <CalendarClock size={20} />,
    },
    { id: "contract-details",
      path: "/admin/contract-details",
      name: "Contract Details",
      icon: <FileText size={20} />,
    },
    {
      id: "waste-pricing",
      path: "/admin/waste-pricing",
      name: "Waste Pricing",
      icon: <BadgeIndianRupee size={20} />,
    },
    {
      id: "service-areas",
      path: "/admin/service-areas",
      name: "Service Areas",
      icon: <Map size={20} />,
    },
    {
      id: "bins",
      path: "/admin/bins",
      name: "Bin Management",
      icon: <Trash2 size={20} />,
    },
    {
      id: "active-agents",
      path: "/admin/active-agents",
      name: "Live Agents",
      icon: <MapPinned size={20} />,
    },
    {
      id: "agents",
      path: "/admin/agents",
      name: "Agent Details",
      icon: <Users size={20} />,
    },
  
    {
      id: "usermanagement",
      path: "/admin/usermanagement",
      name: "Users",
      icon: <Users size={20} />,
    },

    // Create Guest User
    {
      id: "guest-user",
      path: "/admin/guest-user",
      name: "Create Guest User",
      icon: <UserPlus size={20} />,
    },

    {
      id: "sidebar-access",
      path: "/admin/sidebar-access",
      name: "Sidebar Access",
      icon: <Settings size={20} />,
    },
    {
      id: "permissionManagement",
      path: "/admin/permissionManagement",
      name: "Permissions",
      icon: <ShieldCheck size={20} />,
    },
    {
      id: "content-pages",
      path: "/admin/content-pages",
      name: "Page Content",
      icon: <PanelsTopLeft size={20} />,
    },
    {
      id: "complaints",
      path: "/admin/complaints",
      name: "Complaints",
      icon: <MessageSquareWarning size={20} />,
    },
    {
      id: "marketplace",
      path: "/admin/marketplace/dashboard",
      name: "Marketplace",
      icon: <BadgeIndianRupee size={20} />,
    },
  ];

  const isAdmin = ["ROL_1", "ROL_2", "SuperAdmin", "Admin"].includes(
    appUser?.role,
  );

  const adminOnlyPaths = ["/admin/content-pages", "/admin/guest-user"];

  const visibleNavItems = navItems.filter((item) => {
    if (item.path === "/admin/active-agents") {
      return isAdmin || hasPermission("PERM_MAP_READ");
    }
    if (adminOnlyPaths.includes(item.path)) {
      return isAdmin;
    }

    const sectionKey = item.id;

    return sections?.includes(sectionKey);
  });

  return (
    <aside
      className={`sidebar${collapsed ? " collapsed" : ""}`}
      id="admin-sidebar"
    >
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <img src={logo} alt="REPAMP" className="sidebar-logo" />

        {!collapsed && (
          <div>
            <h2>Repamp</h2>

            <span>
              {["ROL_6", "CLIENT_ADMIN"].includes(appUser?.role)
                ? "Client Portal"
                : "Admin Dashboard"}
            </span>
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <div className="sidebar-toggle-row">
        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="sidebar-navigation"
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}

          {!collapsed && <span>Collapse menu</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" id="sidebar-navigation">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            title={item.name}
            aria-label={item.name}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            {item.icon}

            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Uncomment this section if you want theme and logout controls in the sidebar. */}

      {/*
      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && (
            <span>
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
      */}
    </aside>
  );
};

export default Sidebar;
