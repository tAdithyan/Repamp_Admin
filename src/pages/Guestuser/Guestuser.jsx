import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  Trash2,
  Users,
  User,
  X,
  Loader2,
} from "lucide-react";

import api from "../../api/axiosInstance";
import "./Guestuser.css";

export default function Guestuser() {
  const [guestName, setGuestName] = useState("");
  const [search, setSearch] = useState("");

  const [guestUsers, setGuestUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // FETCH GUEST USERS
  // =====================================================

  const fetchGuestUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/v1/guest-users");

      if (response.data?.success) {
        setGuestUsers(response.data.data || []);
      } else {
        setError(
          response.data?.message || "Failed to fetch guest users."
        );
      }
    } catch (err) {
      console.error("Fetch guest users error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load guest users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuestUsers();
  }, []);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredGuests = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return guestUsers;
    }

    return guestUsers.filter((guest) => {
      const name = guest.name?.toLowerCase() || "";

      const loginId =
        guest.guestloginid?.toLowerCase() || "";

      return (
        name.includes(value) ||
        loginId.includes(value)
      );
    });
  }, [guestUsers, search]);

  // =====================================================
  // HANDLE GUEST UNIQUE ID INPUT
  // =====================================================

  const handleGuestUniqueIdChange = (e) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    setGuestName(value);
  };

  // =====================================================
  // CREATE GUEST USER
  // =====================================================

  const handleCreateGuest = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const name = guestName.trim();

    if (!name) {
      setError("Please enter Guest UniqueID.");
      return;
    }

    // Extra validation before sending to backend
    if (!/^[A-Z0-9]+$/.test(name)) {
      setError(
        "Guest UniqueID can contain only uppercase letters and numbers."
      );
      return;
    }

    try {
      setCreating(true);

      const response = await api.post(
        "/v1/guest-users",
        {
          name,
        }
      );

      if (!response.data?.success) {
        setError(
          response.data?.message ||
            "Failed to create guest user."
        );
        return;
      }

      const newGuest = response.data.data;

      setGuestUsers((prev) => [
        newGuest,
        ...prev,
      ]);

      setGuestName("");

      setSuccess(
        `Guest user created successfully. Login ID: ${newGuest.guestloginid}`
      );
    } catch (err) {
      console.error(
        "Create guest user error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to create guest user."
      );
    } finally {
      setCreating(false);
    }
  };

  // =====================================================
  // TOGGLE GUEST STATUS
  // =====================================================

  const handleToggleStatus = async (guest) => {
    const currentStatus =
      guest.status === "Active"
        ? "Active"
        : "Inactive";

    const newStatus =
      currentStatus === "Active"
        ? "Inactive"
        : "Active";

    setError("");
    setSuccess("");

    try {
      setUpdatingStatusId(guest.id);

      const response = await api.put(
        `/v1/guest-users/${guest.id}`,
        {
          name: guest.name,
          status: newStatus,
        }
      );

      if (!response.data?.success) {
        setError(
          response.data?.message ||
            "Failed to update guest status."
        );
        return;
      }

      const updatedGuest =
        response.data.data;

      setGuestUsers((prev) =>
        prev.map((item) =>
          item.id === guest.id
            ? updatedGuest
            : item
        )
      );

      setSuccess(
        `Guest user ${
          newStatus === "Active"
            ? "activated"
            : "deactivated"
        } successfully.`
      );
    } catch (err) {
      console.error(
        "Update guest status error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to update guest status."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // =====================================================
  // DELETE GUEST USER
  // =====================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this guest user?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      setDeletingId(id);

      const response = await api.delete(
        `/v1/guest-users/${id}`
      );

      if (!response.data?.success) {
        setError(
          response.data?.message ||
            "Failed to delete guest user."
        );
        return;
      }

      setGuestUsers((prev) =>
        prev.filter(
          (guest) => guest.id !== id
        )
      );

      setSuccess(
        "Guest user deleted successfully."
      );
    } catch (err) {
      console.error(
        "Delete guest user error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to delete guest user."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="guest-users-page">

      {/* ================================================= */}
      {/* PAGE HEADER */}
      {/* ================================================= */}

      <div className="guest-page-header">

        <div>
          <div className="guest-section-label">
            USER MANAGEMENT
          </div>

          <h1 className="guest-users-title">
            Guest Users
          </h1>

          <p className="guest-users-description">
            Create and manage guest users.
          </p>
        </div>

        <div className="guest-count-badge">
          <Users size={16} />

          <span>
            {guestUsers.length} Guests
          </span>
        </div>

      </div>

      {/* ================================================= */}
      {/* ALERTS */}
      {/* ================================================= */}

      {error && (
        <div className="guest-alert guest-error">

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={15} />
          </button>

        </div>
      )}

      {success && (
        <div className="guest-alert guest-success">

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
          >
            <X size={15} />
          </button>

        </div>
      )}

      {/* ================================================= */}
      {/* CREATE GUEST */}
      {/* ================================================= */}

      <div className="guest-panel guest-create-panel">

        <div className="guest-panel-header">

          <div className="guest-panel-title-wrapper">

            <div className="guest-panel-icon">
              <UserPlus size={18} />
            </div>

            <div>
              <h2 className="guest-panel-title">
                Create Guest User
              </h2>

              <p className="guest-panel-description">
                Create a new guest user.
              </p>
            </div>

          </div>

        </div>

        <form onSubmit={handleCreateGuest}>

          <div className="guest-form-field">

            <label>
              Guest UniqueID
              <span>*</span>
            </label>

            <div className="guest-input-wrapper">

              <User size={17} />

              <input
                type="text"
                value={guestName}
                onChange={handleGuestUniqueIdChange}
                placeholder="Enter Guest UniqueID"
                disabled={creating}
                maxLength={30}
                autoComplete="off"
                spellCheck="false"
              />

            </div>

            <small className="guest-input-hint">
              Only uppercase letters (A-Z) and numbers (0-9) are allowed.
            </small>

          </div>

          <div className="guest-form-footer">

            <button
              type="submit"
              className="guest-create-button"
              disabled={creating || !guestName}
            >

              {creating ? (
                <>
                  <Loader2
                    size={17}
                    className="guest-spinner"
                  />

                  Creating...
                </>
              ) : (
                <>
                  <UserPlus size={17} />

                  Create Guest User
                </>
              )}

            </button>

          </div>

        </form>

      </div>

      {/* ================================================= */}
      {/* GUEST LIST */}
      {/* ================================================= */}

      <div className="guest-panel guest-list-panel">

        <div className="guest-list-header">

          <div>
            <h2 className="guest-panel-title">
              Guest Users List
            </h2>

            <p className="guest-panel-description">
              Manage guest users and account access.
            </p>
          </div>

          <div className="guest-total">
            {filteredGuests.length} users
          </div>

        </div>

        {/* ================================================= */}
        {/* SEARCH */}
        {/* ================================================= */}

        <div className="guest-search-wrapper">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search guest UniqueID..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          {search && (
            <button
              type="button"
              className="guest-clear-search"
              onClick={() => setSearch("")}
            >
              <X size={16} />
            </button>
          )}

        </div>

        {/* ================================================= */}
        {/* TABLE */}
        {/* ================================================= */}

        <div className="guest-table-wrapper">

          <table className="guest-table">

            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Guest Login ID</th>
                <th>Status</th>
                <th>Created</th>
                <th className="guest-actions-header">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="5"
                    className="guest-empty-cell"
                  >

                    <div className="guest-empty-state">

                      <Loader2
                        size={28}
                        className="guest-spinner"
                      />

                      <h3>
                        Loading guest users...
                      </h3>

                    </div>

                  </td>
                </tr>

              ) : filteredGuests.length > 0 ? (

                filteredGuests.map((guest) => {

                  const isActive =
                    guest.status === "Active";

                  const updatingStatus =
                    updatingStatusId ===
                    guest.id;

                  return (
                    <tr key={guest.id}>

                      {/* ===================== */}
                      {/* NAME */}
                      {/* ===================== */}

                      <td>

                        <div className="guest-user-info">

                          <div className="guest-avatar">
                            <User size={17} />
                          </div>

                          <div>

                            <div className="guest-name">
                              {guest.name}
                            </div>

                            <div className="guest-role">
                              Guest User
                            </div>

                          </div>

                        </div>

                      </td>

                      {/* ===================== */}
                      {/* LOGIN ID */}
                      {/* ===================== */}

                      <td>

                        <span className="guest-login-id">
                          {guest.guestloginid}
                        </span>

                      </td>

                      {/* ===================== */}
                      {/* STATUS */}
                      {/* ===================== */}

                      <td>

                        <div className="guest-status-control">

                          <button
                            type="button"
                            className={`guest-status-toggle ${
                              isActive
                                ? "active"
                                : ""
                            }`}
                            onClick={() =>
                              handleToggleStatus(
                                guest
                              )
                            }
                            disabled={
                              updatingStatus
                            }
                            title={
                              isActive
                                ? "Deactivate guest"
                                : "Activate guest"
                            }
                            aria-label={
                              isActive
                                ? "Deactivate guest"
                                : "Activate guest"
                            }
                          >

                            <span className="guest-status-knob">

                              {updatingStatus ? (
                                <Loader2
                                  size={10}
                                  className="guest-spinner"
                                />
                              ) : null}

                            </span>

                          </button>

                          <span
                            className={`guest-status-text ${
                              isActive
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {isActive
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </div>

                      </td>

                      {/* ===================== */}
                      {/* CREATED */}
                      {/* ===================== */}

                      <td>

                        <span className="guest-created">
                          {formatDate(
                            guest.createdAt
                          )}
                        </span>

                      </td>

                      {/* ===================== */}
                      {/* DELETE */}
                      {/* ===================== */}

                      <td>

                        <div className="guest-actions">

                          <button
                            type="button"
                            className="guest-delete-button"
                            onClick={() =>
                              handleDelete(
                                guest.id
                              )
                            }
                            disabled={
                              deletingId ===
                              guest.id
                            }
                            title="Delete guest user"
                          >

                            {deletingId ===
                            guest.id ? (
                              <Loader2
                                size={17}
                                className="guest-spinner"
                              />
                            ) : (
                              <Trash2
                                size={17}
                              />
                            )}

                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                })

              ) : (

                <tr>

                  <td
                    colSpan="5"
                    className="guest-empty-cell"
                  >

                    <div className="guest-empty-state">

                      <div className="guest-empty-icon">
                        <Users size={24} />
                      </div>

                      <h3>
                        No guest users found
                      </h3>

                      <p>
                        {search
                          ? "Try changing your search."
                          : "Create your first guest user."}
                      </p>

                    </div>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}