import { useCallback, useContext, useEffect, useState } from 'react';
import { Award, CalendarCheck, Download, IndianRupee, RefreshCw, Recycle, WalletCards } from 'lucide-react';
import api from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import './ClientPortal.css';

const idOf = (item) => item?.id || item?._id || '';
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

export default function ClientPortal() {
  const { appUser } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardResponse, invoiceResponse] = await Promise.all([
        api.get('/v1/client-portal/dashboard'),
        api.get('/v1/monthly-invoices'),
      ]);
      setDashboard(dashboardResponse.data.data);
      setInvoices(invoiceResponse.data?.data || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load the client portal.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const payOnline = async (invoice) => {
    setBusy(idOf(invoice));
    try {
      if (!(await loadRazorpay())) throw new Error('Unable to load the secure payment window.');
      const orderResponse = await api.post(`/v1/monthly-invoices/${idOf(invoice)}/razorpay-order`);
      const order = orderResponse.data.data;
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency,
        name: 'REPAMP', description: `Waste collection invoice ${invoice.billingMonth}`,
        order_id: order.orderId,
        prefill: { name: appUser?.name || '', contact: appUser?.phonenumber || '', email: appUser?.email || '' },
        theme: { color: '#12674f' },
        config: razorpayMethods,
        handler: async (payment) => {
          try {
            await api.post(`/v1/monthly-invoices/${idOf(invoice)}/razorpay-verify`, payment);
            await load();
          } catch (verifyError) { setError(verifyError.response?.data?.message || 'Payment verification failed.'); }
          finally { setBusy(''); }
        },
        modal: { ondismiss: () => setBusy('') },
      });
      checkout.open();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to start online payment.');
      setBusy('');
    }
  };

  const download = async (invoice) => {
    try {
      const response = await api.get(`/v1/monthly-invoices/${idOf(invoice)}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data), link = document.createElement('a');
      link.href = url; link.download = `REPAMP-${invoice.billingMonth}-invoice.pdf`; link.click(); URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to download invoice.'); }
  };

  if (loading) return <div className="client-loading"><RefreshCw className="client-spin" />Loading client portal…</div>;
  const maxWeight = Math.max(1, ...(dashboard?.monthly || []).map((item) => item.weight));
  return <section className="client-portal">
    <header><div><span>Client portal</span><h1>Welcome, {appUser?.name || 'Client Admin'}</h1><p>Your organization’s collection, environmental impact and monthly billing.</p></div><button onClick={load}><RefreshCw size={17} />Refresh</button></header>
    {error && <div className="client-error">{error}</div>}
    <div className="green-scorecard">
      <div className="green-copy"><div className="green-label"><Recycle size={16} />GREEN CERTIFICATE DASHBOARD</div><h2>{dashboard?.environmentalScore || 0}<small>/100</small></h2><p>Environmental impact score</p><span>Carbon reduction is an estimate using {dashboard?.carbonFactor || .5} kg CO₂e per kg of collected waste.</span></div>
      <div className="green-metrics"><Metric icon={<Recycle />} value={`${Number(dashboard?.totalWeight || 0).toFixed(2)} kg`} label="Waste recycled" /><Metric icon={<Recycle />} value={`${Number(dashboard?.carbonAvoided || 0).toFixed(2)} kg`} label="Estimated CO₂e avoided" /><Metric icon={<CalendarCheck />} value={dashboard?.completedCollections || 0} label="Collections completed" /><Metric icon={<Award />} value={dashboard?.activeContracts || 0} label="Recurring contracts" /></div>
    </div>
    <div className="client-panels">
      <div className="impact-panel"><h3>Monthly recycling performance</h3><div className="impact-chart">{dashboard?.monthly?.length ? dashboard.monthly.map((item) => <div className="impact-column" key={item.month}><div><i style={{height:`${Math.max(8,(item.weight/maxWeight)*150)}px`}}><span>{item.weight.toFixed(1)} kg</span></i></div><small>{item.month}</small></div>) : <p>No completed collection data yet.</p>}</div></div>
      <div className="billing-overview"><h3>Billing overview</h3><div><WalletCards /><span><strong>₹{Number(dashboard?.invoices?.outstanding || 0).toFixed(2)}</strong>Outstanding amount (incl. GST)</span></div><div><IndianRupee /><span><strong>{dashboard?.invoices?.unpaid || 0}</strong>Unpaid invoices</span></div></div>
    </div>
    <div className="client-invoices"><h3>Monthly invoices</h3>{invoices.length ? <table><thead><tr><th>Month</th><th>Collections</th><th>Weight</th><th>Amount (incl. GST)</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead><tbody>{invoices.map((invoice)=><tr key={idOf(invoice)}><td>{invoice.billingMonth}</td><td>{invoice.pickupIds?.length||0}</td><td>{Number(invoice.totalWeight).toFixed(2)} kg</td><td>₹{Number(invoice.totalAmount).toFixed(2)}</td><td>{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td><td><span className={`client-invoice-status ${invoice.status}`}>{invoice.status}</span></td><td><div className="client-actions"><button onClick={()=>download(invoice)}><Download size={14}/>PDF</button>{invoice.status!=='paid'&&<button className="pay" onClick={()=>payOnline(invoice)} disabled={busy===idOf(invoice)}><WalletCards size={14}/>{busy===idOf(invoice)?'Opening…':'Pay online'}</button>}</div></td></tr>)}</tbody></table> : <div className="client-empty">No monthly invoices available.</div>}</div>
  </section>;
}
function Metric({icon,value,label}){return <div>{icon}<span><strong>{value}</strong>{label}</span></div>}
