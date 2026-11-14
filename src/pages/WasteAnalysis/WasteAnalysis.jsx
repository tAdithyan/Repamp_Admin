import { useContext, useEffect, useRef, useState } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import {
  FileDown,
  RefreshCw,
  Scale,
  Truck,
  TrendingUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Recycle,
} from "lucide-react";

import api from "../../api/axiosInstance";
import { dayKey } from "../AgentDetails/attendance";
import { summarizeWaste, summarizeLocations } from "./summary";
import { loadAnalysis } from "./loadAnalysis";
import DownloadChart from "./DownloadChart";

import "./WasteAnalysis.css";

const kg = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const chartColors = [
  "#009e73",
  "#2563eb",
  "#e69f00",
  "#9333ea",
  "#dc4b5a",
  "#0891b2",
  "#854d0e",
  "#64748b",
];

/* =========================================================
   PRINT LOCATION CHARTS
========================================================= */

function PrintLocationCharts({ title, rows, palette }) {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);

  const maximum = Math.max(0, ...rows.map((row) => row.weight));

  const slices = rows.reduce(
    (result, row, index) => {
      const end =
        result.position + (total > 0 ? (row.weight / total) * 100 : 0);

      return {
        position: end,
        values: [
          ...result.values,
          `${palette[index % palette.length]} ${result.position}% ${end}%`,
        ],
      };
    },
    {
      position: 0,
      values: [],
    },
  ).values;

  return (
    <div className="wa-print-chart-set">
      {["Bar chart", "Pie chart", "Donut chart"].map((type) => (
        <section className="wa-print-chart" key={type}>
          <h3>
            {title} — {type}
          </h3>

          {!rows.length ? (
            <p>No completed pickups recorded for this month.</p>
          ) : (
            <>
              {type === "Bar chart" && (
                <div className="wa-area-columns wa-print-area-columns">
                  {rows.map((row) => (
                    <div className="wa-area-column" key={row.key}>
                      <div className="wa-area-bar-space">
                        <div
                          className="wa-area-bar"
                          style={{
                            height: `${
                              maximum > 0 ? (row.weight / maximum) * 100 : 0
                            }%`,
                          }}
                        >
                          <span>{kg(row.weight)} kg</span>
                        </div>
                      </div>

                      <strong className="wa-area-axis-label">
                        {row.label}
                      </strong>

                      {row.district && <small>{row.district}</small>}

                      <small>{row.pickups} pickups</small>
                    </div>
                  ))}
                </div>
              )}

              {type !== "Bar chart" && (
                <div className="wa-print-round-wrap">
                  <div
                    className={`wa-round-chart ${
                      type === "Donut chart" ? "wa-donut" : ""
                    }`}
                    style={{
                      background:
                        total > 0
                          ? `conic-gradient(${slices.join(",")})`
                          : "#e5e7eb",
                    }}
                  >
                    {type === "Donut chart" && (
                      <div className="wa-donut-center">
                        <strong>{kg(total)}</strong>

                        <small>kg collected</small>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <ul className="wa-print-chart-legend">
                {rows.map((row, index) => (
                  <li key={row.key}>
                    <i
                      className="wa-legend-dot"
                      style={{
                        background: palette[index % palette.length],
                      }}
                      aria-hidden="true"
                    />

                    <span>
                      {row.label}
                      {row.district ? `, ${row.district}` : ""}
                    </span>

                    <strong>
                      {kg(row.weight)} kg · {row.pickups} pickups
                      {type !== "Bar chart" && total > 0
                        ? ` · ${kg((row.weight / total) * 100)}%`
                        : ""}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
    </div>
  );
}

/* =========================================================
   LOCATION CHART
========================================================= */

function LocationChart({ title, rows, month, unavailable = false }) {
  const { isDarkMode } = useContext(ThemeContext);

  const palette = isDarkMode
    ? [
        "#60a5fa",
        "#34d399",
        "#fbbf24",
        "#c084fc",
        "#fb7185",
        "#22d3ee",
        "#a3e635",
        "#94a3b8",
      ]
    : chartColors;

  const maximum = Math.max(0, ...rows.map((row) => row.weight));

  const total = rows.reduce((sum, row) => sum + row.weight, 0);

  let donutPosition = 0;

  const slices = rows.map((row, index) => {
    const percentage = total > 0 ? (row.weight / total) * 100 : 0;

    const start = donutPosition;

    const end = start + percentage;

    donutPosition = end;

    return `${palette[index % palette.length]} ${start}% ${end}%`;
  });

  const topArea = rows[0];

  return (
    <section className="wa-panel wa-location-panel">
      <div className="wa-panel-heading">
        <div>
          <span className="wa-chart-eyebrow">AREA ANALYTICS</span>

          <h2>
            {title} <small>kg collected</small>
          </h2>

          <p className="wa-chart-description">
            Collection volume and pickup distribution
          </p>
        </div>

        <DownloadChart
          title={title}
          month={month}
          rows={rows}
          type="dashboard"
          disabled={unavailable || !rows.length}
        />
      </div>

      {!rows.length ? (
        <div className="wa-empty-chart">
          <div className="wa-empty-icon">∅</div>

          <strong>No collection data</strong>

          <p>
            {unavailable
              ? "Area data could not be loaded."
              : "No completed pickups were recorded for this month."}
          </p>
        </div>
      ) : (
        <>
          <div className="wa-location-summary">
            <div>
              <span>Total collected</span>

              <strong>{kg(total)} kg</strong>
            </div>

            <div>
              <span>Areas</span>

              <strong>{rows.length}</strong>
            </div>

            <div>
              <span>Top area</span>

              <strong>{topArea?.label || "—"}</strong>
            </div>
          </div>

          <div className="wa-location-chart-grid">
            {/* BAR */}

            <div className="wa-chart-card">
              <div className="wa-chart-card-header">
                <div>
                  <span>Collection volume</span>

                  <strong>By area</strong>
                </div>

                <span className="wa-chart-unit">KG</span>
              </div>

              <div
                className="wa-area-columns"
                role="list"
                aria-label={`${title} collection in kilograms`}
              >
                {rows.map((row) => (
                  <div
                    className="wa-area-column"
                    role="listitem"
                    key={row.key}
                    title={`${row.label}${
                      row.district ? `, ${row.district}` : ""
                    }: ${kg(row.weight)} kg · ${row.pickups} pickups`}
                  >
                    <div className="wa-area-bar-space">
                      <div
                        className="wa-area-bar"
                        style={{
                          height: `${
                            maximum > 0 ? (row.weight / maximum) * 100 : 0
                          }%`,
                        }}
                      >
                        <span>{kg(row.weight)}</span>
                      </div>
                    </div>

                    <strong className="wa-area-axis-label">{row.label}</strong>

                    {row.district && <small>{row.district}</small>}

                    <small>{row.pickups} pickups</small>
                  </div>
                ))}
              </div>
            </div>

            {/* DONUT */}

            <div className="wa-chart-card wa-donut-card">
              <div className="wa-chart-card-header">
                <div>
                  <span>Distribution</span>

                  <strong>Collection share</strong>
                </div>

                <span className="wa-chart-unit">%</span>
              </div>

              <div className="wa-donut-content">
                <div
                  className="wa-round-chart wa-donut"
                  style={{
                    background:
                      total > 0
                        ? `conic-gradient(${slices.join(",")})`
                        : "#e5e7eb",
                  }}
                  role="img"
                  aria-label={`${title}: ${kg(total)} kg total`}
                >
                  <div className="wa-donut-center">
                    <strong>{kg(total)}</strong>

                    <small>kg collected</small>
                  </div>
                </div>

                <div className="wa-donut-legend">
                  {rows.map((row, index) => (
                    <div className="wa-donut-item" key={row.key}>
                      <div className="wa-donut-label">
                        <i
                          className="wa-legend-dot"
                          style={{
                            background: palette[index % palette.length],
                          }}
                        />

                        <span>{row.label}</span>
                      </div>

                      <div className="wa-donut-value">
                        <strong>{kg(row.weight)} kg</strong>

                        <small>
                          {total > 0
                            ? `${kg((row.weight / total) * 100)}%`
                            : "0%"}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="wa-area-details">
            <div className="wa-area-details-header">
              <span>Area</span>

              <span>Collected</span>

              <span>Pickups</span>

              <span>Share</span>
            </div>

            {rows.map((row, index) => (
              <div className="wa-area-detail-row" key={row.key}>
                <div className="wa-area-name">
                  <i
                    className="wa-legend-dot"
                    style={{
                      background: palette[index % palette.length],
                    }}
                  />

                  <div>
                    <strong>{row.label}</strong>

                    {row.district && <small>{row.district}</small>}
                  </div>
                </div>

                <strong>{kg(row.weight)} kg</strong>

                <span>{row.pickups}</span>

                <span className="wa-share">
                  {total > 0 ? `${kg((row.weight / total) * 100)}%` : "0%"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <PrintLocationCharts title={title} rows={rows} palette={palette} />
    </section>
  );
}

/* =========================================================
   WASTE COMPOSITION
========================================================= */

function WasteComposition({ categories }) {
  const categoryColors = [
    "#009e73",
    "#2563eb",
    "#e69f00",
    "#9333ea",
    "#dc4b5a",
    "#0891b2",
    "#854d0e",
    "#64748b",
  ];

  if (!categories?.length) {
    return (
      <section className="wa-panel wa-waste-panel">
        <div className="wa-panel-heading">
          <div>
            <span className="wa-chart-eyebrow">WASTE COMPOSITION</span>

            <h2>Waste types</h2>

            <p className="wa-chart-description">
              Breakdown of collected waste by category
            </p>
          </div>

          <Recycle size={20} className="wa-heading-icon" />
        </div>

        <div className="wa-empty-category">
          <Recycle size={28} />

          <strong>No waste types recorded</strong>

          <p>
            Waste category information will appear here once completed pickups
            contain waste type data.
          </p>
        </div>

        <p className="wa-note wa-composition-note">
          New pickups use their saved completion date. All days follow India
          Standard Time. Scheduled, cancelled and unfinished pickups are
          excluded.
        </p>
      </section>
    );
  }

  const categoryTotal = categories.reduce(
    (sum, [, weight]) => sum + Number(weight || 0),
    0,
  );

  let position = 0;

  const categoryData = categories.map(([type, rawWeight], index) => {
    const weight = Number(rawWeight || 0);

    const percentage = categoryTotal > 0 ? (weight / categoryTotal) * 100 : 0;

    const start = position;
    const end = start + percentage;

    position = end;

    const color = categoryColors[index % categoryColors.length];

    return {
      type,
      weight,
      percentage,
      color,
      slice: `${color} ${start}% ${end}%`,
    };
  });

  const topCategory = categoryData[0];

  return (
    <section className="wa-panel wa-waste-panel">
      <div className="wa-panel-heading">
        <div>
          <span className="wa-chart-eyebrow">WASTE COMPOSITION</span>

          <h2>Waste types</h2>

          <p className="wa-chart-description">
            Breakdown of collected waste by category
          </p>
        </div>

        <Recycle size={20} className="wa-heading-icon" />
      </div>

      <div className="wa-category-layout">
        {/* DONUT OVERVIEW */}

        <div className="wa-category-overview">
          <div
            className="wa-category-donut"
            style={{
              background:
                categoryTotal > 0
                  ? `conic-gradient(${categoryData
                      .map((item) => item.slice)
                      .join(",")})`
                  : "#e5e7eb",
            }}
          >
            <div className="wa-category-donut-hole">
              <strong>{kg(categoryTotal)}</strong>

              <span>kg total</span>
            </div>
          </div>

          <div className="wa-category-total">
            <span>Total composition</span>

            <strong>{kg(categoryTotal)} kg</strong>

            <small>Across all recorded waste categories</small>
          </div>
        </div>

        {/* TOP CATEGORY */}

        <div className="wa-top-category">
          <span className="wa-category-mini-label">TOP CATEGORY</span>

          <div className="wa-top-category-main">
            <div
              className="wa-category-color"
              style={{
                background: topCategory.color,
              }}
            />

            <div>
              <strong>{topCategory.type}</strong>

              <span>{kg(topCategory.weight)} kg collected</span>
            </div>

            <div className="wa-top-percentage">
              {kg(topCategory.percentage)}%
            </div>
          </div>

          <div className="wa-top-progress">
            <div
              style={{
                width: `${topCategory.percentage}%`,
                background: topCategory.color,
              }}
            />
          </div>

          <p>Largest contributor to the collected waste volume.</p>
        </div>

        {/* CATEGORY LIST */}

        <div className="wa-category-list">
          <div className="wa-category-list-header">
            <span>Category</span>

            <span>Weight</span>

            <span>Share</span>
          </div>

          {categoryData.map((item, index) => (
            <div className="wa-category-row" key={item.type}>
              <div className="wa-category-name">
                <span className="wa-category-rank">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span
                  className="wa-category-dot"
                  style={{
                    background: item.color,
                  }}
                />

                <strong>{item.type}</strong>
              </div>

              <strong className="wa-category-weight">
                {kg(item.weight)} kg
              </strong>

              <span className="wa-category-percent">
                {kg(item.percentage)}%
              </span>
            </div>
          ))}
        </div>

        {/* COMPARISON BARS */}

        <div className="wa-category-bars">
          <div className="wa-category-bars-header">
            <div>
              <span>Category comparison</span>

              <strong>Collection volume</strong>
            </div>

            <span>KG</span>
          </div>

          {categoryData.map((item) => (
            <div className="wa-category-bar-item" key={`${item.type}-bar`}>
              <div className="wa-category-bar-label">
                <span>{item.type}</span>

                <strong>{kg(item.weight)} kg</strong>
              </div>

              <div className="wa-category-track">
                <div
                  style={{
                    width: `${item.percentage}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="wa-note wa-composition-note">
        New pickups use their saved completion date. All days follow India
        Standard Time. Scheduled, cancelled and unfinished pickups are excluded.
      </p>
    </section>
  );
}

/* =========================================================
   MONTH PICKER
========================================================= */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function MonthPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const selectedYear = Number(value.slice(0, 4));
  const selectedMonth = Number(value.slice(5, 7));

  const [year, setYear] = useState(selectedYear);

  const rootRef = useRef(null);

  const currentMonth = dayKey(Date.now()).slice(0, 7);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = new Date(
    Date.UTC(selectedYear, selectedMonth - 1, 1),
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const choose = (nextYear, monthIndex) => {
    onChange(`${nextYear}-${String(monthIndex + 1).padStart(2, "0")}`);
    setOpen(false);
  };

  return (
    <div className="wa-month-field" ref={rootRef}>
      <span className="wa-month-caption">Month</span>

      <button
        type="button"
        className={`wa-month-trigger ${open ? "is-open" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Analysis month: ${label}`}
        onClick={() => {
          setYear(selectedYear);
          setOpen((previous) => !previous);
        }}
      >
        <span>{label}</span>

        <CalendarDays size={16} />
      </button>

      {open && (
        <div className="wa-month-popup" role="dialog" aria-label="Choose month">
          <div className="wa-month-head">
            <button
              type="button"
              className="wa-month-nav"
              aria-label="Previous year"
              disabled={year <= MIN_YEAR}
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft size={16} />
            </button>

            <strong className="wa-month-year">{year}</strong>

            <button
              type="button"
              className="wa-month-nav"
              aria-label="Next year"
              disabled={year >= MAX_YEAR}
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="wa-month-grid">
            {MONTHS.map((name, index) => {
              const key = `${year}-${String(index + 1).padStart(2, "0")}`;

              return (
                <button
                  type="button"
                  key={name}
                  className={`wa-month-option ${
                    key === value ? "is-selected" : ""
                  } ${key === currentMonth ? "is-current" : ""}`}
                  aria-pressed={key === value}
                  onClick={() => choose(year, index)}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="wa-month-today"
            onClick={() => {
              onChange(currentMonth);
              setOpen(false);
            }}
          >
            This month
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function WasteAnalysis() {
  const [month, setMonth] = useState(() => dayKey(Date.now()).slice(0, 7));

  const query = useQuery({
    queryKey: ["waste-analysis", month],

    queryFn: ({ signal }) => loadAnalysis(api, month, signal),

    refetchInterval: 60000,
  });

  const summary = summarizeWaste(query.data?.rows || [], month);

  const locations = summarizeLocations(query.data?.locations || []);

  const peak = Math.max(0, ...summary.days.map((d) => d.weight));

  const today = dayKey(Date.now());

  const averagePickup =
    summary.pickups > 0 ? summary.total / summary.pickups : 0;

  return (
    <section className="waste-analysis">
      {/* HEADER */}

      <header>
        <div>
          <span className="wa-eyebrow">COLLECTION ANALYTICS</span>

          <h1>Daily waste analysis</h1>

          <p>Total waste collected from completed pickups, day by day.</p>

          <p className="wa-print-period">Reporting period: {month}</p>
        </div>

        <div className="wa-controls">
          <MonthPicker
            value={month}
            onChange={(next) => {
              if (/^\d{4}-(0[1-9]|1[0-2])$/.test(next)) {
                setMonth(next);
              }
            }}
          />

          <button disabled={query.isFetching} onClick={() => query.refetch()}>
            <RefreshCw
              size={16}
              className={query.isFetching ? "wa-spin" : ""}
            />
            Refresh
          </button>

          <button
            className="wa-pdf-button"
            type="button"
            disabled={query.isLoading || !query.data}
            onClick={() => window.print()}
          >
            <FileDown size={16} />
            Download PDF
          </button>
        </div>
      </header>

      {/* DATA NOTE */}

      <p className="wa-note wa-data-note">
        Collection weight is used as the company intake estimate. Arrival at the
        company is not separately recorded. Bin scans have no recorded weight
        and are not included.
      </p>

      {/* ERROR */}

      {query.isError && (
        <p role="alert" className="wa-error">
          {query.error?.response?.data?.message ||
            "Unable to load waste analysis. Please retry."}

          {query.data ? " Showing previously loaded figures." : ""}
        </p>
      )}

      {/* LOADING */}

      {query.isLoading ? (
        <div className="wa-loading">
          <div className="wa-loading-spinner">
            <RefreshCw size={22} />
          </div>

          <strong>Loading analytics...</strong>

          <span>Preparing your collection report</span>
        </div>
      ) : (
        query.data && (
          <>
            {/* KPI STATS */}

            <div className="wa-stats">
              <article>
                <div className="wa-stat-icon">
                  <Scale />
                </div>

                <span>
                  Waste collected
                  <strong>
                    {kg(summary.total)} <small>kg</small>
                  </strong>
                </span>
              </article>

              <article>
                <div className="wa-stat-icon">
                  <Truck />
                </div>

                <span>
                  Completed pickups
                  <strong>{summary.pickups}</strong>
                </span>
              </article>

              <article>
                <div className="wa-stat-icon">
                  <TrendingUp />
                </div>

                <span>
                  Highest daily collection
                  <strong>
                    {kg(peak)} <small>kg</small>
                  </strong>
                </span>
              </article>

              <article>
                <div className="wa-stat-icon">
                  <Recycle />
                </div>

                <span>
                  Average per pickup
                  <strong>
                    {kg(averagePickup)} <small>kg</small>
                  </strong>
                </span>
              </article>
            </div>

            {/* WASTE COMPOSITION (top) */}

            <WasteComposition
              categories={summary.categories}
              totalWaste={summary.total}
            />

            {/* ESTIMATED DATA */}

            {summary.estimated > 0 && (
              <p className="wa-notice">
                {summary.estimated} older pickup
                {summary.estimated === 1 ? "" : "s"} use the last-updated date
                as an estimate because no completion date was saved. Later
                edits can move these records between days.
              </p>
            )}

            {/* AREA HEADING */}

            <div className="wa-section-heading">
              <div>
                <span className="wa-chart-eyebrow">COLLECTION AREAS</span>

                <h2>Collection by area</h2>

                <p>
                  Compare collection volume and distribution across your service
                  areas.
                </p>
              </div>
            </div>

            {/* AREA CHARTS */}

            <div className="wa-location-grid">
              <LocationChart
                month={month}
                title="District-wise"
                rows={locations.districts}
                unavailable={!Array.isArray(query.data.locations)}
              />

              <LocationChart
                month={month}
                title="Panchayat-wise"
                rows={locations.panchayats}
                unavailable={!Array.isArray(query.data.locations)}
              />

              <LocationChart
                month={month}
                title="Municipality / corporation-wise"
                rows={locations.municipalities}
                unavailable={!Array.isArray(query.data.locations)}
              />
            </div>

            {/* UNKNOWN LOCATION */}

            {locations.unknownPickups > 0 && (
              <p className="wa-notice">
                {locations.unknownPickups} pickups have no recognised local body
                type. They are included in district totals but cannot be
                assigned to a panchayat or municipality.
              </p>
            )}

            {!Array.isArray(query.data.locations) && (
              <p role="status" className="wa-notice">
                Daily totals are available, but the area breakdown could not be
                loaded or matched to these totals. Click Refresh to retry.
              </p>
            )}

            {/* DAILY TREND */}

            <section className="wa-panel wa-daily-panel">
              <div className="wa-panel-heading">
                <div>
                  <span className="wa-chart-eyebrow">DAILY PERFORMANCE</span>

                  <h2>
                    Daily collection <small>kg</small>
                  </h2>

                  <p className="wa-chart-description">
                    Total completed pickup weight for each day
                  </p>
                </div>

                <DownloadChart
                  title="Daily collection trend"
                  month={month}
                  rows={summary.days.map((day) => ({
                    ...day,
                    label: day.day,
                  }))}
                />
              </div>

              <div className="wa-daily-summary">
                <div>
                  <span>Monthly total</span>

                  <strong>{kg(summary.total)} kg</strong>
                </div>

                <div>
                  <span>Completed pickups</span>

                  <strong>{summary.pickups}</strong>
                </div>

                <div>
                  <span>Average / pickup</span>

                  <strong>{kg(averagePickup)} kg</strong>
                </div>

                <div>
                  <span>Peak day</span>

                  <strong>{kg(peak)} kg</strong>
                </div>
              </div>

              <div
                className="wa-chart wa-daily-chart"
                role="img"
                aria-label={`Daily collection for ${month}`}
              >
                {summary.days.map((d) => (
                  <div
                    className="wa-column"
                    key={d.day}
                    title={`${d.day}: ${kg(d.weight)} kg · ${d.pickups} pickups`}
                  >
                    <div className="wa-bar-space">
                      <div
                        className="wa-bar"
                        style={{
                          height: `${peak ? (d.weight / peak) * 100 : 0}%`,
                        }}
                      >
                        {d.weight > 0 && <span>{kg(d.weight)}</span>}
                      </div>
                    </div>

                    <span>{d.day.slice(-2)}</span>
                  </div>
                ))}
              </div>

              {!summary.pickups && (
                <p className="wa-note">
                  No completed pickups recorded for this month.
                </p>
              )}
            </section>

            {/* BOTTOM */}

            <div className="wa-bottom">
              {/* DAILY TOTALS */}

              <section className="wa-panel">
                <div className="wa-panel-heading">
                  <div>
                    <span className="wa-chart-eyebrow">DAILY BREAKDOWN</span>

                    <h2>Daily totals</h2>
                  </div>

                  <CalendarDays size={20} className="wa-heading-icon" />
                </div>

                <div className="wa-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date (IST)</th>

                        <th>Collected (kg)</th>

                        <th>Pickups</th>

                        <th>Estimated</th>
                      </tr>
                    </thead>

                    <tbody>
                      {summary.days.map((d) => (
                        <tr key={d.day}>
                          <td>
                            {d.day}
                            {d.day > today && !d.pickups ? " · Upcoming" : ""}
                          </td>

                          <td>
                            {d.day > today && !d.pickups ? "—" : kg(d.weight)}
                          </td>

                          <td>{d.pickups}</td>

                          <td>{d.estimated || "—"}</td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr>
                        <th>Total</th>

                        <th>{kg(summary.total)}</th>

                        <th>{summary.pickups}</th>

                        <th>{summary.estimated}</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </div>
          </>
        )
      )}
    </section>
  );
}