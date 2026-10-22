import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RefreshCw, Users, Clock3, CalendarCheck, Search } from 'lucide-react';
import api from '../../api/axiosInstance';
import { attendance, dailyShiftHistory, dayKey, formatTime, hours } from './attendance';
import './AgentDetails.css';
import { normalizeAgentRole } from './roles';

const roleName = role => role === 'ROL_3' ? 'Coordinator · ROL_3' : 'Collection agent · ROL_4';
const shiftStatus = agent => agent.active ? 'On shift' : 'Off shift';

export default function AgentDetails() {
  const [month, setMonth] = useState(() => dayKey(Date.now()).slice(0, 7));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('ROL_3');
  const [selectedId, setSelectedId] = useState(null);
  const profile = useRef(null);
  useEffect(() => { if (selectedId) profile.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [selectedId]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const query = useQuery({ queryKey: ['agent-details', month], queryFn: async ({ signal }) => (await api.get('/v1/shifts/agents', { params: { month }, signal })).data.data,
    refetchInterval: 30000 });
  const agents = useMemo(() => (query.data?.agents || []).map(agent => {
    const shifts = agent.shifts || [];
    const days = attendance(shifts, month, now);
    const completed = (agent.pickups || []).filter(p => p.status === 'completed');
    const dailyPickups = Object.values((agent.pickups || []).reduce((groups, pickup) => {
      const timestamp = new Date(pickup.preferredDate).getTime();
      if (!Number.isFinite(timestamp)) return groups;
      const day = dayKey(timestamp);
      const group = groups[day] || { day, total: 0, completed: 0 };
      group.total += 1;
      if (pickup.status === 'completed') group.completed += 1;
      groups[day] = group;
      return groups;
    }, {})).sort((a, b) => a.day.localeCompare(b.day));
    return { ...agent, role: normalizeAgentRole(agent.role), completed, collectedWeight: completed.reduce((sum, p) => sum + Number(p.weight || 0), 0), days, active: shifts.find(s => s.status === 'active'), presentDays: days.filter(d => d.present).length,
      dailyPickups, seconds: days.reduce((sum, d) => sum + d.seconds, 0) };
  }), [query.data, month, now]);
  const roleAgents = agents.filter(a => roleFilter === 'all' || a.role === roleFilter);
  const visible = roleAgents.filter(a => `${a.name} ${a.userId || ''} ${a.phonenumber || ''} ${a.vehicleno || ''}`.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || (filter === 'active' ? a.active : a.role === 'ROL_4' && !a.active)));
  const selected = agents.find(a => a._id === selectedId);
  const monthStart = new Date(`${month}-01T00:00:00+05:30`).getTime();
  const [year, monthNumber] = month.split('-').map(Number);
  const monthEnd = Date.UTC(year, monthNumber, 1) - 330 * 60000;
  const history = selected?.shifts.filter(s => new Date(s.startedAt).getTime() < monthEnd && (s.endedAt ? new Date(s.endedAt).getTime() : now) > monthStart) || [];
  const dailyHistory = dailyShiftHistory(history, now);
  const dailyHistoryRows = new Map(dailyHistory.map(day => [day.day, { ...day, pickupCount: 0, completedPickupCount: 0 }]));
  for (const day of selected?.dailyPickups || []) {
    const row = dailyHistoryRows.get(day.day) || {
      day: day.day, startedAt: null, endedAt: null, active: false,
      count: 0, collectedBinCount: 0, seconds: 0,
      pickupCount: 0, completedPickupCount: 0,
    };
    row.pickupCount = day.total;
    row.completedPickupCount = day.completed;
    dailyHistoryRows.set(day.day, row);
  }
  const shiftHistoryRows = [...dailyHistoryRows.values()].sort((a, b) => b.day.localeCompare(a.day));
  return <section className="agent-details-page">
    <div className="ad-toolbar"><label>Staff role <select aria-label="Staff role" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setSelectedId(null); setFilter('all'); setSearch(''); }}><option value="ROL_3">ROL_3 · Coordinators</option><option value="ROL_4">ROL_4 · Collection agents</option><option value="all">Both roles</option></select></label></div>
    {agents.some(agent => !agent.role) && <div role="alert" className="ad-error">The server returned agent records without roles. Deploy the updated backend and refresh this page to use the role filters.</div>}
    <header className="ad-header"><div><span className="ad-eyebrow">COLLECTION TEAM</span><h1>Agent details</h1><p>Shift status, working time and attendance in one place.</p></div><div className="ad-actions"><Link to="/admin/active-agents">Live map</Link><button onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={16} />{query.isFetching ? 'Updating…' : 'Refresh'}</button></div></header>
    <div className="ad-toolbar"><label><Search size={17} /><input placeholder="Search name, ID, phone or vehicle" aria-label="Search agents" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Month <input type="month" min="2000-01" max="2100-12" value={month} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) setMonth(e.target.value); }} /></label><select aria-label="Shift status" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All shift statuses</option><option value="active">On shift</option><option value="off">Off shift</option></select></div>
    {query.isError && <div role="alert" className="ad-error">{query.error.response?.data?.message || 'Unable to load agent details. Please retry.'}{query.data && ' Showing previously loaded records.'}</div>}
    {query.isLoading ? <p role="status">Loading agent details…</p> : <>
      <div className="ad-stats"><article><Users /><span>Staff in selected role<strong>{roleAgents.length}</strong></span></article><article><Clock3 /><span>Pickups scheduled this month<strong>{roleAgents.reduce((sum, a) => sum + (a.pickups?.length || 0), 0)}</strong></span></article><article><CalendarCheck /><span>Collected weight · kg<strong>{roleAgents.reduce((sum, a) => sum + a.collectedWeight, 0).toFixed(1)}</strong></span></article></div>
      <div className="ad-table-wrap"><table><thead><tr><th>Agent</th><th>Current status</th><th>Latest start in month</th><th>Latest end in month</th><th>Days present</th><th>Hours in month</th><th>Pickups</th><th>Completed</th><th>Collected kg</th><th>Details</th></tr></thead><tbody>{visible.map(agent => {
        const latest = agent.shifts.find(s => new Date(s.startedAt).getTime() < monthEnd && (s.endedAt ? new Date(s.endedAt).getTime() : now) > monthStart);
      return <tr key={agent._id}><td><strong>{agent.name}</strong><small>{roleName(agent.role)}</small><small>{agent.userId || '—'} · {agent.vehicleno || 'No vehicle'}</small></td><td><span className={`ad-badge ${agent.active ? 'present' : ''}`}>{shiftStatus(agent)}</span>{agent.is_active === false && <small>Account disabled</small>}</td><td>{formatTime(latest?.startedAt)}</td><td>{latest?.status === 'active' ? 'In progress' : formatTime(latest?.endedAt)}</td><td>{agent.presentDays}</td><td>{hours(agent.seconds)}</td><td>{agent.pickups?.length || 0}</td><td>{agent.completed.length}</td><td>{agent.collectedWeight.toFixed(1)}</td><td><button onClick={() => setSelectedId(agent._id)}>View details</button></td></tr>;
      })}</tbody></table>{!visible.length && <p className="ad-empty">{query.isError ? 'Agent records are unavailable.' : 'No agents match your selection.'}</p>}</div>
      <p className="ad-note">All times are in India Standard Time. Presence means a shift was recorded that day; no record does not confirm absence. On shift does not mean the device is online. Hours are limited to the selected month.</p>
      {selected && <section ref={profile} className="ad-profile" aria-label={`Details for ${selected.name}`}>
        <header className="ad-header"><div><span className="ad-eyebrow">AGENT PROFILE</span><h2>{selected.name}</h2><p>{roleName(selected.role)} · {shiftStatus(selected)}</p></div><button onClick={() => setSelectedId(null)}>Close details</button></header>
        <dl className="ad-info"><div><dt>Phone</dt><dd>{selected.phonenumber || '—'}</dd></div><div><dt>Email</dt><dd>{selected.email || '—'}</dd></div><div><dt>Vehicle</dt><dd>{selected.vehicleno || '—'}</dd></div><div><dt>Account</dt><dd>{selected.is_active === false ? 'Disabled' : 'Enabled'}</dd></div><div><dt>Current shift started</dt><dd>{formatTime(selected.active?.startedAt)}</dd></div><div><dt>Last GPS update (current shift)</dt><dd>{formatTime(selected.active?.lastLocation?.recordedAt)}</dd></div></dl>
        <h3>Pickup collections · {month}</h3>
        <p className="ad-note">{selected.pickups?.length || 0} assigned pickups scheduled this month · {selected.completed.length} completed · {selected.collectedWeight.toFixed(1)} kg collected. These records are linked by assigned operator. Dates below are scheduled dates, not confirmed collection times.</p>
        <div className="ad-table-wrap"><table><thead><tr><th>Pickup</th><th>Customer</th><th>Scheduled date</th><th>Waste type</th><th>Status</th><th>Weight (kg)</th><th>Amount (₹)</th><th>Payment</th></tr></thead><tbody>{(selected.pickups || []).map(p => <tr key={p._id}><td>{p.pickupId || p._id}</td><td>{p.customerId?.name || '—'}</td><td>{formatTime(p.preferredDate)}</td><td>{p.wasteType}</td><td><span className={`ad-badge ${p.status === 'completed' ? 'present' : ''}`}>{p.status.replaceAll('_', ' ')}</span></td><td>{Number(p.weight || 0).toFixed(1)}</td><td>{Number(p.amount || 0).toFixed(2)}</td><td>{p.paymentStatus || '—'}</td></tr>)}</tbody></table>{!selected.pickups?.length && <p className="ad-empty">No pickups scheduled for this operator in the selected month.</p>}</div>
        <h3>Attendance · {month}</h3><p className="ad-note">{selected.presentDays} days present · {hours(selected.seconds)} recorded</p>
        <div className="ad-calendar">{selected.days.map(d => <div key={d.day} className={d.present ? 'present' : ''}><strong>{d.day}</strong><span>{d.present ? 'Present' : d.future ? 'Upcoming' : 'No shift recorded'}</span>{d.present && <small>{hours(d.seconds)}</small>}</div>)}</div>
        <h3>Shift history</h3><p className="ad-note">One row per day with a shift or scheduled pickup. Pickup counts use scheduled dates in India Standard Time; shift hours stay with the shift start date.</p><div className="ad-table-wrap"><table><thead><tr><th>Date</th><th>First start</th><th>Last end</th><th>Status</th><th>Total working time</th><th>Bins collected</th><th>Scheduled pickups</th><th>Completed pickups</th></tr></thead><tbody>{shiftHistoryRows.map(s => <tr key={s.day}><td>{s.day}{s.count > 0 && <small>{s.count} shift{s.count === 1 ? '' : 's'}</small>}</td><td>{formatTime(s.startedAt)}</td><td>{s.active ? 'In progress' : formatTime(s.endedAt)}</td><td>{s.count === 0 ? 'No shift recorded' : s.active ? 'On shift' : 'Completed'}</td><td>{s.count > 0 ? hours(s.seconds) : '—'}</td><td>{s.collectedBinCount}</td><td>{s.pickupCount}</td><td>{s.completedPickupCount}</td></tr>)}</tbody></table>{!shiftHistoryRows.length && <p className="ad-empty">No shifts or pickups recorded for this month.</p>}</div>
      </section>}
    </>}
  </section>;
}
