import { useContext, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Check,
  Save,
  RotateCcw,
  LayoutDashboard,
  Users,
  Settings,
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle,
  LockKeyhole,
} from "lucide-react";

import { AuthContext } from "../../context/AuthContext";
import api from "../../api/axiosInstance";
import "./SidebarAccessManagement.css";

function getRoleIcon(roleId) {
  switch (roleId) {
    case "ROL_1":
      return ShieldCheck;
    case "ROL_2":
      return Settings;
    case "ROL_3":
      return Users;
    case "ROL_4":
      return LayoutDashboard;
    case "ROL_7":
      return Eye;
    default:
      return Users;
  }
}

function getRoleDescription(roleId) {
  switch (roleId) {
    case "ROL_1":
      return "Full system access";
    case "ROL_2":
      return "Administrative access";
    case "ROL_3":
      return "Operations management";
    case "ROL_4":
      return "Field collection access";
    default:
      return "Standard user access";
  }
}

function RoleEditor({ role, sections }) {
  const [selected, setSelected] = useState(role.sections || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const client = useQueryClient();

  const originalSections = role.sections || [];

  const dirty =
    selected.length !== originalSections.length ||
    selected.some((id) => !originalSections.includes(id));

  const toggleSection = (sectionId) => {
    setMessage("");
    setError("");

    setSelected((current) => {
      if (current.includes(sectionId)) {
        return current.filter((id) => id !== sectionId);
      }

      return [...current, sectionId];
    });
  };

  const selectAll = () => {
    setSelected(sections.map((section) => section.id));
    setMessage("");
    setError("");
  };

  const clearAll = () => {
    setSelected([]);
    setMessage("");
    setError("");
  };

  const resetChanges = () => {
    setSelected(originalSections);
    setMessage("");
    setError("");
  };

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await api.put(`/v1/sidebar-access/${role.id}`, {
        sections: selected,
      });

      client.setQueryData(["sidebar-settings"], (current) => {
        if (!current) return current;

        return {
          ...current,
          roles: current.roles.map((item) =>
            item.id === role.id
              ? {
                  ...item,
                  sections: selected,
                }
              : item,
          ),
        };
      });

      await client.invalidateQueries({
        queryKey: ["sidebar-settings"],
      });

      setMessage("Changes saved successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const RoleIcon = getRoleIcon(role.id);

  return (
    <div className="sa-editor">
      {/* Editor header */}
      <div className="sa-editor-header">
        <div className="sa-editor-title">
          <div className="sa-editor-icon">
            <RoleIcon size={20} />
          </div>

          <div>
            <div className="sa-editor-name">
              <h2>{role.label}</h2>

              {["ROL_1", "SuperAdmin"].includes(role.id) && (
                <span className="sa-premium-badge">
                  <ShieldCheck size={12} />
                  Superadmin
                </span>
              )}
            </div>

            <p>{getRoleDescription(role.id)}</p>
          </div>
        </div>

        <div className="sa-access-summary">
          <span>{selected.length}</span>
          <small>of {sections.length} visible</small>
        </div>
      </div>

      {/* Permission heading */}
      <div className="sa-permission-heading">
        <div>
          <span className="sa-eyebrow">SIDEBAR PERMISSIONS</span>

          <h3>Visible sections</h3>

          <p>
            Choose the navigation items this role can see.
          </p>
        </div>

        <div className="sa-selection-actions">
          <button
            type="button"
            onClick={selectAll}
            disabled={saving || selected.length === sections.length}
          >
            Select all
          </button>

          <button
            type="button"
            onClick={clearAll}
            disabled={saving || selected.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Permission grid */}
      <div className="sa-permissions">
        {sections.map((section) => {
          const active = selected.includes(section.id);

          return (
            <button
              type="button"
              key={section.id}
              className={`sa-permission ${
                active ? "active" : ""
              }`}
              onClick={() => toggleSection(section.id)}
              disabled={saving}
            >
              <span
                className={`sa-check ${
                  active ? "checked" : ""
                }`}
              >
                {active && <Check size={13} />}
              </span>

              <span className="sa-permission-text">
                <strong>{section.label}</strong>

                <small>
                  {active ? "Visible in sidebar" : "Hidden"}
                </small>
              </span>

              <ChevronRight
                size={15}
                className="sa-permission-arrow"
              />
            </button>
          );
        })}
      </div>

      {/* Empty */}
      {selected.length === 0 && (
        <div className="sa-empty">
          <EyeOff size={17} />

          <div>
            <strong>No sections selected</strong>

            <p>
              This role will have no sidebar navigation items.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sa-editor-footer">
        <div>
          {message && (
            <span className="sa-success">
              <Check size={15} />
              {message}
            </span>
          )}

          {error && (
            <span className="sa-error">
              <AlertCircle size={15} />
              {error}
            </span>
          )}
        </div>

        <div className="sa-footer-actions">
          <button
            type="button"
            className="sa-reset"
            onClick={resetChanges}
            disabled={saving || !dirty}
          >
            <RotateCcw size={15} />
            Reset
          </button>

          <button
            type="button"
            className="sa-save"
            onClick={save}
            disabled={saving || !dirty}
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SidebarAccessManagement() {
  const { appUser } = useContext(AuthContext);

  const isSuperadmin = ["ROL_1", "SuperAdmin"].includes(
    appUser?.role,
  );

  const [selectedRoleId, setSelectedRoleId] = useState("");

  const query = useQuery({
    queryKey: ["sidebar-settings"],
    enabled: isSuperadmin,

    queryFn: async ({ signal }) =>
      (
        await api.get("/v1/sidebar-access", {
          signal,
        })
      ).data.data,

    refetchOnWindowFocus: false,
  });

  if (!isSuperadmin) {
    return (
      <div className="sa-denied">
        <LockKeyhole size={20} />

        <div>
          <h3>Access restricted</h3>
          <p>
            Only the superadmin can manage sidebar access.
          </p>
        </div>
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="sa-loading">
        <div className="sa-spinner" />
        <span>Loading access settings...</span>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="sa-denied">
        <AlertCircle size={20} />

        <div>
          <h3>Unable to load settings</h3>

          <p>
            Please make sure the backend is running and try again.
          </p>

          <button
            className="sa-retry"
            onClick={() => query.refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const roles = query.data?.roles || [];
  const sections = query.data?.sections || [];

  const activeRoleId =
    selectedRoleId || roles[0]?.id || "";

  const selectedRole =
    roles.find((role) => role.id === activeRoleId) ||
    roles[0];

  return (
    <section className="sa-page">

      {/* =============================================
          PAGE HEADER
      ============================================= */}

      <div className="sa-header">

        <div>
          <div className="sa-breadcrumb">
            Settings
            <span>/</span>
            Access Management
          </div>

          <div className="sa-heading-row">
            <div>
              <h1>Sidebar Access</h1>

              <p>
                Manage navigation visibility across staff roles.
              </p>
            </div>

            <div className="sa-security-badge">
              <ShieldCheck size={14} />
              Superadmin
            </div>
          </div>
        </div>

      </div>

      {/* =============================================
          MAIN PANEL
      ============================================= */}

      <div className="sa-main">

        {/* ROLE LIST */}

        <aside className="sa-roles">

          <div className="sa-roles-header">
            <div>
              <span className="sa-eyebrow">
                ACCESS CONTROL
              </span>

              <h2>Roles</h2>
            </div>

            <span className="sa-role-total">
              {roles.length}
            </span>
          </div>

          <div className="sa-role-list">

            {roles.map((role) => {
              const active = role.id === activeRoleId;
              const Icon = getRoleIcon(role.id);

              return (
                <button
                  type="button"
                  key={role.id}
                  className={`sa-role ${
                    active ? "active" : ""
                  }`}
                  onClick={() =>
                    setSelectedRoleId(role.id)
                  }
                >
                  <span className="sa-role-avatar">
                    <Icon size={17} />
                  </span>

                  <span className="sa-role-details">
                    <strong>{role.label}</strong>

                    <small>
                      {getRoleDescription(role.id)}
                    </small>
                  </span>

                  <ChevronRight
                    size={16}
                    className="sa-role-arrow"
                  />
                </button>
              );
            })}

          </div>

          <div className="sa-roles-note">
            <ShieldCheck size={15} />

            <p>
              Sidebar visibility does not change API
              permissions.
            </p>
          </div>

        </aside>

        {/* PERMISSION EDITOR */}

        <main className="sa-content">

          {selectedRole && (
            <RoleEditor
              key={selectedRole.id}
              role={selectedRole}
              sections={sections}
            />
          )}

        </main>

      </div>
    </section>
  );
}