import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";

const PermissionManagement = () => {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);

    const [selectedRole, setSelectedRole] = useState("ROL_1");
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // =====================================================
    // ROLE NAMES
    // =====================================================

    const roleNames = {
        ROL_1: "SuperAdmin",
        ROL_2: "Admin",
        ROL_3: "Coordinator",
        ROL_4: "CollectionAgent",
        ROL_5: "User",
        ROL_6: "CLIENT_ADMIN",
    };

    // =====================================================
    // FETCH ROLES + PERMISSIONS
    // =====================================================

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [rolesResponse, permissionsResponse] =
                    await Promise.all([
                        api.get("/v1/roles"),
                        api.get("/v1/permissions"),
                    ]);

                const rolesData =
                    rolesResponse.data?.data ||
                    rolesResponse.data ||
                    [];

                const permissionsData =
                    permissionsResponse.data?.data ||
                    permissionsResponse.data ||
                    [];

                setRoles(
                    Array.isArray(rolesData)
                        ? rolesData
                        : []
                );

                setPermissions(
                    Array.isArray(permissionsData)
                        ? permissionsData
                        : []
                );

            } catch (err) {
                console.error("Failed to fetch permission data:", err);

                setError(
                    err.response?.data?.message ||
                    err.message ||
                    "Failed to load permissions"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // =====================================================
    // WHEN ROLE CHANGES
    // =====================================================

    useEffect(() => {
        if (!selectedRole || roles.length === 0) {
            setSelectedPermissions([]);
            return;
        }

        const role = roles.find(
            (item) =>
                item.roleId === selectedRole ||
                item.id === selectedRole ||
                item._id === selectedRole ||
                item.value === selectedRole
        );

        if (!role) {
            setSelectedPermissions([]);
            return;
        }

        // Try different possible permission property names
        const currentPermissions =
            role.permissions ||
            role.permissionIds ||
            [];

        // If permissions are objects, extract IDs/names
        const permissionValues = currentPermissions.map(
            (permission) => {
                if (typeof permission === "string") {
                    return permission;
                }

                return (
                    permission.permissionId ||
                    permission.id ||
                    permission._id ||
                    permission.code ||
                    permission.name
                );
            }
        );

        setSelectedPermissions(permissionValues);
    }, [selectedRole, roles]);

    // =====================================================
    // TOGGLE PERMISSION
    // =====================================================

    const handlePermissionToggle = (permissionId) => {
        setSelectedPermissions((previous) => {
            if (previous.includes(permissionId)) {
                return previous.filter(
                    (id) => id !== permissionId
                );
            }

            return [...previous, permissionId];
        });
    };

    // =====================================================
    // SELECT ALL
    // =====================================================

    const handleSelectAll = () => {
        const allPermissionIds = permissions.map(
            (permission) =>
                permission.permissionId ||
                permission.id ||
                permission._id ||
                permission.code ||
                permission.name
        );

        setSelectedPermissions(allPermissionIds);
    };

    // =====================================================
    // CLEAR ALL
    // =====================================================

    const handleClearAll = () => {
        setSelectedPermissions([]);
    };

    // =====================================================
    // SAVE
    // =====================================================

    const handleSave = async () => {
        if (!selectedRole) {
            alert("Please select a role.");
            return;
        }

        try {
            setSaving(true);

            await api.put(
                `/v1/roles/${selectedRole}/permissions`,
                {
                    permissions: selectedPermissions,
                }
            );

            // Update local role data so UI stays synchronized
            setRoles((previousRoles) =>
                previousRoles.map((role) => {
                    const roleId =
                        role.roleId ||
                        role.id ||
                        role._id ||
                        role.value;

                    if (roleId !== selectedRole) {
                        return role;
                    }

                    return {
                        ...role,
                        permissions: selectedPermissions,
                    };
                })
            );

            alert("Permissions updated successfully.");

        } catch (err) {
            console.error("Failed to update permissions:", err);

            alert(
                "Failed to update permissions: " +
                (
                    err.response?.data?.message ||
                    err.message ||
                    "Unknown error"
                )
            );
        } finally {
            setSaving(false);
        }
    };

    // =====================================================
    // PERMISSION DISPLAY NAME
    // =====================================================

    const getPermissionId = (permission) => {
        if (typeof permission === "string") {
            return permission;
        }

        return (
            permission.permissionId ||
            permission.id ||
            permission._id ||
            permission.code ||
            permission.name
        );
    };

    const getPermissionName = (permission) => {
        if (typeof permission === "string") {
            return permission;
        }

        return (
            permission.name ||
            permission.permissionName ||
            permission.code ||
            permission.permissionId ||
            permission.id
        );
    };

    const getPermissionDescription = (permission) => {
        if (typeof permission === "string") {
            return "";
        }

        return (
            permission.description ||
            ""
        );
    };

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <div style={pageStyle}>
                <p>Loading permissions...</p>
            </div>
        );
    }

    // =====================================================
    // UI
    // =====================================================

    return (
        <div style={pageStyle}>

            {/* HEADER */}
            <div style={headerStyle}>
                <div>
                    <h1 style={titleStyle}>
                        Permission Management
                    </h1>

                    <p style={subtitleStyle}>
                        Manage permissions assigned to each role
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        ...saveButton,
                        opacity: saving ? 0.6 : 1,
                        cursor: saving
                            ? "not-allowed"
                            : "pointer",
                    }}
                >
                    {saving
                        ? "Saving..."
                        : "Save Permissions"}
                </button>
            </div>

            {/* ERROR */}
            {error && (
                <div style={errorStyle}>
                    {error}
                </div>
            )}

            {/* ROLE SELECTOR */}
            <div style={cardStyle}>

                <label style={labelStyle}>
                    Select Role
                </label>

                <select
                    value={selectedRole}
                    onChange={(e) =>
                        setSelectedRole(e.target.value)
                    }
                    style={selectStyle}
                >
                    <option value="">
                        Select Role
                    </option>

                    {roles.length > 0
                        ? roles.map((role) => {
                            const roleId =
                                role.roleId ||
                                role.id ||
                                role._id ||
                                role.value;

                            const roleName =
                                role.name ||
                                role.roleName ||
                                roleNames[roleId] ||
                                roleId;

                            return (
                                <option
                                    key={roleId}
                                    value={roleId}
                                >
                                    {roleName}
                                </option>
                            );
                        })
                        : Object.entries(roleNames).map(
                            ([value, name]) => (
                                <option
                                    key={value}
                                    value={value}
                                >
                                    {name}
                                </option>
                            )
                        )}
                </select>

            </div>

            {/* PERMISSION CARD */}
            <div style={cardStyle}>

                {/* PERMISSION HEADER */}
                <div style={permissionHeader}>

                    <div>
                        <h2 style={permissionTitle}>
                            Permissions
                        </h2>

                        <p style={permissionSubtitle}>
                            {selectedPermissions.length}{" "}
                            of{" "}
                            {permissions.length} permissions
                            selected
                        </p>
                    </div>

                    <div style={permissionActions}>
                        <button
                            onClick={handleSelectAll}
                            style={secondaryButton}
                        >
                            Select All
                        </button>

                        <button
                            onClick={handleClearAll}
                            style={secondaryButton}
                        >
                            Clear All
                        </button>
                    </div>

                </div>

                {/* PERMISSIONS */}
                {permissions.length === 0 ? (
                    <div style={emptyStyle}>
                        No permissions found.
                    </div>
                ) : (
                    <div style={permissionGrid}>

                        {permissions.map((permission) => {

                            const permissionId =
                                getPermissionId(
                                    permission
                                );

                            const permissionName =
                                getPermissionName(
                                    permission
                                );

                            const description =
                                getPermissionDescription(
                                    permission
                                );

                            const checked =
                                selectedPermissions.includes(
                                    permissionId
                                );

                            return (
                                <label
                                    key={permissionId}
                                    style={{
                                        ...permissionItem,
                                        borderColor: checked
                                            ? "var(--primary-color)"
                                            : "var(--border-color)",
                                        backgroundColor:
                                            checked
                                                ? "var(--section-bg, rgba(0,0,0,0.03))"
                                                : "var(--card-bg)",
                                    }}
                                >

                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                            handlePermissionToggle(
                                                permissionId
                                            )
                                        }
                                        style={checkboxStyle}
                                    />

                                    <div>
                                        <div
                                            style={
                                                permissionNameStyle
                                            }
                                        >
                                            {permissionName}
                                        </div>

                                        {description && (
                                            <div
                                                style={
                                                    descriptionStyle
                                                }
                                            >
                                                {description}
                                            </div>
                                        )}
                                    </div>

                                </label>
                            );
                        })}

                    </div>
                )}

            </div>

        </div>
    );
};

