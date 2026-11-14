
import React, { useEffect, useRef, useState } from "react";
import {
    Search,
    Plus,
    MoreVertical,
    Pencil,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    Users,
} from "lucide-react";
import api from "../../api/axiosInstance";
import "./UserManagement.css";

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

    const [filterRole, setFilterRole] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);

    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");

    const [saving, setSaving] = useState(false);

    const menuRef = useRef(null);

    const pageSize = 10;

    /* =====================================================
       ROLES
    ===================================================== */

    const roles = [
        { name: "SuperAdmin", value: "ROL_1" },
        { name: "Admin", value: "ROL_2" },
        { name: "Coordinator", value: "ROL_3" },
        { name: "CollectionAgent", value: "ROL_4" },
        { name: "User", value: "ROL_5" },
        { name: "Client Admin", value: "ROL_6" },
        { name: "Guest User", value: "ROL_7" },
    ];

    /* =====================================================
       FETCH USERS
    ===================================================== */

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 400);

        return () => clearTimeout(timer);
    }, [page, filterRole, searchTerm]);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = {
                page,
                limit: pageSize,
            };

            if (filterRole) {
                params.role = filterRole;
            }

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            const response = await api.get("/v1/users", {
                params,
            });

            const result =
                response.data?.data ??
                response.data;

            const fetchedUsers = Array.isArray(result)
                ? result
                : result?.items || [];

            setUsers(fetchedUsers);

            setTotalUsers(
                Array.isArray(result)
                    ? fetchedUsers.length
                    : result?.total || 0
            );

            setPageCount(
                Array.isArray(result)
                    ? 1
                    : result?.totalPages || 1
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Failed to fetch users"
            );
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       CLOSE MENU
    ===================================================== */

    useEffect(() => {
        const handleOutsideClick = (event) => {
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
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);

    /* =====================================================
       ACTION MENU
    ===================================================== */

    const handleMenuClick = (event, user) => {
        const rect =
            event.currentTarget.getBoundingClientRect();

        setSelectedUser(user);

        setMenuPosition({
            top: rect.bottom + 6,
            right:
                window.innerWidth -
                rect.right,
        });
    };

    /* =====================================================
       EDIT USER
    ===================================================== */

    const handleEdit = () => {
        if (!selectedUser) return;

        setEditName(
            selectedUser.name || ""
        );

        setEditEmail(
            selectedUser.email || ""
        );

        setEditPhone(
            selectedUser.phonenumber ||
            selectedUser.phone ||
            ""
        );

        setWalletAmount(
            selectedUser.wallet ?? ""
        );

        setSelectedRole(
            selectedUser.role || ""
        );

        setMenuPosition(null);
        setShowEditModal(true);
    };

    /* =====================================================
       OPEN CREATE
    ===================================================== */

    const handleOpenCreate = () => {
        setEditName("");
        setEditEmail("");
        setEditPhone("");
        setWalletAmount("");
        setSelectedRole("");

        setShowCreateModal(true);
    };

    /* =====================================================
       CREATE USER
    ===================================================== */

    const handleCreateSave = async () => {
        if (
            !editName.trim() ||
            !editPhone.trim()
        ) {
            alert(
                "Name and Phone number are required."
            );
            return;
        }

        setSaving(true);

        try {
            const payload = {
                name: editName.trim(),
                phonenumber: editPhone.trim(),
            };

            if (editEmail.trim()) {
                payload.email = editEmail.trim();
            }

            if (selectedRole) {
                payload.role = selectedRole;
            }

            if (walletAmount !== "") {
                payload.wallet =
                    String(walletAmount);
            }

            await api.post(
                "/v1/users",
                payload
            );

            setShowCreateModal(false);
            setPage(1);

            await fetchUsers();
        } catch (err) {
            alert(
                err.response?.data?.message ||
                err.message ||
                "Failed to create user"
            );
        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
       SAVE EDIT
    ===================================================== */

    const handleSave = async () => {
        if (!selectedUser) return;

        setSaving(true);

        try {
            const payload = {
                name: editName.trim(),
                email: editEmail.trim(),
                phonenumber: editPhone.trim(),
            };

            if (selectedRole) {
                payload.role =
                    selectedRole;
            }

            if (walletAmount !== "") {
                payload.wallet =
                    String(walletAmount);
            }

            await api.put(
                `/v1/users/${selectedUser.id}`,
                payload
            );

            setShowEditModal(false);
            setSelectedUser(null);

            await fetchUsers();
        } catch (err) {
            alert(
                err.response?.data?.message ||
                err.message ||
                "Failed to update user"
            );
        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
       DELETE
    ===================================================== */

    const handleDelete = async () => {
        if (!selectedUser) return;

        const confirmed =
            window.confirm(
                `Are you sure you want to delete ${selectedUser.name}?`
            );

        if (!confirmed) {
            return;
        }

        try {
            // Enable when backend delete API is ready.
            // await api.delete(`/v1/users/${selectedUser.id}`);

            setSelectedUser(null);
            setMenuPosition(null);

            alert(
                "Delete API is not connected yet."
            );
        } catch (err) {
            alert(
                err.response?.data?.message ||
                err.message ||
                "Failed to delete user"
            );
        }
    };

    /* =====================================================
       ROLE NAME
    ===================================================== */

    const getRoleName = (role) => {
        return (
            roles.find(
                (item) =>
                    item.value === role
            )?.name ||
            role ||
            "Unknown"
        );
    };

    /* =====================================================
       ROLE CLASS
    ===================================================== */

    const getRoleClass = (role) => {
        switch (role) {
            case "ROL_1":
                return "role-superadmin";

            case "ROL_2":
                return "role-admin";

            case "ROL_3":
                return "role-coordinator";

            case "ROL_4":
                return "role-agent";

            case "ROL_5":
                return "role-user";

            case "ROL_6":
                return "role-client";

            case "ROL_7":
                return "role-guest";

            default:
                return "role-default";
        }
    };

    /* =====================================================
       FILTER
    ===================================================== */

    const handleRoleFilter = (value) => {
        setFilterRole(value);
        setPage(1);
    };

    /* =====================================================
       SEARCH
    ===================================================== */

    const handleSearch = (value) => {
        setSearchTerm(value);
        setPage(1);
    };

    return (
        <div className="user-management">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="user-page-header">

                <div className="page-heading">

                    <div className="page-title-row">

                        <div className="page-title-icon">
                            <Users size={19} />
                        </div>

                        <h1>
                            User Management
                        </h1>

                    </div>

                    <p>
                        Manage users, roles and
                        wallet accounts
                    </p>

                </div>

                <button
                    className="create-user-btn"
                    onClick={handleOpenCreate}
                >
                    <Plus size={17} />

                    <span>
                        Create User
                    </span>
                </button>

            </div>

            {/* =================================================
                FILTER TOOLBAR
            ================================================= */}

            <div className="user-toolbar">

                <div className="role-filter">

                    <label>
                        Role
                    </label>

                    <select
                        value={filterRole}
                        onChange={(e) =>
                            handleRoleFilter(
                                e.target.value
                            )
                        }
                    >
                        <option value="">
                            All Roles
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

                <div className="user-search">

                    <Search size={17} />

                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) =>
                            handleSearch(
                                e.target.value
                            )
                        }
                        placeholder="Search by name, phone or email..."
                    />

                    {searchTerm && (
                        <button
                            className="clear-search"
                            onClick={() =>
                                handleSearch("")
                            }
                        >
                            <X size={15} />
                        </button>
                    )}

                </div>

            </div>

            {/* =================================================
                USERS CARD
            ================================================= */}

            <div className="users-card">

                <div className="table-top">

                    <div>
                        <h3>
                            Users
                        </h3>

                        <span>
                            {totalUsers} users found
                        </span>
                    </div>

                </div>

                {/* =================================================
                    LOADING
                ================================================= */}

                {loading && (
                    <div className="user-loading">

                        <div className="loading-table">

                            {[1, 2, 3, 4, 5].map(
                                (item) => (
                                    <div
                                        className="loading-row"
                                        key={item}
                                    >

                                        <div className="skeleton skeleton-id"></div>

                                        <div className="loading-user">

                                            <div className="skeleton skeleton-avatar"></div>

                                            <div className="loading-user-text">

                                                <div className="skeleton skeleton-name"></div>

                                                <div className="skeleton skeleton-email"></div>

                                            </div>

                                        </div>

                                        <div className="skeleton skeleton-phone"></div>

                                        <div className="skeleton skeleton-role"></div>

                                        <div className="skeleton skeleton-email-cell"></div>

                                        <div className="skeleton skeleton-action"></div>

                                    </div>
                                )
                            )}

                        </div>

                    </div>
                )}

                {/* =================================================
                    ERROR
                ================================================= */}

                {!loading && error && (
                    <div className="table-error">

                        <div className="error-box">

                            <span>
                                Unable to load users
                            </span>

                            <p>
                                {error}
                            </p>

                            <button
                                onClick={fetchUsers}
                            >
                                Try Again
                            </button>

                        </div>

                    </div>
                )}

                {/* =================================================
                    TABLE
                ================================================= */}

                {!loading && !error && (
                    <>
                        <div className="table-wrapper">

                            <table>

                                <thead>

                                    <tr>

                                        <th>
                                            User ID
                                        </th>

                                        <th>
                                            User
                                        </th>

                                        <th>
                                            Phone
                                        </th>

                                        <th>
                                            Role
                                        </th>

                                        <th>
                                            Email
                                        </th>

                                        <th className="action-column">
                                            Action
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {users.length === 0 ? (
                                        <tr>

                                            <td
                                                colSpan={6}
                                                className="empty-state"
                                            >

                                                <div>

                                                    <Users
                                                        size={32}
                                                    />

                                                    <strong>
                                                        No users found
                                                    </strong>

                                                    <span>
                                                        Try changing your search or role filter.
                                                    </span>

                                                </div>

                                            </td>

                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr
                                                key={
                                                    user.id ||
                                                    user._id
                                                }
                                            >

                                                {/* USER ID */}

                                                <td data-label="User ID">

                                                    <span className="user-id">
                                                        {user.userId ||
                                                            user.id ||
                                                            user._id}
                                                    </span>

                                                </td>

                                                {/* USER */}

                                                <td data-label="User">

                                                    <div className="user-info">

                                                        <div className="avatar">
                                                            {(user.name ||
                                                                "U")
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </div>

                                                        <div>

                                                            <div className="user-name">
                                                                {user.name ||
                                                                    "Unnamed User"}
                                                            </div>

                                                            <div className="user-sub">
                                                                {user.email ||
                                                                    "No email"}
                                                            </div>

                                                        </div>

                                                    </div>

                                                </td>

                                                {/* PHONE */}

                                                <td data-label="Phone">

                                                    <span className="phone-text">
                                                        {user.phonenumber ||
                                                            user.phone ||
                                                            "—"}
                                                    </span>

                                                </td>

                                                {/* ROLE */}

                                                <td data-label="Role">

                                                    <span
                                                        className={`role-badge ${getRoleClass(
                                                            user.role
                                                        )}`}
                                                    >

                                                        <span className="role-dot"></span>

                                                        {getRoleName(
                                                            user.role
                                                        )}

                                                    </span>

                                                </td>

                                                {/* EMAIL */}

                                                <td data-label="Email">

                                                    <span className="email-text">
                                                        {user.email ||
                                                            "—"}
                                                    </span>

                                                </td>

                                                {/* ACTION */}

                                                <td
                                                    data-label="Action"
                                                    className="action-column"
                                                >

                                                    <button
                                                        className="more-btn"
                                                        onClick={(event) =>
                                                            handleMenuClick(
                                                                event,
                                                                user
                                                            )
                                                        }
                                                    >
                                                        <MoreVertical
                                                            size={18}
                                                        />
                                                    </button>

                                                </td>

                                            </tr>
                                        ))
                                    )}

                                </tbody>

                            </table>

                        </div>

                        {/* =================================================
                            PAGINATION
                        ================================================= */}

                        {users.length > 0 && (
                            <div className="pagination">

                                <div className="pagination-info">

                                    Showing{" "}

                                    <span className="pagination-number">
                                        {(page - 1) *
                                            pageSize +
                                            1}
                                    </span>

                                    {" – "}

                                    <span className="pagination-number">
                                        {Math.min(
                                            page *
                                                pageSize,
                                            totalUsers
                                        )}
                                    </span>

                                    {" of "}

                                    <span className="pagination-number">
                                        {totalUsers}
                                    </span>

                                </div>

                                <div className="pagination-controls">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage(
                                                (current) =>
                                                    Math.max(
                                                        1,
                                                        current -
                                                            1
                                                    )
                                            )
                                        }
                                        disabled={
                                            page === 1
                                        }
                                    >
                                        <ChevronLeft
                                            size={17}
                                        />
                                    </button>

                                    <span>
                                        {page} / {pageCount}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage(
                                                (current) =>
                                                    Math.min(
                                                        pageCount,
                                                        current +
                                                            1
                                                    )
                                            )
                                        }
                                        disabled={
                                            page ===
                                            pageCount
                                        }
                                    >
                                        <ChevronRight
                                            size={17}
                                        />
                                    </button>

                                </div>

                            </div>
                        )}

                    </>
                )}

            </div>

            {/* =================================================
                ACTION MENU
            ================================================= */}

            {selectedUser && menuPosition && (
                <div
                    ref={menuRef}
                    className="user-action-menu"
                    style={{
                        top: menuPosition.top,
                        right: menuPosition.right,
                    }}
                >

                    <button onClick={handleEdit}>

                        <Pencil size={16} />

                        Edit

                    </button>

                    <button
                        className="delete-menu-item"
                        onClick={handleDelete}
                    >

                        <Trash2 size={16} />

                        Delete

                    </button>

                </div>
            )}

            {/* =================================================
                EDIT MODAL
            ================================================= */}

            {showEditModal && selectedUser && (
                <div className="modal-overlay">

                    <div className="user-modal">

                        <div className="modal-header">

                            <div className="modal-header-left">

                                <div className="modal-icon">
                                    <Pencil size={18} />
                                </div>

                                <div className="modal-title">

                                    <h2>
                                        Edit User
                                    </h2>

                                    <p>
                                        Update user information
                                    </p>

                                </div>

                            </div>

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowEditModal(false)
                                }
                            >
                                <X size={19} />
                            </button>

                        </div>

                        <div className="modal-body">

                            <div className="form-row">

                                <FormField
                                    label="Name"
                                    value={editName}
                                    onChange={setEditName}
                                    placeholder="Enter name"
                                />

                                <FormField
                                    label="Phone"
                                    value={editPhone}
                                    onChange={setEditPhone}
                                    placeholder="Enter phone"
                                />

                            </div>

                            <FormField
                                label="Email"
                                type="email"
                                value={editEmail}
                                onChange={setEditEmail}
                                placeholder="Enter email"
                            />

                            <div className="form-row">

                                <div className="form-group">

                                    <label>
                                        Wallet Amount
                                    </label>

                                    <div className="wallet-input">

                                        <span>
                                            ₹
                                        </span>

                                        <input
                                            type="number"
                                            value={
                                                walletAmount
                                            }
                                            onChange={(e) =>
                                                setWalletAmount(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="0"
                                        />

                                    </div>

                                </div>

                                <div className="form-group">

                                    <label>
                                        Assign Role
                                    </label>

                                    <select
                                        value={
                                            selectedRole
                                        }
                                        onChange={(e) =>
                                            setSelectedRole(
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="">
                                            Select role
                                        </option>

                                        {roles.map(
                                            (role) => (
                                                <option
                                                    key={
                                                        role.value
                                                    }
                                                    value={
                                                        role.value
                                                    }
                                                >
                                                    {
                                                        role.name
                                                    }
                                                </option>
                                            )
                                        )}

                                    </select>

                                </div>

                            </div>

                        </div>

                        <div className="modal-footer">

                            <button
                                className="secondary-btn"
                                onClick={() =>
                                    setShowEditModal(
                                        false
                                    )
                                }
                            >
                                Cancel
                            </button>

                            <button
                                className="primary-btn"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : "Save Changes"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* =================================================
                CREATE MODAL
            ================================================= */}

            {showCreateModal && (
                <div className="modal-overlay">

                    <div className="user-modal">

                        <div className="modal-header">

                            <div className="modal-header-left">

                                <div className="modal-icon">
                                    <Plus size={19} />
                                </div>

                                <div className="modal-title">

                                    <h2>
                                        Create User
                                    </h2>

                                    <p>
                                        Add a new user to the system
                                    </p>

                                </div>

                            </div>

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowCreateModal(
                                        false
                                    )
                                }
                            >
                                <X size={19} />
                            </button>

                        </div>

                        <div className="modal-body">

                            <div className="form-row">

                                <FormField
                                    label="Name *"
                                    value={editName}
                                    onChange={setEditName}
                                    placeholder="Enter name"
                                />

                                <FormField
                                    label="Phone Number *"
                                    value={editPhone}
                                    onChange={setEditPhone}
                                    placeholder="+919876543210"
                                />

                            </div>

                            <FormField
                                label="Email"
                                type="email"
                                value={editEmail}
                                onChange={setEditEmail}
                                placeholder="Enter email"
                            />

                            <div className="form-row">

                                <div className="form-group">

                                    <label>
                                        Wallet Amount
                                    </label>

                                    <div className="wallet-input">

                                        <span>
                                            ₹
                                        </span>

                                        <input
                                            type="number"
                                            value={
                                                walletAmount
                                            }
                                            onChange={(e) =>
                                                setWalletAmount(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="0"
                                        />

                                    </div>

                                </div>

                                <div className="form-group">

                                    <label>
                                        Role
                                    </label>

                                    <select
                                        value={
                                            selectedRole
                                        }
                                        onChange={(e) =>
                                            setSelectedRole(
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="">
                                            Select role
                                        </option>

                                        {roles.map(
                                            (role) => (
                                                <option
                                                    key={
                                                        role.value
                                                    }
                                                    value={
                                                        role.value
                                                    }
                                                >
                                                    {
                                                        role.name
                                                    }
                                                </option>
                                            )
                                        )}

                                    </select>

                                </div>

                            </div>

                        </div>

                        <div className="modal-footer">

                            <button
                                className="secondary-btn"
                                onClick={() =>
                                    setShowCreateModal(
                                        false
                                    )
                                }
                            >
                                Cancel
                            </button>

                            <button
                                className="primary-btn"
                                onClick={
                                    handleCreateSave
                                }
                                disabled={
                                    saving
                                }
                            >
                                {saving
                                    ? "Creating..."
                                    : "Create User"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
};

/* =========================================================
   FORM FIELD
========================================================= */

const FormField = ({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
}) => {
    return (
        <div className="form-group">

            <label>
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(e) =>
                    onChange(
                        e.target.value
                    )
                }
                placeholder={placeholder}
            />

        </div>
    );
};

export default UserManagement;
