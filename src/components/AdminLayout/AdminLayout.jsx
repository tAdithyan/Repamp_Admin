import { useContext, useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ThemeContext } from "../../context/ThemeContext";
import Sidebar from "../Sidebar/Sidebar";
import "./AdminLayout.css";
import {
  SidebarAccessProvider,
  SidebarPageGuard,
} from "../../context/SidebarAccess";

const ROLE_LABELS = {
  ROL_1: "Super Administrator",
  ROL_2: "Administrator",
  ROL_3: "Coordinator",
  ROL_4: "Collection Agent",
  ROL_5: "Customer",
  ROL_6: "Client Administrator",
  CLIENT_ADMIN: "Client Administrator",
};
const initials = (name = "User") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function AdminLayout() {
  const { appUser, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const [accountOpen, setAccountOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar-icons-only");
      if (saved !== null) return saved === "true";
    } catch {
      /* Keep the toggle usable when storage is unavailable. */
    }
    return window.matchMedia("(max-width: 900px)").matches;
  });
  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem("sidebar-icons-only", String(next));
    } catch {
      /* Session-only preference. */
    }
  };
  const accountRef = useRef(null);
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    const close = (event) =>
      accountRef.current &&
      !accountRef.current.contains(event.target) &&
      setAccountOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <SidebarAccessProvider>
      <div
        className={`admin-layout ${sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className="admin-content">
          <header className="admin-header">
            <div className="header-navigation">
              <div className="welcome-copy">
                <span>{greeting},</span>
                <strong>{appUser?.name || "REPAMP user"}</strong>
                <small>
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </small>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="header-icon-button"
                aria-label="Toggle theme"
                onClick={toggleTheme}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {/* <button
                className="header-icon-button notification-button"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <i />
              </button> */}
              <div className="account-menu" ref={accountRef}>
                <button
                  className="account-trigger"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                >
                  <span className="header-avatar">
                    {initials(appUser?.name)}
                  </span>
                  <span className="account-trigger-copy">
                    <strong>{appUser?.name || "User"}</strong>
                    <small>
                      {ROLE_LABELS[appUser?.role] || appUser?.role || "Account"}
                    </small>
                  </span>
                  <ChevronDown
                    size={16}
                    className={accountOpen ? "rotated" : ""}
                  />
                </button>
                {accountOpen && (
                  <div className="account-dropdown">
                    <div className="account-summary">
                      <span className="large-avatar">
                        {initials(appUser?.name)}
                      </span>
                      <div>
                        <strong>{appUser?.name || "User"}</strong>
                        <small>
                          {appUser?.email ||
                            appUser?.phonenumber ||
                            "No contact information"}
                        </small>
                        <i>
                          {appUser?.userId ||
                            ROLE_LABELS[appUser?.role] ||
                            appUser?.role}
                        </i>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        navigate("/admin/account");
                      }}
                    >
                      <UserRound size={17} />
                      <span>
                        <strong>My account</strong>
                        <small>Profile and contact details</small>
                      </span>
                    </button>
                    {/* <button
                      onClick={() => {
                        setAccountOpen(false);
                        navigate("/admin/account");
                      }}
                    >
                      <Settings size={17} />
                      <span>
                        <strong>Account settings</strong>
                        <small>Manage your preferences</small>
                      </span>
                    </button> */}
                    <div className="account-divider" />
                    <button className="account-logout" onClick={signOut}>
                      <LogOut size={17} />
                      <span>
                        <strong>Sign out</strong>
                        <small>End this session securely</small>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="admin-page-container">
            <SidebarPageGuard>
              <Outlet />
            </SidebarPageGuard>
          </div>
        </main>
      </div>
    </SidebarAccessProvider>
  );
}