// =====================================================
// STYLES
// =====================================================

const pageStyle = {
    padding: "24px",
};

const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    gap: "20px",
};

const titleStyle = {
    fontSize: "2rem",
    margin: 0,
};

const subtitleStyle = {
    margin: "6px 0 0",
    color: "var(--text-muted)",
    fontSize: "14px",
};

const saveButton = {
    padding: "11px 20px",
    borderRadius: "8px",
    border: "none",
    background: "var(--primary-color)",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
};

const cardStyle = {
    backgroundColor: "var(--card-bg)",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
};

const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "600",
};

const selectStyle = {
    width: "100%",
    maxWidth: "400px",
    padding: "11px 12px",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    backgroundColor: "var(--card-bg)",
    color: "var(--text-color)",
    outline: "none",
    fontSize: "14px",
};

const permissionHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    gap: "15px",
};

const permissionTitle = {
    margin: 0,
    fontSize: "18px",
};

const permissionSubtitle = {
    margin: "5px 0 0",
    color: "var(--text-muted)",
    fontSize: "13px",
};

const permissionActions = {
    display: "flex",
    gap: "8px",
};

const secondaryButton = {
    padding: "8px 12px",
    border: "1px solid var(--border-color)",
    borderRadius: "7px",
    background: "transparent",
    color: "var(--text-color)",
    cursor: "pointer",
    fontSize: "13px",
};

const permissionGrid = {
    display: "grid",
    gridTemplateColumns:
        "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "12px",
};

const permissionItem = {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "15px",
    border: "1px solid",
    borderRadius: "9px",
    cursor: "pointer",
    transition: "all 0.2s ease",
};

const checkboxStyle = {
    width: "18px",
    height: "18px",
    marginTop: "2px",
    cursor: "pointer",
    flexShrink: 0,
};

const permissionNameStyle = {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-color)",
};

const descriptionStyle = {
    marginTop: "4px",
    fontSize: "12px",
    color: "var(--text-muted)",
    lineHeight: "1.4",
};

const emptyStyle = {
    padding: "30px",
    textAlign: "center",
    color: "var(--text-muted)",
};

const errorStyle = {
    padding: "12px 15px",
    marginBottom: "20px",
    borderRadius: "8px",
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    color: "#dc2626",
    fontSize: "14px",
};

export default PermissionManagement;
