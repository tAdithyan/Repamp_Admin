import React, { useEffect, useRef, useState } from "react";
import api from "../../api/axiosInstance";
const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [pageCount, setPageCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedUser, setSelectedUser] = useState(null);
    const [menuPosition, setMenuPosition] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [walletAmount, setWalletAmount] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [filterRole, setFilterRole] = useState("ROL_1");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [saving, setSaving] = useState(false);

    const menuRef = useRef(null);

    const roles = [
        { name: "SuperAdmin", value: "ROL_1" },
        { name: "Admin", value: "ROL_2" },
        { name: "Coordinator", value: "ROL_3" },
        { name: "CollectionAgent", value: "ROL_4" },
        { name: "User", value: "ROL_5" },
        { name: "Client Admin", value: "ROL_6" },
    ];

    // ================================
    // THREE DOT MENU
    // ================================

    const handleMenuClick = (event, user) => {
        const rect = event.currentTarget.getBoundingClientRect();

        setSelectedUser(user);

        setMenuPosition({
            top: rect.bottom + 5,
            right: window.innerWidth - rect.right,
        });
    };

    // ================================
    // CLOSE THREE DOT MENU
    // ================================

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            const fetchUsers = async () => {
                setLoading(true);
                setError(null);
                try {
                    const params = { page, limit: 10 };
                    if (filterRole) params.role = filterRole;
                    if (searchTerm.trim()) params.search = searchTerm.trim();
                    const response = await api.get('/v1/users', { params });
                    const result = response.data?.data ?? response.data;
                    const fetchedUsers = Array.isArray(result) ? result : result?.items || [];
                    setUsers(fetchedUsers);
                    setTotalUsers(Array.isArray(result) ? fetchedUsers.length : result?.total || 0);
                    setPageCount(Array.isArray(result) ? 1 : result?.totalPages || 1);
                } catch (err) {
                    setError(err.message || 'Failed to fetch users');
                } finally {
                    setLoading(false);
                }
            };
            fetchUsers();
        }, 400);
        return () => clearTimeout(debounceTimer);
    }, [filterRole, searchTerm, page]);

    const pageSize = 10;
    const visibleUsers = users;
    useEffect(() => setPage((current) => Math.min(current, pageCount)), [pageCount]);

    // Existing menu click outside handler effect
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setSelectedUser(null);
                setMenuPosition(null);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    // ================================
    // EDIT
    // ================================

    const handleEdit = () => {
        setEditName(selectedUser.name || "");
        setEditEmail(selectedUser.email || "");
        setEditPhone(selectedUser.phonenumber || selectedUser.phone || "");
        setWalletAmount(selectedUser.wallet || "");
        setSelectedRole(selectedUser.role || "");

        setMenuPosition(null);

        setShowEditModal(true);
    };

    // ================================
    // CREATE USER
    // ================================

    const handleOpenCreate = () => {
        setEditName("");
        setEditEmail("");
        setEditPhone("");
        setWalletAmount("");
        setSelectedRole("ROL_1");
        setShowCreateModal(true);
    };

    const handleCreateSave = async () => {
        if (!editName.trim() || !editPhone.trim()) {
            alert('Name and Phone number are required.');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: editName,
                phonenumber: editPhone,
            };
            if (editEmail.trim()) payload.email = editEmail;
            if (selectedRole) payload.role = selectedRole;
            if (walletAmount !== "" && walletAmount !== undefined) {
                payload.wallet = String(walletAmount);
            }
            await api.post('/v1/users', payload);
            // Re-fetch users
            const params = { page: 1, limit: 10 };
            if (filterRole) params.role = filterRole;
            if (searchTerm.trim()) params.search = searchTerm.trim();
            const response = await api.get('/v1/users', { params });
            const result = response.data?.data ?? response.data;
            const fetchedUsers = Array.isArray(result) ? result : result?.items || [];
            setUsers(fetchedUsers);
            setTotalUsers(Array.isArray(result) ? fetchedUsers.length : result?.total || 0);
            setPageCount(Array.isArray(result) ? 1 : result?.totalPages || 1);
            setPage(1);
            setShowCreateModal(false);
        } catch (err) {
            alert('Failed to create user: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    // ================================
    // DELETE
    // ================================

    const handleDelete = () => {
        if (
            window.confirm(
                `Are you sure you want to delete ${selectedUser.name}?`
            )
        ) {
            console.log("Delete user:", selectedUser.id);

            // API call here
            // await deleteUser(selectedUser.id)

            setSelectedUser(null);
            setMenuPosition(null);
        }
    };

    // ================================
    // SAVE USER
    // ================================

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                name: editName,
                email: editEmail,
                phonenumber: editPhone,
            };
            if (selectedRole) payload.role = selectedRole;
            if (walletAmount !== "" && walletAmount !== undefined) {
                payload.wallet = String(walletAmount);
            }
            await api.put(`/v1/users/${selectedUser.id}`, payload);
            // Re-fetch users to reflect changes
            const params = { page, limit: 10 };
            if (filterRole) params.role = filterRole;
            if (searchTerm.trim()) params.search = searchTerm.trim();
            const response = await api.get('/v1/users', { params });
            const result = response.data?.data ?? response.data;
            const fetchedUsers = Array.isArray(result) ? result : result?.items || [];
            setUsers(fetchedUsers);
            setTotalUsers(Array.isArray(result) ? fetchedUsers.length : result?.total || 0);
            setPageCount(Array.isArray(result) ? 1 : result?.totalPages || 1);
            setShowEditModal(false);
            setSelectedUser(null);
        } catch (err) {
            alert('Failed to update user: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: "24px" }}>
            {/* ================================
          HEADER
      ================================= */}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ fontSize: "2rem", margin: 0 }}>
                    User Management
                </h1>
                <button
                    onClick={handleOpenCreate}
                    style={{
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: "none",
                        background: "var(--primary-color)",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "14px",
                    }}
                >
                    + Create User
                </button>
            </div>

            {/* ================================
          ROLE FILTER
      ================================= */}

            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-color)" }}>
                        Role:
                    </label>
                    <select
                        value={filterRole}
                        onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                        style={{ ...selectStyle, width: "180px" }}
                    >
                        <option value="">All Roles</option>
                        {roles.map((role) => (
                            <option key={role.value} value={role.value}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "200px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-color)" }}>
                        Search:
                    </label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        placeholder="Search by name, phone, email..."
                        style={{
                            flex: 1,
                            padding: "11px 12px",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            backgroundColor: "var(--card-bg)",
                            color: "var(--text-color)",
                            outline: "none",
                            fontSize: "14px",
                        }}
                    />
                </div>
            </div>

            {/* ================================
          TABLE
      ================================= */}

            {!loading && !error && (
                <div style={{
                    backgroundColor: "var(--card-bg)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-color)",
                    overflow: "hidden",
                    boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}>
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        borderBottom:
                                            "1px solid var(--border-color)",
                                    }}
                                >
                                    <th style={headerStyle}>ID</th>
                                    <th style={headerStyle}>Name</th>
                                    <th style={headerStyle}>Phone</th>
                                    <th style={headerStyle}>Role</th>
                                    <th style={headerStyle}>Email</th>
                                    <th
                                        style={{
                                            ...headerStyle,
                                            width: "60px",
                                            textAlign: "center",
                                        }}
                                    >
                                        #
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {visibleUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        style={{
                                            borderBottom:
                                                "1px solid var(--border-color)",
                                        }}
                                    >
                                        <td style={cellStyle}>{user.userId || user.id}</td>
                                        <td style={cellStyle}>{user.name}</td>
                                        <td style={cellStyle}>{user.phonenumber || ''}</td>
                                        <td style={cellStyle}>
                                            {roles.find(r => r.value === user.role)?.name || user.role}
                                        </td>
                                        <td style={cellStyle}>{user.email || ''}</td>

                                        {/* THREE DOTS */}

                                        <td style={{
                                            ...cellStyle,
                                            textAlign: "center",
                                        }}>
                                            <button
                                                onClick={(event) =>
                                                    handleMenuClick(event, user)
                                                }
                                                style={threeDotButton}
                                            >
                                                ⋮
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {!loading && !error && users.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "16px", color: "var(--text-muted)", fontSize: "14px" }} aria-label="User pages">
                    <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalUsers)} of {totalUsers}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} style={paginationButtonStyle}>Previous</button>
                        <span>Page {page} of {pageCount}</span>
                        <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} style={paginationButtonStyle}>Next</button>
                    </div>
                </div>
            )}
            {loading && <p>Loading users...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {/* ================================
          THREE DOT MENU
      ================================= */}

            {selectedUser && menuPosition && (
                <div
                    ref={menuRef}
                    style={{
                        position: "fixed",
                        top: menuPosition.top,
                        right: menuPosition.right,
                        width: "150px",
                        backgroundColor: "var(--card-bg)",
                        border:
                            "1px solid var(--border-color)",
                        borderRadius: "10px",
                        padding: "6px",
                        boxShadow:
                            "0 10px 25px rgba(0, 0, 0, 0.15)",
                        zIndex: 9999,
                    }}
                >
                    <button
                        onClick={handleEdit}
                        style={menuItemStyle}
                    >
                        Edit
                    </button>

                    <button
                        onClick={handleDelete}
                        style={{
                            ...menuItemStyle,
                            color: "#dc2626",
                        }}
                    >
                        Delete
                    </button>
                </div>
            )}

            {/* ================================
          EDIT USER MODAL
      ================================= */}

            {showEditModal && selectedUser && (
                <div style={modalOverlay}>
                    <div style={editModal}>
                        {/* HEADER */}

                        <div style={modalHeader}>
                            <div>
                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: "20px",
                                    }}
                                >
                                    Edit User
                                </h2>

                                <p
                                    style={{
                                        margin: "5px 0 0",
                                        color: "var(--text-muted)",
                                        fontSize: "13px",
                                    }}
                                >
                                    {selectedUser.id}
                                </p>
                            </div>

                            <button
                                onClick={() =>
                                    setShowEditModal(false)
                                }
                                style={closeButton}
                            >
                                ×
                            </button>
                        </div>

                        {/* USER DETAILS */}

                        {/* NAME */}
                        <div style={formGroup}>
                            <label style={formLabel}>Name</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Enter name"
                                style={{
                                    width: "100%",
                                    padding: "11px 12px",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--card-bg)",
                                    color: "var(--text-color)",
                                    outline: "none",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        {/* EMAIL */}
                        <div style={formGroup}>
                            <label style={formLabel}>Email</label>
                            <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="Enter email"
                                style={{
                                    width: "100%",
                                    padding: "11px 12px",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--card-bg)",
                                    color: "var(--text-color)",
                                    outline: "none",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        {/* PHONE */}
                        <div style={formGroup}>
                            <label style={formLabel}>Phone</label>
                            <input
                                type="text"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="Enter phone number"
                                style={{
                                    width: "100%",
                                    padding: "11px 12px",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--card-bg)",
                                    color: "var(--text-color)",
                                    outline: "none",
                                    fontSize: "14px",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        {/* WALLET */}

                        <div style={formGroup}>
                            <label style={formLabel}>
                                Wallet Amount
                            </label>

                            <div style={walletInputContainer}>
                                <span style={currency}>
                                    ₹
                                </span>

                                <input
                                    type="number"
                                    value={walletAmount}
                                    onChange={(e) =>
                                        setWalletAmount(e.target.value)
                                    }
                                    placeholder="Enter wallet amount"
                                    style={walletInput}
                                />
                            </div>
                        </div>

                        {/* ROLE */}

                        <div style={formGroup}>
                            <label style={formLabel}>
                                Assign Role
                            </label>

                            <select
                                value={selectedRole}
                                onChange={(e) =>
                                    setSelectedRole(e.target.value)
                                }
                                style={selectStyle}
                            >
                                <option value="">
                                    Select role
                                </option>

                                {roles.map((role) => (
                                    <option
                                        key={role.value}
                                        value={role.value}
                                    >
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* ACTIONS */}

                        <div style={modalActions}>
                            <button
                                onClick={() =>
                                    setShowEditModal(false)
                                }
                                style={cancelButton}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    ...saveButton,
                                    opacity: saving ? 0.6 : 1,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================
          CREATE USER MODAL
      ================================= */}

            {showCreateModal && (
                <div style={modalOverlay}>
                    <div style={editModal}>
                        <div style={modalHeader}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: "20px" }}>
                                    Create User
                                </h2>
                                <p style={{ margin: "5px 0 0", color: "var(--text-muted)", fontSize: "13px" }}>
                                    Add a new user to the system
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={closeButton}
                            >
                                ×
                            </button>
                        </div>

                        {/* NAME */}
                        <div style={formGroup}>
                            <label style={formLabel}>Name *</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Enter name"
                                style={inputStyle}
                            />
                        </div>

                        {/* PHONE */}
                        <div style={formGroup}>
                            <label style={formLabel}>Phone Number *</label>
                            <input
                                type="text"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="e.g. +919876543210"
                                style={inputStyle}
                            />
                        </div>

                        {/* EMAIL */}
                        <div style={formGroup}>
                            <label style={formLabel}>Email</label>
                            <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="Enter email"
                                style={inputStyle}
                            />
                        </div>

                        {/* WALLET */}
                        <div style={formGroup}>
                            <label style={formLabel}>Wallet Amount</label>
                            <div style={walletInputContainer}>
                                <span style={currency}>₹</span>
                                <input
                                    type="number"
                                    value={walletAmount}
                                    onChange={(e) => setWalletAmount(e.target.value)}
                                    placeholder="Enter wallet amount"
                                    style={walletInput}
                                />
                            </div>
                        </div>

                        {/* ROLE */}
                        <div style={formGroup}>
                            <label style={formLabel}>Role</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="">Select role</option>
                                {roles.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* ACTIONS */}
                        <div style={modalActions}>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={cancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateSave}
                                disabled={saving}
                                style={{
                                    ...saveButton,
                                    opacity: saving ? 0.6 : 1,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {saving ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* =========================================
   STYLES
========================================= */

const headerStyle = {
    padding: "16px",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-muted)",
};
const inputStyle = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    backgroundColor: "var(--card-bg)",
    color: "var(--text-color)",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
};

const cellStyle = {
    padding: "16px",
    fontSize: "14px",
    color: "var(--text-color)",
};

const threeDotButton = {
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "6px",
    background: "transparent",
    cursor: "pointer",
    fontSize: "22px",
    color: "var(--text-muted)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
};

const menuItemStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "none",
    borderRadius: "7px",
    background: "transparent",
    color: "var(--text-color)",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14px",
};

const modalOverlay = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "20px",
};

const editModal = {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "var(--card-bg)",
    borderRadius: "14px",
    border: "1px solid var(--border-color)",
    padding: "24px",
    boxShadow:
        "0 20px 50px rgba(0, 0, 0, 0.2)",
};

const modalHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
};

const closeButton = {
    border: "none",
    background: "transparent",
    fontSize: "26px",
    cursor: "pointer",
    color: "var(--text-muted)",
};

const detailsContainer = {
    display: "grid",
    gap: "14px",
    padding: "16px",
    backgroundColor:
        "var(--section-bg, rgba(0,0,0,0.03))",
    borderRadius: "10px",
    marginBottom: "22px",
};

const detailItem = {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    fontSize: "14px",
};

const labelStyle = {
    color: "var(--text-muted)",
};

const formGroup = {
    marginBottom: "18px",
};

const formLabel = {
    display: "block",
    marginBottom: "7px",
    fontSize: "14px",
    fontWeight: "600",
};

const walletInputContainer = {
    display: "flex",
    alignItems: "center",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    overflow: "hidden",
};

const currency = {
    padding: "11px 12px",
    color: "var(--text-muted)",
    backgroundColor:
        "var(--section-bg, rgba(0,0,0,0.03))",
};

const walletInput = {
    flex: 1,
    padding: "11px",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text-color)",
    fontSize: "14px",
};

const selectStyle = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    backgroundColor: "var(--card-bg)",
    color: "var(--text-color)",
    outline: "none",
};

const paginationButtonStyle = {
    padding: "8px 12px",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    background: "var(--card-bg)",
    color: "var(--text-color)",
    cursor: "pointer",
};

const modalActions = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "24px",
};

const cancelButton = {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "1px solid var(--border-color)",
    background: "transparent",
    color: "var(--text-color)",
    cursor: "pointer",
};

const saveButton = {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "none",
    background: "var(--primary-color)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
};

export default UserManagement;
