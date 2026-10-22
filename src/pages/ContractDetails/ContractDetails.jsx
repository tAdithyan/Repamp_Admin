import { useCallback, useContext, useEffect, useState } from 'react';
import { CalendarDays, Download, FileText, MapPin, RefreshCw, Trash2, WalletCards } from 'lucide-react';
import api from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import './ContractDetails.css';

const idOf = (item) => item?.id || item?._id || '';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});
const razorpayMethods = {
  display: {
    sequence: ['upi', 'card'],
    preferences: { show_default_blocks: false },
  },
};

export default function ContractDetails() {
  const { appUser } = useContext(AuthContext);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [collections, setCollections] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contractResponse, invoiceResponse] = await Promise.all([
        api.get('/v1/recurring-pickups'),
        api.get('/v1/monthly-invoices'),
      ]);
      const loadedContracts = contractResponse.data?.data || [];
      setContracts(loadedContracts);
      setInvoices(invoiceResponse.data?.data || []);
      const collectionResponses = await Promise.all(loadedContracts.map((contract) =>
        api.get(`/v1/recurring-pickups/${idOf(contract)}/collections`)
      ));
      setCollections(Object.fromEntries(loadedContracts.map((contract, index) => [
        idOf(contract), collectionResponses[index].data?.data?.pickups || [],
      ])));
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your contract details.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const payOnline = async (invoice) => {
    setBusy(idOf(invoice));
    try {
      if (!(await loadRazorpay())) throw new Error('Unable to load the secure payment window.');
      const response = await api.post(`/v1/monthly-invoices/${idOf(invoice)}/razorpay-order`);
      const order = response.data.data;
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'REPAMP',
        description: `Waste collection invoice ${invoice.billingMonth}`,
        order_id: order.orderId,
        prefill: { name: appUser?.name || '', contact: appUser?.phonenumber || '', email: appUser?.email || '' },
        theme: { color: '#12674f' },
        config: razorpayMethods,
        handler: async (payment) => {
          try {
            await api.post(`/v1/monthly-invoices/${idOf(invoice)}/razorpay-verify`, payment);
            await load();
          } catch (requestError) {
            setError(requestError.response?.data?.message || 'Payment verification failed.');
          } finally { setBusy(''); }
        },
        modal: { ondismiss: () => setBusy('') },
      });
      checkout.open();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to start Razorpay payment.');
      setBusy('');
    }
  };

  const downloadInvoice = async (invoice) => {
    try {
      const response = await api.get(`/v1/monthly-invoices/${idOf(invoice)}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `REPAMP-${invoice.billingMonth}-invoice.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to download invoice.'); }
  };

  if (loading) return <div className="contract-loading"><RefreshCw className="contract-spin" />Loading contract details…</div>;

  return <section className="contract-page">
    <header><div><span>Client portal</span><h1>Contract details</h1><p>Review your collection agreement and pay monthly invoices securely.</p></div><button onClick={load}><RefreshCw size={17} />Refresh</button></header>
    {error && <div className="contract-error">{error}</div>}
    {!contracts.length ? <div className="contract-empty"><FileText size={36} /><strong>No contract assigned</strong><p>Please contact the administrator to create your recurring collection contract.</p></div> : contracts.map((contract) => {
      const contractInvoices = invoices.filter((invoice) => idOf(invoice.recurringContractId) === idOf(contract));
      const contractCollections = collections[idOf(contract)] || [];
      return <article className="contract-card" key={idOf(contract)}>
        <div className="contract-title"><div><small>Recurring collection contract</small><h2>{contract.name}</h2><p>{contract.customerId?.name}</p></div><span className={contract.isActive ? 'active' : 'paused'}>{contract.isActive ? 'Active' : 'Paused'}</span></div>
        <div className="contract-facts">
          <Fact label="Waste type" value={contract.wasteType} />
          <Fact label="Contract rate" value={`₹${Number(contract.ratePerKg || 0).toFixed(2)} / kg + 18% GST`} />
          <Fact label="Preferred time" value={contract.preferredTime} />
          <Fact label="Collection days" value={(contract.collectionDays || []).map((day) => DAYS[day]).join(', ')} icon={<CalendarDays />} />
          <Fact label="Assigned bin" value={contract.assignedBin ? `${contract.assignedBin.binId} — ${contract.assignedBin.name}` : 'No bin assigned'} icon={<Trash2 />} />
          <Fact label="Collection address" value={contract.address || 'Location coordinates saved'} icon={<MapPin />} />
          <Fact label="Start date" value={new Date(contract.startDate).toLocaleDateString('en-IN')} />
          <Fact label="End date" value={contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-IN') : 'Ongoing'} />
        </div>
        <div className="contract-invoices"><h3>Generated pickups</h3>{contractCollections.length ? <div className="contract-table"><table><thead><tr><th>Pickup</th><th>Preferred date</th><th>Waste type</th><th>Status</th><th>Weight</th><th>Amount (incl. GST)</th></tr></thead><tbody>{contractCollections.map((pickup) => <tr key={idOf(pickup)}><td>{pickup.pickupId}</td><td>{pickup.preferredDate ? new Date(pickup.preferredDate).toLocaleDateString('en-IN') : '—'}</td><td>{pickup.wasteType}</td><td><span className={`contract-status ${pickup.status}`}>{pickup.status}</span></td><td>{Number(pickup.weight || 0).toFixed(2)} kg</td><td>₹{Number(pickup.amount || 0).toFixed(2)}</td></tr>)}</tbody></table></div> : <div className="contract-no-invoice">No pickups have been generated for this contract yet.</div>}</div>
        <div className="contract-invoices"><h3>Monthly invoices</h3>{contractInvoices.length ? <div className="contract-table"><table><thead><tr><th>Month</th><th>Collections</th><th>Weight</th><th>Amount (incl. GST)</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{contractInvoices.map((invoice) => <tr key={idOf(invoice)}><td>{invoice.billingMonth}</td><td>{invoice.pickupIds?.length || 0}</td><td>{Number(invoice.totalWeight || 0).toFixed(2)} kg</td><td>₹{Number(invoice.totalAmount || 0).toFixed(2)}</td><td>{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td><td><span className={`contract-status ${invoice.status}`}>{invoice.status}</span></td><td><div className="contract-actions"><button onClick={() => downloadInvoice(invoice)}><Download size={14} />PDF</button>{invoice.status !== 'paid' && <button className="razorpay" disabled={busy === idOf(invoice)} onClick={() => payOnline(invoice)}><WalletCards size={14} />{busy === idOf(invoice) ? 'Opening…' : 'Pay with Razorpay'}</button>}</div></td></tr>)}</tbody></table></div> : <div className="contract-no-invoice">No monthly invoices generated for this contract.</div>}</div>
      </article>;
    })}
  </section>;
}

function Fact({ label, value, icon }) {
  return <div>{icon}<span><small>{label}</small><strong>{value || '—'}</strong></span></div>;
}
