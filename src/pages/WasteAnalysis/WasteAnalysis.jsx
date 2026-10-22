import { useContext, useState } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { FileDown, RefreshCw, Scale, Truck, TrendingUp } from 'lucide-react';
import api from '../../api/axiosInstance';
import { dayKey } from '../AgentDetails/attendance';
import { summarizeWaste, summarizeLocations } from './summary';
import './WasteAnalysis.css';
import { loadAnalysis } from './loadAnalysis';
import DownloadChart from './DownloadChart';
const kg = value => Number(value).toLocaleString('en-IN',{maximumFractionDigits:2});
const chartColors = ['#009e73', '#2563eb', '#e69f00', '#9333ea', '#dc4b5a', '#0891b2', '#854d0e', '#64748b'];
function PrintLocationCharts({ title, rows, palette }) {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  const maximum = Math.max(0, ...rows.map(row => row.weight));
  const slices = rows.reduce((result, row, index) => {
    const end = result.position + (total > 0 ? row.weight / total * 100 : 0);
    return { position: end, values: [...result.values, `${palette[index % palette.length]} ${result.position}% ${end}%`] };
  }, { position: 0, values: [] }).values;
  return <div className="wa-print-chart-set">
    {['Bar chart', 'Pie chart', 'Donut chart'].map(type => <section className="wa-print-chart" key={type}>
      <h3>{title} — {type}</h3>
      {!rows.length ? <p>No completed pickups recorded for this month.</p> : <>
        {type === 'Bar chart' && <div className="wa-area-columns wa-print-area-columns">{rows.map(row => <div className="wa-area-column" key={row.key}>
          <div className="wa-area-bar-space"><div className="wa-area-bar" style={{ height: `${maximum > 0 ? row.weight / maximum * 100 : 0}%` }}><span>{kg(row.weight)} kg</span></div></div>
          <strong className="wa-area-axis-label">{row.label}</strong>{row.district && <small>{row.district}</small>}<small>{row.pickups} pickups</small>
        </div>)}</div>}
        {type !== 'Bar chart' && <div className="wa-print-round-wrap"><div className={`wa-round-chart ${type === 'Donut chart' ? 'wa-donut' : ''}`} style={{ background: total > 0 ? `conic-gradient(${slices.join(',')})` : '#e5e7eb' }}>{type === 'Donut chart' && <div className="wa-donut-center"><strong>{kg(total)}</strong><small>kg collected</small></div>}</div></div>}
        <ul className="wa-print-chart-legend">{rows.map((row, index) => <li key={row.key}><i className="wa-legend-dot" style={{ background: palette[index % palette.length] }} aria-hidden="true"/><span>{row.label}{row.district ? `, ${row.district}` : ''}</span><strong>{kg(row.weight)} kg · {row.pickups} pickups{type !== 'Bar chart' && total > 0 ? ` · ${kg(row.weight / total * 100)}%` : ''}</strong></li>)}</ul>
      </>}
    </section>)}
  </div>;
}
function LocationChart({ title, rows, month, unavailable = false }) {
  const { isDarkMode } = useContext(ThemeContext);
  const palette = isDarkMode ? ['#d4d4d4', '#737373', '#a3a3a3', '#525252', '#e5e5e5', '#8a8a8a', '#b8b8b8', '#404040'] : chartColors;
  const [chartType, setChartType] = useState('bar');
  const maximum = Math.max(0, ...rows.map(row => row.weight));
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  const { slices } = rows.reduce((result, row, index) => {
    const end = result.position + (total > 0 ? row.weight / total * 100 : 0);
    return { position: end, slices: [...result.slices, `${palette[index % palette.length]} ${result.position}% ${end}%`] };
  }, { position: 0, slices: [] });
  return <section className="wa-panel wa-location-panel"><div className="wa-panel-heading"><h2>{title} <small>kg collected</small></h2><DownloadChart title={title} month={month} rows={rows} type={chartType} disabled={unavailable || !rows.length}/></div>
    <div className="wa-chart-options" role="group" aria-label={`${title} chart type`}>
      {['bar', 'pie', 'donut'].map(type => <button key={type} type="button" aria-pressed={chartType === type} onClick={() => setChartType(type)}>{type === 'bar' ? 'Bar chart' : type === 'pie' ? 'Pie chart' : 'Donut'}</button>)}
    </div>
    <div className="wa-interactive-chart">{!rows.length ? <p className="wa-note">{unavailable ? 'Unable to load area data. Please refresh to retry.' : 'No completed pickups recorded for this month.'}</p> : <>
      {chartType === 'bar' && <div className="wa-area-columns" role="list" aria-label={`${title} collection in kilograms`}>
        {rows.map(row => <div className="wa-area-column" role="listitem" key={row.key} title={`${row.label}${row.district ? `, ${row.district}` : ''}: ${kg(row.weight)} kg · ${row.pickups} pickups`}>
          <div className="wa-area-bar-space"><div className="wa-area-bar" style={{ height: `${maximum > 0 ? row.weight / maximum * 100 : 0}%` }}><span>{kg(row.weight)} kg</span></div></div>
          <strong className="wa-area-axis-label">{row.label}</strong>
          {row.district && <small>{row.district}</small>}
          <small>{row.pickups} pickups</small>
        </div>)}
      </div>}
      {chartType !== 'bar' && (total > 0 ? <div className="wa-round-wrap"><div className={`wa-round-chart ${chartType === 'donut' ? 'wa-donut' : ''}`} style={{ background: `conic-gradient(${slices.join(',')})` }} role="img" aria-label={`${title}: ${kg(total)} kg total. Area weights and percentages listed below.`}>{chartType === 'donut' && <div className="wa-donut-center"><strong>{kg(total)}</strong><small>kg collected</small></div>}</div></div> : <p className="wa-note">No collected weight to show as proportions.</p>)}
      {chartType !== 'bar' && <ul className="wa-location-chart">{rows.map((row, index) => <li key={row.key}>
        <div className="wa-location-label"><div><strong><i className="wa-legend-dot" style={{ background: palette[index % palette.length] }} aria-hidden="true"/>{row.label}</strong>{row.district && <small>{row.district}</small>}</div><span>{kg(row.weight)} kg<small>{row.pickups} pickups · {total > 0 ? kg(row.weight / total * 100) : 0}%</small></span></div>
      </li>)}</ul>}
    </>}</div>
    <PrintLocationCharts title={title} rows={rows} palette={palette}/>
  </section>;
}
export default function WasteAnalysis() {
  const [month,setMonth]=useState(()=>dayKey(Date.now()).slice(0,7));
  const query=useQuery({queryKey:['waste-analysis',month],queryFn:({signal})=>loadAnalysis(api,month,signal),refetchInterval:60000});
  const summary=summarizeWaste(query.data?.rows || [],month);
  const locations = summarizeLocations(query.data?.locations || []);
  const peak=Math.max(0,...summary.days.map(d=>d.weight));
  const today=dayKey(Date.now());
  return <section className="waste-analysis">
    <header><div><span className="wa-eyebrow">COLLECTION ANALYTICS</span><h1>Daily waste analysis</h1><p>Total waste collected from completed pickups, day by day.</p><p className="wa-print-period">Reporting period: {month}</p></div><div className="wa-controls"><label>Month <input aria-label="Analysis month" type="month" min="2000-01" max="2100-12" value={month} onChange={e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))setMonth(e.target.value);}} /></label><button disabled={query.isFetching} onClick={()=>query.refetch()}><RefreshCw size={16}/>Refresh</button><button className="wa-pdf-button" type="button" disabled={query.isLoading || !query.data} onClick={()=>window.print()}><FileDown size={16}/>Download PDF</button></div></header>
    <p className="wa-note">Collection weight is used as the company intake estimate. Arrival at the company is not separately recorded. Bin scans have no recorded weight and are not included.</p>
    {query.isError && <p role="alert" className="wa-error">{query.error.response?.data?.message || 'Unable to load waste analysis. Please retry.'}{query.data ? ' Showing previously loaded figures.' : ''}</p>}
    {query.isLoading ? <p role="status">Loading waste collection data…</p> : query.data && <>
      <div className="wa-stats"><article><Scale/><span>Waste collected<strong>{kg(summary.total)} <small>kg</small></strong></span></article><article><Truck/><span>Completed pickups<strong>{summary.pickups}</strong></span></article><article><TrendingUp/><span>Highest daily collection<strong>{kg(peak)} <small>kg</small></strong></span></article></div>
      {summary.estimated > 0 && <p className="wa-notice">{summary.estimated} older pickup{summary.estimated===1?'':'s'} use the last-updated date as an estimate because no completion date was saved. Later edits can move these records between days.</p>}
      <h2 className="wa-location-heading">Collection by area</h2>
      <p className="wa-note">Based on customers’ current saved locations for the selected month. Each chart uses its own scale; weights and pickup counts are shown beside each area.</p>
      <div className="wa-location-grid"><LocationChart month={month} title="District-wise" rows={locations.districts} unavailable={!Array.isArray(query.data.locations)} /><LocationChart month={month} title="Panchayat-wise" rows={locations.panchayats} unavailable={!Array.isArray(query.data.locations)} /><LocationChart month={month} title="Municipality / corporation-wise" rows={locations.municipalities} unavailable={!Array.isArray(query.data.locations)} /></div>{locations.unknownPickups > 0 && <p className="wa-notice">{locations.unknownPickups} pickups have no recognised local body type. They are included in district totals but cannot be assigned to a panchayat or municipality.</p>}{!Array.isArray(query.data.locations) && <p role="status" className="wa-notice">Daily totals are available, but the area breakdown could not be loaded or matched to these totals. Click Refresh to retry.</p>}
      <section className="wa-panel"><div className="wa-panel-heading"><h2>Daily collection trend <small>kg</small></h2><DownloadChart title="Daily collection trend" month={month} rows={summary.days.map(day => ({ ...day, label: day.day }))}/></div><div className="wa-chart" role="img" aria-label={`Daily collection for ${month}. Exact weights are listed in the table below.`}>{summary.days.map(d=><div className="wa-column" key={d.day} title={`${d.day}: ${kg(d.weight)} kg · ${d.pickups} pickups`}><div className="wa-bar-space"><div className="wa-bar" style={{height:`${peak ? d.weight/peak*100 : 0}%`}}/></div><span>{d.day.slice(-2)}</span></div>)}</div>{!summary.pickups && <p className="wa-note">No completed pickups recorded for this month.</p>}</section>
      <div className="wa-bottom"><section className="wa-panel"><h2>Daily totals</h2><div className="wa-table"><table><thead><tr><th>Date (IST)</th><th>Collected (kg)</th><th>Pickups</th><th>Estimated dates</th></tr></thead><tbody>{summary.days.map(d=><tr key={d.day}><td>{d.day}{d.day>today?' · Upcoming':''}</td><td>{d.day>today && !d.pickups?'—':kg(d.weight)}</td><td>{d.pickups}</td><td>{d.estimated || '—'}</td></tr>)}</tbody><tfoot><tr><th>Total</th><th>{kg(summary.total)}</th><th>{summary.pickups}</th><th>{summary.estimated}</th></tr></tfoot></table></div></section><section className="wa-panel"><h2>Waste types</h2>{summary.categories.map(([type,weight])=><div className="wa-category" key={type}><span>{type}</span><strong>{kg(weight)} kg</strong></div>)}{!summary.categories.length && <p className="wa-note">No waste types recorded.</p>}<p className="wa-note">New pickups use their saved completion date. All days follow India Standard Time. Scheduled, cancelled and unfinished pickups are excluded.</p></section></div>
    </>}
  </section>;
}



