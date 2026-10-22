import { useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
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
          <label className="dashboard-month-filter">
            <CalendarClock size={16} />
            <span>Month</span>
            <input
              type="month"
              aria-label="Filter dashboard by month and year"
              value={selectedMonth}
              onChange={(event) => {
                if (event.target.value) setSelectedMonth(event.target.value);
              }}
            />
          </label>
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
          <div className="weight-chart">
            {monthlyTrend.map((item) => (
              <button
                type="button"
                className={`weight-column ${selectedMonthData?.month === item.month ? "selected" : ""}`}
                key={item.month}
                aria-pressed={selectedMonthData?.month === item.month}
                aria-label={`${monthLabel(item.month, { month: "long", year: "numeric" })}: ${item.collections} completed pickups, ${item.weight} kilograms, ${money(item.amount)}`}
                title={`${money(item.amount)} collection value`}
                onClick={() => setSelectedMonth(item.month)}
              >
                <div className="bar-space">
                  <i
                    style={{
                      height: `${Math.max(item.weight ? 12 : 3, (item.weight / maxWeight) * 155)}px`,
                    }}
                  >
                    <b>{item.weight ? `${item.weight} kg` : ""}</b>
                  </i>
                </div>
                <strong>{monthLabel(item.month, { month: "short" })}</strong>
                <small>{item.collections} pickups</small>
              </button>
            ))}
          </div>
        </article>
        <article className="dashboard-panel status-panel">
          <PanelHeading
            icon={<CheckCircle2 />}
            title="Pickup status"
            subtitle={`Request distribution · ${monthLabel(selectedMonth, { month: "long", year: "numeric" })}`}
          />
          {statusRows.length ? (
            <div className="status-list">
              {statusRows.map((status) => (
                <div key={status.key}>
                  <div className="status-copy">
                    <span>
                      <i style={{ background: status.color }} />
                      {status.label}
                    </span>
                    <strong>{status.value}</strong>
                  </div>
                  <div className="status-track">
                    <i
                      style={{
                        width: `${status.percent}%`,
                        background: status.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
        <article className="dashboard-panel snapshot-panel">
          <PanelHeading
            icon={<MapPinned />}
            title="Operations snapshot"
            subtitle="Current totals · not filtered by selected month"
          />
          <div className="snapshot-grid">
            <Snapshot
              icon={<UsersRound />}
              label="Active users"
              value={data?.users?.active || 0}
            />
            <Snapshot
              icon={<UserRound />}
              label="Collection agents"
              value={data?.users?.agents || 0}
            />
            <Snapshot
              icon={<Clock3 />}
              label="Agents on shift"
              value={data?.activeShifts || 0}
            />
            <Snapshot
              icon={<CalendarClock />}
              label="Active contracts"
              value={data?.recurring?.active || 0}
            />
            <Snapshot
              icon={<Trash2 />}
              label="Assigned bins"
              value={data?.bins?.assigned || 0}
            />
            <Snapshot
              icon={<CheckCircle2 />}
              label="Paid invoices"
              value={data?.billing?.paid || 0}
            />
          </div>
        </article>
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
function Snapshot({ icon, label, value }) {
  return (
    <div className="snapshot-item">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
