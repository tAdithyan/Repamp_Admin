import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  MapPinned,
  MessageSquareWarning,
  RefreshCw,
  Scale,
  Trash2,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { queryKeys } from "../../api/queryKeys";
import { AuthContext } from "../../context/AuthContext";
import { useDashboard } from "../../hooks/useApiQueries";
import "./Dashboard.css";

const STATUS_META = {
  scheduled: { label: "Scheduled", color: "#d97706" },
  assigned: { label: "Assigned", color: "#6366f1" },
  on_the_way: { label: "On the way", color: "#0284c7" },
  in_progress: { label: "In progress", color: "var(--primary-color)" },
  completed: { label: "Completed", color: "#16a34a" },
  cancelled: { label: "Cancelled", color: "#dc2626" },
  failed: { label: "Failed", color: "#b91c1c" },
};
const idOf = (item) => item?.id || item?._id || "";
const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not set";

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 7),
  );
  const {
    data,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useDashboard({ month: selectedMonth });
  const error =
    queryError?.response?.data?.message ||
    (queryError ? "Unable to load dashboard data." : "");
  const navigate = useNavigate();
  const { appUser } = useContext(AuthContext);
  const isAdmin = ["ROL_1", "ROL_2", "SuperAdmin", "Admin"].includes(
    appUser?.role,
  );
  const complaintsQuery = useQuery({
    queryKey: [...queryKeys.complaints, "dashboard"],
    queryFn: async () =>
      (await api.get("/v1/complaints/admin", { params: { limit: 5 } })).data
        ?.data,
    enabled: isAdmin,
  });

  const statusRows = useMemo(() => {
    const statuses = data?.pickups?.statuses || {};
    const total = Math.max(1, data?.pickups?.total || 0);
    return Object.entries(STATUS_META)
      .filter(([key]) => statuses[key])
      .map(([key, meta]) => ({
        key,
        ...meta,
        value: statuses[key],
        percent: (statuses[key] / total) * 100,
      }));
  }, [data]);
  const pct = (part, whole) =>
    Number(whole) > 0 ? (Number(part || 0) / Number(whole)) * 100 : 0;
  const agentCount = data?.users?.agents || 0;
  const paidInvoices = data?.billing?.paid || 0;
  const totalInvoices = paidInvoices + (data?.billing?.unpaid || 0);
  const monthlyTrend = data?.monthlyTrend || [];
  const selectedMonthData = monthlyTrend.find(
    (item) => item.month === selectedMonth,
  );
  const maxWeight = Math.max(1, ...monthlyTrend.map((item) => item.weight));
  const monthLabel = (month, options) => {
    const [year, number] = month.split("-").map(Number);
    return new Date(Date.UTC(year, number - 1, 15)).toLocaleDateString(
      "en-IN",
      { ...options, timeZone: "Asia/Kolkata" },
    );
  };

  if (loading && !data)
    return (
      <div className="dashboard-loading">
        <RefreshCw className="dashboard-spin" />
        <strong>Loading operations dashboard…</strong>
      </div>
    );
  return (
    <section className="operations-dashboard">
      <header className="dashboard-title">
        <div>
          <span>Operations control centre</span>
          <h1>Dashboard</h1>
          <p>Live waste collection, asset and billing performance.</p>
        </div>
        <div className="dashboard-title-actions">
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          <button onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw
              size={17}
              className={isFetching ? "dashboard-spin" : ""}
            />
            Refresh data
          </button>
        </div>
      </header>
      {error && (
        <div className="dashboard-error">
          {error}
          <button onClick={() => refetch()}>Try again</button>
        </div>
      )}
      <article className="dashboard-panel snapshot-panel">
        <PanelHeading
          icon={<MapPinned />}
          title="Operations snapshot"
          subtitle="Current totals · not filtered by selected month"
        />
        <div className="snapshot-grid">
          <Snapshot
            icon={<UsersRound />}
            tone="indigo"
            label="Active users"
            value={data?.users?.active || 0}
            hint="Registered and active"
          />
          <Snapshot
            icon={<UserRound />}
            tone="violet"
            label="Collection agents"
            value={agentCount}
            hint="Field team strength"
          />
          <Snapshot
            icon={<Clock3 />}
            tone="green"
            label="Agents on shift"
            value={data?.activeShifts || 0}
            progress={pct(data?.activeShifts, agentCount)}
            hint={`of ${agentCount} agents`}
          />
          <Snapshot
            icon={<CalendarClock />}
            tone="orange"
            label="Active contracts"
            value={data?.recurring?.active || 0}
            hint="Recurring pickups"
          />
          <Snapshot
            icon={<Trash2 />}
            tone="sky"
            label="Assigned bins"
            value={data?.bins?.assigned || 0}
            progress={pct(data?.bins?.assigned, data?.bins?.total)}
            hint={`of ${data?.bins?.total || 0} bins`}
          />
          <Snapshot
            icon={<CheckCircle2 />}
            tone="teal"
            label="Paid invoices"
            value={paidInvoices}
            progress={pct(paidInvoices, totalInvoices)}
            hint={`of ${totalInvoices} invoices`}
          />
        </div>
      </article>
      <div className="dashboard-kpis">
        <Kpi
          icon={<Truck />}
          tone="indigo"
          label="Open pickups"
          value={data?.pickups?.open || 0}
          note={`${data?.pickups?.total || 0} requests in ${monthLabel(selectedMonth, { month: "short", year: "numeric" })}`}
        />
        <Kpi
          icon={<Scale />}
          tone="green"
          label="Waste collected"
          value={`${Number(data?.pickups?.totalWeight || 0).toLocaleString("en-IN")} kg`}
          note={`${data?.pickups?.completed || 0} completed pickups in selected month`}
        />
        <Kpi
          icon={<Trash2 />}
          tone="orange"
          label="Pending bins"
          value={data?.bins?.pending || 0}
          note={`Current total · ${data?.bins?.assigned || 0} of ${data?.bins?.total || 0} assigned`}
        />
        <Kpi
          icon={<CircleDollarSign />}
          tone="red"
          label="Pending recurring invoices"
          value={data?.billing?.unpaid || 0}
          note={`Current total · ${money(data?.billing?.outstanding)} outstanding`}
        />
      </div>
      <div className="dashboard-main-grid">
        <article className="dashboard-panel trend-panel">
          <PanelHeading
            icon={<Activity />}
            title="Monthly collection performance"
            subtitle="Select a month to review its completed pickups, waste and collection value"
          />
          {selectedMonthData && (
            <>
              <div className="trend-period">
                {monthLabel(selectedMonthData.month, {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="trend-summary">
                <div>
                  <strong>{selectedMonthData.collections}</strong>
                  <span>Completed pickups</span>
                </div>
                <div>
                  <strong>
                    {Number(selectedMonthData.weight || 0).toLocaleString(
                      "en-IN",
                    )}{" "}
                    kg
                  </strong>
                  <span>Waste collected</span>
                </div>
                <div>
                  <strong>{money(selectedMonthData.amount)}</strong>
                  <span>Collection value</span>
                </div>
              </div>
            </>
          )}
          <MonthlyLineChart
            data={monthlyTrend}
            selectedMonth={selectedMonthData?.month}
            maxWeight={maxWeight}
            onSelect={setSelectedMonth}
            monthLabel={monthLabel}
          />
        </article>
        <article className="dashboard-panel status-panel">
          <PanelHeading
            icon={<CheckCircle2 />}
            title="Pickup status"
            subtitle={`Request distribution · ${monthLabel(selectedMonth, { month: "long", year: "numeric" })}`}
          />
          {statusRows.length ? (
            <StatusBarChart rows={statusRows} />
          ) : (
            <div className="panel-empty">No pickup activity this month.</div>
          )}
          <button
            className="panel-link"
            onClick={() => navigate("/admin/pickups")}
          >
            Manage pickups <ArrowRight size={15} />
          </button>
        </article>
      </div>
      <div className="dashboard-secondary-grid">
        <article className="dashboard-panel recent-panel">
          <PanelHeading
            icon={<Clock3 />}
            title="Recent pickups"
            subtitle={`Scheduled in ${monthLabel(selectedMonth, { month: "long", year: "numeric" })}`}
          />
          <div className="recent-table-wrap">
            {data?.recentPickups?.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Pickup</th>
                    <th>Customer</th>
                    <th>Waste</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPickups.map((pickup) => (
                    <tr
                      key={idOf(pickup)}
                      onClick={() => navigate("/admin/pickups")}
                    >
                      <td>
                        <strong>{pickup.pickupId}</strong>
                        <small>
                          {new Date(pickup.createdAt).toLocaleDateString(
                            "en-IN",
                          )}
                        </small>
                      </td>
                      <td>{pickup.customerId?.name || "Customer"}</td>
                      <td>{pickup.wasteType}</td>
                      <td>
                        <span className={`pickup-state ${pickup.status}`}>
                          {STATUS_META[pickup.status]?.label || pickup.status}
                        </span>
                      </td>
                      <td>{money(pickup.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="panel-empty">
                No pickups available this month.
              </div>
            )}
          </div>
        </article>
      </div>
      {isAdmin && (
        <article className="dashboard-panel dashboard-invoices-panel">
          <PanelHeading
            icon={<FileText />}
            title="Pending recurring invoices"
            subtitle="Issued and overdue invoices awaiting payment"
          />
          {data?.billing?.pendingInvoices?.length ? (
            <div className="dashboard-invoice-list">
              {data.billing.pendingInvoices.map((invoice) => (
                <div className="dashboard-invoice-row" key={idOf(invoice)}>
                  <div className="dashboard-invoice-main">
                    <strong>
                      {invoice.recurringContractId?.name ||
                        "Recurring contract"}
                    </strong>
                    <span>
                      {invoice.customerId?.name || "Customer"} ·{" "}
                      {invoice.billingMonth}
                    </span>
                  </div>
                  <span
                    className={`dashboard-invoice-status ${invoice.status}`}
                  >
                    {invoice.status === "overdue" ? "Overdue" : "Issued"}
                  </span>
                  <span className="dashboard-invoice-due">
                    Due {formatDate(invoice.dueDate)}
                  </span>
                  <strong className="dashboard-invoice-amount">
                    {money(invoice.totalAmount)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel-empty dashboard-invoice-empty">
              No pending recurring invoices.
            </div>
          )}
          <button
            className="panel-link"
            onClick={() => navigate("/admin/recurring-pickups")}
          >
            Review monthly billing <ArrowRight size={15} />
          </button>
        </article>
      )}
      {isAdmin && (
        <article className="dashboard-panel dashboard-complaints-panel">
          <PanelHeading
            icon={<MessageSquareWarning />}
            title="Recent complaints"
            subtitle={`${complaintsQuery.data?.total || 0} customer complaints`}
          />
          {complaintsQuery.isLoading ? (
            <div className="panel-empty">Loading complaints…</div>
          ) : complaintsQuery.error ? (
            <div className="panel-empty">
              Unable to load complaints right now.
            </div>
          ) : complaintsQuery.data?.items?.length ? (
            <div className="dashboard-complaint-list">
              {complaintsQuery.data.items.map((item) => (
                <div className="dashboard-complaint-row" key={idOf(item)}>
                  <div className="dashboard-complaint-copy">
                    <strong>{item.subject}</strong>
                    <span>
                      {item.customerId?.name || "Customer"} · {item.category}
                    </span>
                  </div>
                  <span className={`complaint-state ${item.status}`}>
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel-empty">
              No customer complaints have been submitted.
            </div>
          )}
          <button
            className="panel-link"
            onClick={() => navigate("/admin/complaints")}
          >
            Review complaints <ArrowRight size={15} />
          </button>
        </article>
      )}
    </section>
  );
}

function MonthPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(value.slice(0, 4)));
  const ref = useRef(null);
  const todayKey = new Date(Date.now() + 330 * 60 * 1000)
    .toISOString()
    .slice(0, 7);
  const fmt = (y, m, options) =>
    new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-IN", {
      ...options,
      timeZone: "Asia/Kolkata",
    });
  const [valueYear, valueMonth] = value.split("-").map(Number);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) setYear(valueYear);
    setOpen((current) => !current);
  };
  const pick = (key) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <div className="month-picker" ref={ref}>
      <button
        type="button"
        className="mp-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Filter dashboard by month and year"
        onClick={toggle}
      >
        <CalendarClock size={16} />
        <b>{fmt(valueYear, valueMonth, { month: "long", year: "numeric" })}</b>
        <ChevronDown size={15} className={open ? "mp-chevron open" : "mp-chevron"} />
      </button>
      {open && (
        <div className="mp-pop" role="dialog" aria-label="Choose month">
          <div className="mp-head">
            <button
              type="button"
              className="mp-nav"
              aria-label="Previous year"
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <strong>{year}</strong>
            <button
              type="button"
              className="mp-nav"
              aria-label="Next year"
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mp-grid">
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const key = `${year}-${String(month).padStart(2, "0")}`;
              const classes = [
                "mp-cell",
                key === value ? "selected" : "",
                key === todayKey ? "today" : "",
              ].join(" ");
              return (
                <button
                  type="button"
                  key={key}
                  className={classes}
                  aria-pressed={key === value}
                  onClick={() => pick(key)}
                >
                  {fmt(year, month, { month: "short" })}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="mp-today"
            onClick={() => pick(todayKey)}
          >
            Jump to this month
          </button>
        </div>
      )}
    </div>
  );
}

function MonthlyLineChart({
  data,
  selectedMonth,
  maxWeight,
  onSelect,
  monthLabel,
}) {
  const n = data.length;
  if (!n) return <div className="panel-empty">No collection data yet.</div>;

  const points = data.map((item, i) => ({
    ...item,
    x: ((i + 0.5) / n) * 100, // centred over its axis label
    y: 100 - (item.weight / maxWeight) * 100,
  }));

  // Smooth curve with horizontal tangents (never overshoots the data)
  const linePath = points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const mx = (prev.x + p.x) / 2;
    return `${d} C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
  }, "");
  const areaPath = `${linePath} L ${points[n - 1].x} 100 L ${points[0].x} 100 Z`;

  return (
    <div className="line-chart">
      <div className="line-plot">
        <div className="line-canvas">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  style={{ stopColor: "var(--primary-color)", stopOpacity: 0.22 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "var(--primary-color)", stopOpacity: 0 }}
                />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#lineFill)" />
            <path
              d={linePath}
              className="line-stroke"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {points.map((item) => {
            const selected = item.month === selectedMonth;
            return (
              <button
                type="button"
                key={item.month}
                className={`line-point ${selected ? "selected" : ""}`}
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
                aria-pressed={selected}
                aria-label={`${monthLabel(item.month, { month: "long", year: "numeric" })}: ${item.collections} completed pickups, ${item.weight} kilograms, ${money(item.amount)}`}
                onClick={() => onSelect(item.month)}
              >
                <span className="line-tip">{item.weight} kg</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="line-axis"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {data.map((item) => (
          <button
            type="button"
            key={item.month}
            className={item.month === selectedMonth ? "selected" : ""}
            onClick={() => onSelect(item.month)}
          >
            <strong>{monthLabel(item.month, { month: "short" })}</strong>
            <small>{item.collections} pickups</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Kpi({ icon, tone, label, value, note }) {
  return (
    <article className={`dashboard-kpi ${tone}`}>
      <div className="kpi-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}
function PanelHeading({ icon, title, subtitle }) {
  return (
    <div className="panel-heading">
      <div className="panel-heading-icon">{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
function StatusBarChart({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div
      className="status-bars"
      role="img"
      aria-label={rows.map((r) => `${r.label}: ${r.value}`).join(", ")}
    >
      {rows.map((status) => (
        <div className="status-bar-col" key={status.key}>
          <span className="status-bar-value">{status.value}</span>
          <div className="status-bar-track">
            <i
              style={{
                height: `${Math.max(6, (status.value / max) * 100)}%`,
                background: status.color,
              }}
            />
          </div>
          <small>{status.label}</small>
          <em>{Math.round(status.percent)}%</em>
        </div>
      ))}
    </div>
  );
}
function Snapshot({ icon, label, value, tone = "indigo", progress, hint }) {
  const hasProgress = progress !== undefined;
  return (
    <div className={`snapshot-item ${tone}`}>
      <div className="snapshot-top">
        <span className="snapshot-icon">{icon}</span>
        {hasProgress && (
          <em className="snapshot-pct">{Math.round(progress)}%</em>
        )}
      </div>
      <strong>{value}</strong>
      <small>{label}</small>
      {hasProgress && (
        <div className="snapshot-meter">
          <i style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      {hint && <p>{hint}</p>}
    </div>
  );
}