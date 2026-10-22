import React, { useMemo, useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import {
  LocateFixed,
  MapPin,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  UserRoundCheck,
  X,
} from "lucide-react";
import api from "../../api/axiosInstance";
import { queryKeys } from '../../api/queryKeys';
import { useBins, useUsers } from '../../hooks/useApiQueries';
import "./BinManagement.css";
import "./BinLocation.css";

const STATUSES = [
  "Collected",
  "Pending",
 
];
const readable = (value = "") =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const qrImage = (url) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(url)}`;

export default function BinManagement() {
  const queryClient = useQueryClient();
  const binsQuery = useBins();
  const agentsQuery = useUsers({ role: 'ROL_4' });
  const bins = binsQuery.data || [];
  const agents = (agentsQuery.data || []).filter((agent) => agent.is_active !== false);
  const loading = binsQuery.isLoading || agentsQuery.isLoading;
  const [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false),
    [printing, setPrinting] = useState(null),
    [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    coordinates: null,
  });
  const [locating, setLocating] = useState(false);
  const loadBins = () => Promise.all([binsQuery.refetch(), agentsQuery.refetch()]);
  const queryError = binsQuery.error || agentsQuery.error;
  const displayError = error || queryError?.response?.data?.message || (queryError ? 'Unable to load bins.' : '');
  const filtered = useMemo(
    () =>
      bins.filter(
        (bin) =>
          (status === "all" || bin.status === status) &&
          (!search.trim() ||
            [bin.binId, bin.name, bin.location, bin.assignedAgent?.name, bin.assignedAgent?.userId].some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(search.toLowerCase()),
            )),
      ),
    [bins, search, status],
  );
  const scanUrl = (bin) => `myapp://bin/${bin.qrToken}`;
  const createBin = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await api.post("/v1/bins", form);
      const created = response.data.data;
      queryClient.setQueryData(queryKeys.bins, (current = []) => [created, ...current]);
      setShowCreate(false);
      setForm({ name: "", location: "", coordinates: null });
      setPrinting(created);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create bin.");
    } finally {
      setSaving(false);
    }
  };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude.toFixed(6));
        const longitude = Number(coords.longitude.toFixed(6));
        setForm((current) => ({
          ...current,
          location: `${latitude}, ${longitude}`,
          coordinates: { latitude, longitude },
        }));
        setLocating(false);
      },
      (locationError) => {
        setError(
          locationError.code === 1
            ? "Location permission was denied. Allow location access and try again."
            : "Unable to fetch your current location.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };
  const changeStatus = async (bin, nextStatus) => {
    try {
      const response = await api.patch(`/v1/bins/${bin.id}`, {
        status: nextStatus,
      });
      queryClient.setQueryData(queryKeys.bins, (current = []) =>
        current.map((item) => (item.id === bin.id ? response.data.data : item)),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to update bin status.",
      );
    }
  };
  const printQr = (bin) => {
    setPrinting(bin);
    setTimeout(() => window.print(), 250);
  };
  const assignAgent = async (bin, assignedAgent) => {
    try {
      const response = await api.patch(`/v1/bins/${bin.id}/agent`, { assignedAgent: assignedAgent || null });
      queryClient.setQueryData(queryKeys.bins, (current = []) => current.map((item) => item.id === bin.id ? response.data.data : item));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to assign the collection agent.");
    }
  };

  return (
    <section className="bin-page">
      <header className="bin-header">
        <div>
          <span>Asset operations</span>
          <h1>Bin management</h1>
          <p>Create bins, monitor status and print permanent QR labels.</p>
        </div>
        <div className="bin-header__actions">
          <button className="bin-refresh" onClick={loadBins}>
            <RefreshCw size={17} className={loading ? "bin-spin" : ""} />
            Refresh
          </button>
          <button className="bin-create" onClick={() => setShowCreate(true)}>
            <Plus size={18} />
            Add bin
          </button>
        </div>
      </header>
      {displayError && <div className="bin-error">{displayError}</div>}
      <div className="bin-stats">
        <Stat value={bins.length} label="Total bins" />
        <Stat value={bins.filter((b) => b.status === "Pending").length} label="Pending" />
        <Stat
          value={bins.filter((b) => b.status === "Collected").length}
          label="Collected"
        />
        <Stat
          value={bins.filter((b) => b.assignedAgent).length}
          label="Assigned"
        />
      </div>
      <div className="bin-toolbar">
        <label>
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bin ID, name or location"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {readable(item)}
            </option>
          ))}
        </select>
      </div>
      <div className="bin-grid">
        {loading ? (
          <div className="bin-empty">
            <RefreshCw className="bin-spin" />
            Loading bins…
          </div>
        ) : filtered.length ? (
          filtered.map((bin) => (
            <article className="bin-card" key={bin.id}>
              <div className="bin-card__top">
                <div className="bin-icon">
                  <Trash2 size={24} />
                </div>
                <div>
                  <small>{bin.binId}</small>
                  <h3>{bin.name}</h3>
                </div>
                <span className={`bin-status bin-status--${bin.status}`}>
                  {readable(bin.status)}
                </span>
              </div>
              <div className="bin-card__details">
                <p>
                  <MapPin size={15} />
                  {bin.location}
                </p>
                {bin.coordinates?.latitude != null && (
                  <p>
                    <LocateFixed size={15} />
                    GPS coordinates saved
                  </p>
                )}
                <p className={bin.assignedAgent ? "bin-agent assigned" : "bin-agent"}>
                  <UserRoundCheck size={15} />
                  {bin.assignedAgent ? `${bin.assignedAgent.name} · ${bin.assignedAgent.userId || bin.assignedAgent.phonenumber}` : "No collection agent assigned"}
                </p>
              </div>
              <label className="bin-agent-select" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: ".72rem" }}>
                Collection agent
                <select style={{ maxWidth: "62%", padding: 8, border: "1px solid var(--border-color)", borderRadius: 8, background: "var(--card-bg)", color: "var(--text-color)" }} value={bin.assignedAgent?.id || bin.assignedAgent?._id || ""} onChange={(event) => assignAgent(bin, event.target.value)}>
                  <option value="">Unassigned</option>
                  {agents.map((agent) => <option key={agent.id || agent._id} value={agent.id || agent._id}>{agent.name} — {agent.userId || agent.phonenumber}</option>)}
                </select>
              </label>
              <label className="bin-status-select">
                Update status
                <select
                  value={bin.status}
                  onChange={(event) => changeStatus(bin, event.target.value)}
                >
                  {STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {readable(item)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="bin-print" onClick={() => printQr(bin)}>
                <QrCode size={17} />
                View and print permanent QR
              </button>
            </article>
          ))
        ) : (
          <div className="bin-empty">No bins found.</div>
        )}
      </div>
      {showCreate && (
        <div className="bin-modal-bg">
          <form className="bin-modal" onSubmit={createBin}>
            <button
              type="button"
              className="bin-close"
              onClick={() => setShowCreate(false)}
            >
              <X />
            </button>
            <div className="bin-modal-icon">
              <Trash2 />
            </div>
            <h2>Add a new bin</h2>
            <p>A permanent QR code is created automatically.</p>
            <label>
              Bin name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Community Bin 01"
              />
            </label>
            <label>
              Location
              <div className="bin-location-input">
                <input
                  required
                  value={form.location}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      location: e.target.value,
                      coordinates: null,
                    })
                  }
                  placeholder="Enter location or fetch GPS"
                />
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                >
                  <LocateFixed size={17} />
                  {locating ? "Fetching…" : "Use current location"}
                </button>
              </div>
            </label>
            <button className="bin-submit" disabled={saving || locating}>
              {saving ? "Creating…" : "Create bin and QR"}
            </button>
          </form>
        </div>
      )}
      {printing && (
        <div className="bin-print-overlay">
          <div className="bin-print-sheet">
            <button
              className="bin-close bin-print-close"
              onClick={() => setPrinting(null)}
            >
              <X />
            </button>
            <div className="bin-print-brand">REPAMP</div>
            <h2>{printing.name}</h2>
            <strong>{printing.binId}</strong>
            <img
              src={qrImage(scanUrl(printing))}
              alt={`QR code for ${printing.binId}`}
            />
            <p>Scan to view and update bin status</p>
            {/* <small>{printing.location}</small>
            <code>{scanUrl(printing)}</code> */}
            <button className="bin-print-now" onClick={() => window.print()}>
              <Printer size={18} />
              Print QR label
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
function Stat({ value, label }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
