import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  IndianRupee,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import api from "../../api/axiosInstance";
import { queryKeys } from "../../api/queryKeys";
import { useWastePrices } from "../../hooks/useApiQueries";
import "./WastePricing.css";

const WastePricing = () => {
  const [prices, setPrices] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState("");
  const [deleting, setDeleting] = useState("");
  const [editing, setEditing] = useState("");
  const [editName, setEditName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const pricesQuery = useWastePrices();
  const loading = pricesQuery.isLoading;

  // Categories come only from the database.
  useEffect(() => {
    if (pricesQuery.data) {
      const saved = pricesQuery.data;
      setPrices(saved.map((item) => item.category));
      setDrafts(
        Object.fromEntries(
          saved.map((item) => [item.category, String(item.pricePerKg)]),
        ),
      );
    }
  }, [pricesQuery.data]);

  const loadPrices = () => pricesQuery.refetch();
  const queryError = pricesQuery.error;
  const displayError =
    error ||
    queryError?.response?.data?.message ||
    (queryError ? "Unable to load category prices." : "");

  const addCategory = () => {
    const value = category.trim();
    if (!value) return;
    if (prices.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setError(`"${value}" already exists.`);
      return;
    }
    setError("");
    setPrices((current) => [...current, value]);
    setDrafts((current) => ({ ...current, [value]: "" }));
    setCategory("");
  };

  const savePrice = async (wasteCategory) => {
    const pricePerKg = Number(drafts[wasteCategory]);
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      setError("Enter a valid price per kg.");
      return;
    }
    setSaving(wasteCategory);
    setError("");
    setMessage("");
    try {
      const response = await api.put(
        `/v1/waste-prices/${encodeURIComponent(wasteCategory)}`,
        { pricePerKg },
      );
      const updated = response.data?.data || {
        category: wasteCategory,
        pricePerKg,
      };
      queryClient.setQueryData(queryKeys.wastePrices, (current = []) => {
        const exists = current.some((item) => item.category === wasteCategory);
        return exists
          ? current.map((item) =>
              item.category === wasteCategory ? { ...item, ...updated } : item,
            )
          : [...current, updated];
      });
      setMessage(
        `${wasteCategory} base price saved at ₹${pricePerKg.toFixed(2)} per kg. 18% GST is added at billing.`,
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save this price.",
      );
    } finally {
      setSaving("");
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    setEditName(item);
    setError("");
    setMessage("");
  };

  const cancelEdit = () => {
    setEditing("");
    setEditName("");
  };

  const renameCategory = async (oldName) => {
    const newName = editName.trim();
    if (!newName) {
      setError("Category name cannot be empty.");
      return;
    }
    if (newName === oldName) {
      cancelEdit();
      return;
    }
    if (
      prices.some(
        (item) =>
          item !== oldName && item.toLowerCase() === newName.toLowerCase(),
      )
    ) {
      setError(`"${newName}" already exists.`);
      return;
    }

    setError("");
    setMessage("");
    const isSaved = (pricesQuery.data || []).some(
      (item) => item.category === oldName,
    );

    // Never saved: rename locally only.
    if (!isSaved) {
      setPrices((current) =>
        current.map((item) => (item === oldName ? newName : item)),
      );
      setDrafts((current) => {
        const { [oldName]: value, ...rest } = current;
        return { ...rest, [newName]: value };
      });
      cancelEdit();
      setMessage(`Renamed to ${newName}.`);
      return;
    }

    const pricePerKg = Number(drafts[oldName]);
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      setError("Enter a valid price per kg before renaming.");
      return;
    }

    setSaving(oldName);
    try {
      const response = await api.put(
        `/v1/waste-prices/${encodeURIComponent(oldName)}`,
        { pricePerKg, newCategory: newName },
      );
      const updated = response.data?.data || { pricePerKg };
      queryClient.setQueryData(queryKeys.wastePrices, (current = []) =>
        current.map((item) =>
          item.category === oldName
            ? { ...item, ...updated, category: newName }
            : item,
        ),
      );
      cancelEdit();
      setMessage(`"${oldName}" renamed to "${newName}".`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to rename this category.",
      );
    } finally {
      setSaving("");
    }
  };

  const deleteCategory = async (wasteCategory) => {
    const isSaved = (pricesQuery.data || []).some(
      (item) => item.category === wasteCategory,
    );
    const confirmed = window.confirm(
      isSaved
        ? `Delete "${wasteCategory}" and its saved price? Pickups for this category can no longer be billed automatically.`
        : `Remove "${wasteCategory}" from the list?`,
    );
    if (!confirmed) return;

    setError("");
    setMessage("");

    // Never saved: remove locally only.
    if (!isSaved) {
      setPrices((current) => current.filter((item) => item !== wasteCategory));
      setDrafts((current) => {
        const { [wasteCategory]: _omit, ...rest } = current;
        return rest;
      });
      setMessage(`${wasteCategory} removed.`);
      return;
    }

    setDeleting(wasteCategory);
    try {
      await api.delete(`/v1/waste-prices/${encodeURIComponent(wasteCategory)}`);
      queryClient.setQueryData(queryKeys.wastePrices, (current = []) =>
        current.filter((item) => item.category !== wasteCategory),
      );
      setMessage(`${wasteCategory} deleted.`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to delete this category.",
      );
    } finally {
      setDeleting("");
    }
  };

  return (
    <section className="pricing-page">
      <div className="pricing-header">
        <div>
          <span>Billing configuration</span>
          <h1>Waste category pricing</h1>
          <p>
            Set the base amount charged for each kilogram collected. GST is
            added at billing.
          </p>
        </div>
        <button onClick={loadPrices} disabled={loading}>
          <RefreshCw size={17} className={loading ? "pricing-spin" : ""} />{" "}
          Refresh
        </button>
      </div>
      {message && (
        <div className="pricing-message pricing-message--success">
          {message}
        </div>
      )}
      {displayError && (
        <div className="pricing-message pricing-message--error">
          {displayError}
        </div>
      )}

      <div className="pricing-info">
        <IndianRupee size={22} />
        <div>
          <strong>Automatic billing</strong>
          <p>
            Completing a pickup calculates weight × category rate, adds 18% GST,
            and debits the GST-inclusive total from the customer wallet.
          </p>
        </div>
      </div>

      <div className="pricing-add">
        <Tag size={19} />
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Add a waste category"
          onKeyDown={(event) => event.key === "Enter" && addCategory()}
        />
        <button onClick={addCategory} disabled={!category.trim()}>
          <Plus size={17} /> Add category
        </button>
      </div>

      <div className="pricing-list">
        <div className="pricing-list__heading">
          <span>Waste category</span>
          <span>Base price per kilogram (before GST)</span>
          <span>Action</span>
        </div>
        {loading ? (
          <div className="pricing-empty">Loading category prices…</div>
        ) : (
          prices.map((item) => (
            <div className="pricing-row" key={item}>
              <div className="pricing-category">
                <span>
                  <Tag size={18} />
                </span>
                {editing === item ? (
                  <input
                    className="pricing-name-input"
                    value={editName}
                    autoFocus
                    aria-label={`Rename ${item}`}
                    onChange={(event) => setEditName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") renameCategory(item);
                      if (event.key === "Escape") cancelEdit();
                    }}
                  />
                ) : (
                  <strong>{item}</strong>
                )}
              </div>
              <label className="pricing-input">
                <IndianRupee size={16} />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={drafts[item] || ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [item]: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
                <small>/ kg + 18% GST</small>
              </label>
              <div className="pricing-actions">
                {editing === item ? (
                  <>
                    <button
                      className="pricing-save"
                      onClick={() => renameCategory(item)}
                      disabled={saving === item || !editName.trim()}
                    >
                      {saving === item ? (
                        <RefreshCw className="pricing-spin" size={17} />
                      ) : (
                        <Check size={17} />
                      )}{" "}
                      {saving === item ? "Saving" : "Update name"}
                    </button>
                    <button
                      className="pricing-icon"
                      onClick={cancelEdit}
                      disabled={saving === item}
                      aria-label="Cancel rename"
                      title="Cancel"
                    >
                      <X size={17} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="pricing-save"
                      onClick={() => savePrice(item)}
                      disabled={
                        saving === item || deleting === item || !drafts[item]
                      }
                    >
                      {saving === item ? (
                        <RefreshCw className="pricing-spin" size={17} />
                      ) : (
                        <Save size={17} />
                      )}{" "}
                      {saving === item ? "Saving" : "Save price"}
                    </button>
                    <button
                      className="pricing-icon"
                      onClick={() => startEdit(item)}
                      disabled={deleting === item || saving === item}
                      aria-label={`Edit ${item}`}
                      title={`Edit ${item}`}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="pricing-delete"
                      onClick={() => deleteCategory(item)}
                      disabled={deleting === item || saving === item}
                      aria-label={`Delete ${item}`}
                      title={`Delete ${item}`}
                    >
                      {deleting === item ? (
                        <RefreshCw className="pricing-spin" size={17} />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        {!loading && prices.length === 0 && (
          <div className="pricing-empty">No categories yet. Add one above.</div>
        )}
      </div>
    </section>
  );
};

export default WastePricing;