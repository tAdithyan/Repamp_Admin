import { useCallback, useContext, useEffect, useState } from 'react';
import { CalendarClock, Check, CheckCircle2, Clock3, Download, Edit3, Eye, MapPin, Pause, Play, Plus, Printer, QrCode, RefreshCw, Trash2, UserRound, X, XCircle } from 'lucide-react';
import api from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import './RecurringPickups.css';
import './RecurringQr.css';
import './CollectionDetails.css';
import './CollectionAttendance.css';
import './MonthlyBilling.css';

const DAYS = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
];
const initialForm = {
  customerId: '', operatorId: '', name: '', wasteType: '', collectionDays: [], preferredTime: '09:00',
  ratePerKg: '', longitude: '', latitude: '', address: '', notes: '',
  startDate: new Date().toISOString().slice(0, 10), endDate: '', isActive: true, assignedBin: '',
};
const idOf = (value) => value?.id || value?._id || '';
const qrImage = (url) => `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(url)}`;
const dayKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const scheduledAttendance = (contract, pickups) => {
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const start = new Date(contract.startDate);
  const earliest = new Date(today); earliest.setDate(earliest.getDate() - 89); earliest.setHours(0, 0, 0, 0);
  const cursor = start > earliest ? new Date(start) : earliest;
  cursor.setHours(12, 0, 0, 0);
  const contractEnd = contract.endDate ? new Date(contract.endDate) : today;
  const end = contractEnd < today ? contractEnd : today;
  const pickupByDate = new Map((pickups || []).map((pickup) => [dayKey(pickup.preferredDate), pickup]));
  const entries = [];
  while (cursor <= end) {
    if ((contract.collectionDays || []).includes(cursor.getDay())) {
      const pickup = pickupByDate.get(dayKey(cursor));
      entries.push({ date: new Date(cursor), pickup, completed: pickup?.status === 'completed' });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return entries.reverse();
};

export default function RecurringPickups() {
  const { appUser } = useContext(AuthContext);
  const isClientAdmin = ['ROL_6', 'CLIENT_ADMIN'].includes(appUser?.role);
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [prices, setPrices] = useState([]);
  const [bins, setBins] = useState([]);
  const [agents, setAgents] = useState([]);
  const [agentError, setAgentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(null);
  const [collectionDetails, setCollectionDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contractResponse, customerResponse, priceResponse, binResponse] = await Promise.all([
        api.get('/v1/recurring-pickups'),
        api.get('/v1/users', { params: { role: 'ROL_6' } }),
        api.get('/v1/waste-prices'),
        api.get('/v1/bins'),
      ]);
      setContracts(contractResponse.data?.data || []);
      setCustomers(customerResponse.data?.data || []);
      setPrices(priceResponse.data?.data || []);
      setBins(binResponse.data?.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load recurring pickup contracts.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!modal || isClientAdmin) return;
    let cancelled = false;
    setAgentError('');
    Promise.all(['ROL_4', 'ROL_3'].map(role => api.get('/v1/users', { params: { role } })))
      .then(responses => { if (!cancelled) setAgents(responses.flatMap(response => response.data?.data || [])); })
      .catch(() => { if (!cancelled) setAgentError('Unable to load agents. Close and reopen this form to retry, or leave the pickup unassigned.'); });
    return () => { cancelled = true; };
  }, [modal, isClientAdmin]);

  const openNew = () => { setEditingId(''); setForm(initialForm); setModal(true); setNotice(''); };
  const openEdit = (contract) => {
    setEditingId(idOf(contract));
    setForm({
      customerId: idOf(contract.customerId), name: contract.name, wasteType: contract.wasteType,
      collectionDays: contract.collectionDays || [], preferredTime: contract.preferredTime || '09:00',
      ratePerKg: String(contract.ratePerKg ?? ''), longitude: String(contract.pickupLocation?.coordinates?.[0] ?? ''),
      latitude: String(contract.pickupLocation?.coordinates?.[1] ?? ''), address: contract.address || '',
      notes: contract.notes || '', startDate: new Date(contract.startDate).toISOString().slice(0, 10),
      endDate: contract.endDate ? new Date(contract.endDate).toISOString().slice(0, 10) : '', isActive: contract.isActive,
      assignedBin: idOf(contract.assignedBin),
      operatorId: typeof contract.operatorId === 'string' ? contract.operatorId : idOf(contract.operatorId),
    });
    setModal(true);
  };

  const selectCustomer = (customerId) => {
    const customer = customers.find((item) => idOf(item) === customerId);
    const coords = customer?.cordinates;
    const address = [customer?.houseNo, customer?.address, customer?.localbody, customer?.wardNo && `Ward ${customer.wardNo}`, customer?.pincode].filter(Boolean).join(', ');
    setForm((current) => ({
      ...current, customerId,
      name: current.name || (customer ? `${customer.name} regular collection` : ''),
      longitude: coords?.longitude != null ? String(coords.longitude) : current.longitude,
      latitude: coords?.latitude != null ? String(coords.latitude) : current.latitude,
      address: address || current.address,
    }));
  };

  const selectWaste = (wasteType) => {
    const price = prices.find((item) => item.category === wasteType);
    setForm((current) => ({ ...current, wasteType, ratePerKg: price ? String(price.pricePerKg) : current.ratePerKg }));
  };

  const toggleDay = (day) => setForm((current) => ({
    ...current,
    collectionDays: current.collectionDays.includes(day)
      ? current.collectionDays.filter((item) => item !== day)
      : [...current.collectionDays, day].sort(),
  }));

  const save = async (event) => {
    event.preventDefault();
    if (!form.customerId || !form.name.trim() || !form.wasteType.trim() || !form.collectionDays.length || form.ratePerKg === '' || form.longitude === '' || form.latitude === '') {
      return setError('Complete the customer, contract, waste, days, rate and location fields.');
    }
    setSaving(true);
    try {
      const payload = {
        customerId: form.customerId, name: form.name.trim(), wasteType: form.wasteType.trim(),
        collectionDays: form.collectionDays, preferredTime: form.preferredTime,
        ratePerKg: Number(form.ratePerKg), pickupLocation: { coordinates: [Number(form.longitude), Number(form.latitude)] },
        address: form.address.trim(), notes: form.notes.trim(),
        startDate: form.startDate, endDate: form.endDate || null, isActive: form.isActive,
        assignedBin: form.assignedBin || null,
        ...(!isClientAdmin ? { operatorId: form.operatorId || null } : {}),
      };
      if (editingId) await api.put(`/v1/recurring-pickups/${editingId}`, payload);
      else await api.post('/v1/recurring-pickups', payload);
      setModal(false);
      setNotice(editingId ? 'Recurring contract updated.' : 'Recurring contract created. Today’s pickup was generated if scheduled.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save recurring contract.');
    } finally { setSaving(false); }
  };

  const setStatus = async (contract) => {
    try {
      await api.patch(`/v1/recurring-pickups/${idOf(contract)}/status`, { isActive: !contract.isActive });
      setContracts((current) => current.map((item) => idOf(item) === idOf(contract) ? { ...item, isActive: !item.isActive } : item));
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to change contract status.'); }
  };

  const openCollectionDetails = async (contract) => {
    setDetailsLoading(true);
    setCollectionDetails({ contract, pickups: [], summary: null });
    try {
      const [response, invoiceResponse] = await Promise.all([
        api.get(`/v1/recurring-pickups/${idOf(contract)}/collections`),
        api.get('/v1/monthly-invoices', { params: { contractId: idOf(contract) } }),
      ]);
      setCollectionDetails({ ...response.data.data, invoices: invoiceResponse.data?.data || [] });
    } catch (requestError) {
      setCollectionDetails(null);
      setError(requestError.response?.data?.message || 'Unable to load collection details.');
    } finally { setDetailsLoading(false); }
  };

  const payInvoice = async (invoice, paymentMethod = 'wallet') => {
    setInvoiceBusy(idOf(invoice));
    try {
      await api.patch(`/v1/monthly-invoices/${idOf(invoice)}/pay`, { paymentMethod });
      setCollectionDetails((current) => ({
        ...current,
        invoices: current.invoices.map((item) => idOf(item) === idOf(invoice)
          ? { ...item, status: 'paid', paymentMethod, paidAt: new Date().toISOString() }
          : item),
      }));
      setNotice('Monthly invoice paid successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to pay monthly invoice.');
    } finally { setInvoiceBusy(''); }
  };

  const generateCurrentMonthInvoice = async () => {
    setInvoiceBusy('generate');
    try {
      const billingMonth = new Date().toISOString().slice(0, 7);
      const generatedResponse = await api.post('/v1/monthly-invoices/generate', { billingMonth });
      const response = await api.get('/v1/monthly-invoices', { params: { contractId: idOf(collectionDetails.contract) } });
      setCollectionDetails((current) => ({ ...current, invoices: response.data?.data || [] }));
      setNotice(generatedResponse.data?.message || `Invoice generation checked for ${billingMonth}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to generate monthly invoices.');
    } finally { setInvoiceBusy(''); }
  };

  const downloadInvoice = async (invoice) => {
    const busyKey = `download-${idOf(invoice)}`;
    setInvoiceBusy(busyKey);
    try {
      const response = await api.get(`/v1/monthly-invoices/${idOf(invoice)}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `REPAMP-${invoice.billingMonth}-invoice.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to download this invoice.');
    } finally { setInvoiceBusy(''); }
  };

  return (
    <section className="recurring-page">
      <header className="recurring-header">
        <div><span>Automated collections</span><h1>Recurring pickups</h1><p>Configure regular customer contracts and generate pickups automatically.</p></div>
        <div><button className="recurring-refresh" onClick={load}><RefreshCw size={17} className={loading ? 'recurring-spin' : ''} />Refresh</button>{!isClientAdmin && <button className="recurring-add" onClick={openNew}><Plus size={18} />New contract</button>}</div>
      </header>
      {notice && <div className="recurring-alert success">{notice}</div>}
      {error && <div className="recurring-alert error">{error}</div>}
      <div className="recurring-summary">
        <div><CalendarClock /><span><strong>{contracts.length}</strong>Total contracts</span></div>
        <div><Check /><span><strong>{contracts.filter((item) => item.isActive).length}</strong>Active schedules</span></div>
        <div><Pause /><span><strong>{contracts.filter((item) => !item.isActive).length}</strong>Paused</span></div>
      </div>
      <div className="recurring-grid">
        {loading ? <div className="recurring-empty"><RefreshCw className="recurring-spin" />Loading contracts…</div> : !contracts.length ? <div className="recurring-empty"><CalendarClock size={34} /><strong>No recurring contracts</strong><p>Create a contract for hospitals, apartments, hotels or commercial customers.</p></div> : contracts.map((contract) => (
          <article className="recurring-card" key={idOf(contract)}>
            <div className="recurring-card-top"><div className="recurring-icon"><CalendarClock /></div><div><small>{contract.customerId?.name || 'Customer'}</small><h3>{contract.name}</h3></div><span className={contract.isActive ? 'active' : 'paused'}>{contract.isActive ? 'Active' : 'Paused'}</span></div>
            <div className="recurring-days">{DAYS.map((day) => <i className={contract.collectionDays?.includes(day.value) ? 'selected' : ''} key={day.value}>{day.label[0]}</i>)}</div>
            <div className="recurring-details">
              <span><Clock3 size={15} />{contract.preferredTime}</span><span>₹{Number(contract.ratePerKg).toFixed(2)}/kg + 18% GST</span>
              <span><UserRound size={15} />{contract.wasteType}</span><span><MapPin size={15} />{contract.address || 'Coordinates saved'}</span>
              <span><Trash2 size={15} />{contract.assignedBin ? `${contract.assignedBin.binId} · ${contract.assignedBin.name}` : 'No bin assigned'}</span>
              <span><UserRound size={15} />{contract.clientAdminId?.name || 'No client representative'}</span>
              <span><UserRound size={15} />{contract.operatorId?.name ? `Assigned to ${contract.operatorId.name}` : 'No agent assigned'}</span>
            </div>
            <div className="recurring-actions"><button onClick={() => openCollectionDetails(contract)}><Eye size={15} />Collections</button><button onClick={() => setPrinting(contract)}><QrCode size={15} />View QR</button><button onClick={() => openEdit(contract)}><Edit3 size={15} />Edit</button><button className={contract.isActive ? 'pause' : 'resume'} onClick={() => setStatus(contract)}>{contract.isActive ? <Pause size={15} /> : <Play size={15} />}{contract.isActive ? 'Pause' : 'Activate'}</button></div>
          </article>
        ))}
      </div>

      {modal && <div className="recurring-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(false)}><form className="recurring-modal" onSubmit={save}>
        <button type="button" className="recurring-close" onClick={() => setModal(false)}><X /></button>
        <h2>{editingId ? 'Edit recurring contract' : 'New recurring contract'}</h2><p>The system will create one pickup on every selected day.</p>
        <div className="recurring-form-grid">
          {!isClientAdmin && <label>Assign agent (optional)
            <select value={form.operatorId} onChange={(e) => setForm({ ...form, operatorId: e.target.value })}>
              <option value="">Leave unassigned</option>
              {form.operatorId && !agents.some(agent => idOf(agent) === form.operatorId) && <option value={form.operatorId}>Current assigned agent</option>}
              {agents.map(agent => <option key={idOf(agent)} value={idOf(agent)}>{agent.name} — {agent.role === 'ROL_3' ? 'Coordinator' : 'Collection agent'}{agent.phonenumber ? ` — ${agent.phonenumber}` : ''}</option>)}
            </select>
            <small>Applies to newly generated pickups. Existing pickups keep their assignment.</small>
            {agentError && <small role="alert">{agentError}</small>}
          </label>}
          <label>Customer *<select value={form.customerId} onChange={(e) => selectCustomer(e.target.value)} disabled={isClientAdmin && Boolean(editingId)}><option value="">Select customer</option>{customers.map((customer) => <option key={idOf(customer)} value={idOf(customer)}>{customer.name} — {customer.phonenumber}</option>)}</select></label>
          <label>Contract name *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ABC Hospital regular collection" /></label>
          <label>Waste type *<select value={form.wasteType} onChange={(e) => selectWaste(e.target.value)}><option value="">Select waste type</option>{prices.map((price) => <option key={price.category} value={price.category}>{price.category}</option>)}</select></label>
          <label>Contract base rate (₹/kg, before GST) *<input type="number" min="0" step=".01" value={form.ratePerKg} onChange={(e) => setForm({ ...form, ratePerKg: e.target.value })} disabled={isClientAdmin && Boolean(editingId)} /></label>
          <label>Preferred time *<input type="time" value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })} /></label>
          <label>Start date *<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
          <label>End date (optional)<input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
          <label>Assigned bin<select value={form.assignedBin} onChange={(e) => setForm({ ...form, assignedBin: e.target.value })} disabled={isClientAdmin && Boolean(editingId)}><option value="">No bin assigned</option>{bins.map((bin) => <option key={idOf(bin)} value={idOf(bin)}>{bin.binId} — {bin.name} — {bin.location}</option>)}</select></label>
          <label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label>Longitude *<input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></label>
          <label>Latitude *<input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></label>
        </div>
        <label className="recurring-day-label">Collection days *</label><div className="recurring-day-picker">{DAYS.map((day) => <button type="button" className={form.collectionDays.includes(day.value) ? 'selected' : ''} onClick={() => toggleDay(day.value)} key={day.value}>{day.label}</button>)}</div>
        <label className="recurring-notes">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Access instructions or collection notes" /></label>
        <button className="recurring-submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create recurring contract'}</button>
      </form></div>}
      {printing && <div className="recurring-qr-overlay">
        <div className="recurring-qr-sheet">
          <button className="recurring-close recurring-qr-close" onClick={() => setPrinting(null)}><X /></button>
          <div className="recurring-qr-brand">REPAMP</div>
          <h2>{printing.name}</h2>
          <strong>{printing.customerId?.name}</strong>
          <img src={qrImage(`myapp://recurring/${printing.qrToken}`)} alt={`QR code for ${printing.name}`} />
          <p>Recurring collection contract</p>
          <small>{printing.assignedBin ? `Assigned bin: ${printing.assignedBin.binId} · ${printing.assignedBin.name}` : 'No bin assigned'}</small>
          <button className="recurring-print" onClick={() => window.print()}><Printer size={18} />Print permanent QR</button>
        </div>
      </div>}
      {collectionDetails && <div className="collection-detail-overlay" onMouseDown={(event) => event.target === event.currentTarget && setCollectionDetails(null)}>
        <div className="collection-detail-modal">
          <button className="recurring-close" onClick={() => setCollectionDetails(null)}><X /></button>
          <div className="collection-detail-heading"><div><span>Recurring collection activity</span><h2>{collectionDetails.contract?.name}</h2><p>{collectionDetails.contract?.customerId?.name || collectionDetails.contract?.customerId?.phonenumber}</p></div><CalendarClock size={32} /></div>
          {detailsLoading ? <div className="collection-loading"><RefreshCw className="recurring-spin" />Loading collections…</div> : <>
            <div className="collection-summary">
              <div><strong>{collectionDetails.summary?.total || 0}</strong><span>Generated</span></div>
              <div><strong>{collectionDetails.summary?.completed || 0}</strong><span>Completed</span></div>
              <div><strong>{Number(collectionDetails.summary?.totalWeight || 0).toFixed(2)} kg</strong><span>Collected</span></div>
              <div><strong>₹{Number(collectionDetails.summary?.totalAmount || 0).toFixed(2)}</strong><span>Total billed (incl. GST)</span></div>
            </div>
            <div className="attendance-heading"><span>Assigned collection days</span><small><i className="done-dot" />Completed <i className="missed-dot" />Not completed</small></div>
            <div className="attendance-table-wrap">
              {scheduledAttendance(collectionDetails.contract, collectionDetails.pickups).length ? (
                <table className="attendance-table">
                  <thead><tr><th>Date</th><th>Assigned day</th><th>Pickup ID</th><th>Status</th><th>Result</th></tr></thead>
                  <tbody>{scheduledAttendance(collectionDetails.contract, collectionDetails.pickups).map((entry) => (
                    <tr key={dayKey(entry.date)}>
                      <td>{entry.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>{entry.date.toLocaleDateString('en-IN', { weekday: 'long' })}</td>
                      <td>{entry.pickup?.pickupId || 'Not generated'}</td>
                      <td className="attendance-status">{entry.pickup?.status?.replaceAll('_', ' ') || 'Not completed'}</td>
                      <td><span className={entry.completed ? 'table-result done' : 'table-result missed'}>{entry.completed ? <CheckCircle2 size={17} /> : <XCircle size={17} />}{entry.completed ? 'Completed' : 'Not completed'}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : <div className="collection-empty"><CalendarClock size={30} /><strong>No assigned collection days yet</strong></div>}
            </div>
            <div className="monthly-billing-heading"><div><span>Monthly billing</span><small>Invoices are generated automatically after month-end. Use this action to close the current month early.</small></div><button onClick={generateCurrentMonthInvoice} disabled={invoiceBusy === 'generate'}>{invoiceBusy === 'generate' ? 'Generating…' : 'Generate current month'}</button></div>
            <div className="monthly-invoice-table-wrap">
              {collectionDetails.invoices?.length ? <table className="monthly-invoice-table">
                <thead><tr><th>Billing month</th><th>Collections</th><th>Weight</th><th>Total</th><th>Due date</th><th>Status</th><th>Payment</th><th>Invoice</th></tr></thead>
                <tbody>{collectionDetails.invoices.map((invoice) => <tr key={idOf(invoice)}>
                  <td>{invoice.billingMonth}</td><td>{invoice.pickupIds?.length || 0}</td><td>{Number(invoice.totalWeight || 0).toFixed(2)} kg</td><td>₹{Number(invoice.totalAmount || 0).toFixed(2)} incl. GST</td><td>{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
                  <td><span className={`invoice-status ${invoice.status}`}>{invoice.status}</span></td>
                  <td>{invoice.status === 'paid' ? <small>{invoice.paymentMethod} · {new Date(invoice.paidAt).toLocaleDateString('en-IN')}</small> : <div className="invoice-pay-actions"><button onClick={() => payInvoice(invoice, 'wallet')} disabled={invoiceBusy === idOf(invoice)}>Pay wallet</button><button onClick={() => payInvoice(invoice, 'manual')} disabled={invoiceBusy === idOf(invoice)}>Mark paid</button></div>}</td>
                  <td><button className="invoice-download" onClick={() => downloadInvoice(invoice)} disabled={invoiceBusy === `download-${idOf(invoice)}`}><Download size={14} />{invoiceBusy === `download-${idOf(invoice)}` ? 'Preparing…' : 'PDF'}</button></td>
                </tr>)}</tbody>
              </table> : <div className="invoice-empty">No monthly invoices generated yet.</div>}
            </div>
          </>}
        </div>
      </div>}
    </section>
  );
}
