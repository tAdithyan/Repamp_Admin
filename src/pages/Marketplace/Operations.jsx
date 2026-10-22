import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Boxes, CircleDollarSign, ClipboardList, Clock3, Download, PackageCheck, QrCode, RefreshCw, ShoppingBag, TriangleAlert, TrendingUp } from 'lucide-react';
import api from '../../api/axiosInstance';
import { marketApi, rupees, useMarketQuery } from './marketplace-api';
import { Field, Status } from './Shared';

const statuses = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const nextStatus = { pending: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['packed', 'cancelled'], packed: ['shipped', 'cancelled'], shipped: ['out_for_delivery'], out_for_delivery: ['delivered'], delivered: [], cancelled: [] };
const qrImage = (value) => `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(value)}`;
export default function Operations({ section }) { return section === 'orders' ? <Orders /> : section === 'inventory' ? <Inventory /> : <Dashboard />; }
function QueryState({ query }) { return <Status>{query.isLoading ? 'Loading…' : 'Unable to load this page.'}{query.isError && <button onClick={() => query.refetch()}>Retry</button>}</Status>; }
function Pager({ page, setPage, data }) { return <div className="mp-toolbar"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {data?.pages || 1}</span><button disabled={!data || page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div>; }
function Dashboard() {
  const query = useMarketQuery('dashboard', '/dashboard');
  if (!query.data) return <QueryState query={query} />;
  const d = query.data;
  const recentOrders = Array.isArray(d.recentOrders) ? d.recentOrders : [];
  const topSelling = Array.isArray(d.topSelling) ? d.topSelling : [];
  const lowStock = Array.isArray(d.lowStock) ? d.lowStock : [];
  const orderMix = [
    { label: 'Retail', value: Number(d.retailOrders) || 0, className: 'retail' },
    { label: 'Wholesale', value: Number(d.wholesaleOrders) || 0, className: 'wholesale' },
    { label: 'Mixed', value: Number(d.mixedOrders) || 0, className: 'mixed' },
  ];
  const totalOrderTypes = orderMix.reduce((sum, item) => sum + item.value, 0);
  const formatStatus = (status = 'pending') => String(status).replaceAll('_', ' ');
  const formatOrderDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

  return <div className="mp-dashboard">
    <section className="mp-dashboard-hero">
      <div className="mp-dashboard-hero-copy">
        <span className="mp-dashboard-kicker">MARKETPLACE OVERVIEW</span>
        <h2>Your store at a glance</h2>
        <p>Track orders, sales and stock from one place.</p>
      </div>
      <div className="mp-dashboard-hero-actions">
        <span><Clock3 size={14} /> Today · India Standard Time</span>
        <button onClick={() => query.refetch()}><RefreshCw size={15} /> Refresh</button>
      </div>
      <div className="mp-dashboard-orb mp-dashboard-orb-one" />
      <div className="mp-dashboard-orb mp-dashboard-orb-two" />
    </section>

    <section className="mp-dashboard-stats" aria-label="Marketplace key metrics">
      <article className="mp-dashboard-stat">
        <div className="mp-dashboard-stat-top"><span className="mp-dashboard-stat-icon teal"><ShoppingBag size={18} /></span><span className="mp-dashboard-stat-caption">TODAY</span></div>
        <span className="mp-dashboard-stat-label">Orders today</span><strong>{Number(d.todayOrders) || 0}</strong><small>New marketplace orders</small>
      </article>
      <article className="mp-dashboard-stat">
        <div className="mp-dashboard-stat-top"><span className="mp-dashboard-stat-icon green"><CircleDollarSign size={18} /></span><span className="mp-dashboard-stat-caption">PAID</span></div>
        <span className="mp-dashboard-stat-label">Total sales</span><strong>{rupees(d.totalSales || 0)}</strong><small>Includes delivery and tax</small>
      </article>
      <article className="mp-dashboard-stat">
        <div className="mp-dashboard-stat-top"><span className="mp-dashboard-stat-icon amber"><ClipboardList size={18} /></span><span className="mp-dashboard-stat-caption">TO REVIEW</span></div>
        <span className="mp-dashboard-stat-label">Pending orders</span><strong>{Number(d.pendingOrders) || 0}</strong><small>Waiting for confirmation</small>
      </article>
      <article className="mp-dashboard-stat">
        <div className="mp-dashboard-stat-top"><span className="mp-dashboard-stat-icon rose"><TriangleAlert size={18} /></span><span className="mp-dashboard-stat-caption">NEEDS ATTENTION</span></div>
        <span className="mp-dashboard-stat-label">Low-stock variants</span><strong>{Number(d.lowStockProducts) || 0}</strong><small>Review inventory levels</small>
      </article>
    </section>

    <section className="mp-dashboard-overview-grid">
      <article className="mp-dashboard-panel mp-order-mix-panel">
        <div className="mp-dashboard-panel-heading"><div><span className="mp-dashboard-section-kicker">ORDER BREAKDOWN</span><h2>Order mix</h2></div><span className="mp-dashboard-heading-icon"><Boxes size={18} /></span></div>
        <div className="mp-order-mix-bar" aria-label="Order type distribution">
          {orderMix.map((item) => <span key={item.className} className={item.className} style={{ width: `${totalOrderTypes ? item.value / totalOrderTypes * 100 : 0}%` }} />)}
        </div>
        <div className="mp-order-mix-list">
          {orderMix.map((item) => <div className="mp-order-mix-row" key={item.className}><span className={`mp-order-mix-dot ${item.className}`} /><span>{item.label}</span><strong>{item.value}</strong></div>)}
        </div>
        <div className="mp-revenue-split">
          <div><span>Retail revenue</span><strong>{rupees(d.retailRevenue || 0)}</strong></div>
          <div><span>Wholesale revenue</span><strong>{rupees(d.wholesaleRevenue || 0)}</strong></div>
        </div>
      </article>

      <article className="mp-dashboard-panel mp-top-products-panel">
        <div className="mp-dashboard-panel-heading"><div><span className="mp-dashboard-section-kicker">BEST PERFORMERS</span><h2>Top-selling products</h2></div><span className="mp-dashboard-heading-icon"><TrendingUp size={18} /></span></div>
        {topSelling.length ? <div className="mp-top-products-list">{topSelling.slice(0, 5).map((product, index) => <div className="mp-top-product-row" key={product._id || `${product.name}-${index}`}>
          <span className="mp-product-rank">{String(index + 1).padStart(2, '0')}</span>
          <span className="mp-product-avatar"><PackageCheck size={17} /></span>
          <div className="mp-top-product-copy"><strong>{product.name || 'Product'}</strong><small>{Number(product.packs) || 0} packs · {Number(product.pieces) || 0} pieces sold</small></div>
          <strong className="mp-top-product-revenue">{rupees(product.revenue || 0)}</strong>
        </div>)}</div> : <Status>No delivered sales yet.</Status>}
        <Link className="mp-dashboard-link" to="/admin/marketplace/products">View products <ArrowUpRight size={15} /></Link>
      </article>
    </section>

    <section className="mp-dashboard-overview-grid mp-dashboard-lower-grid">
      <article className="mp-dashboard-panel mp-recent-panel">
        <div className="mp-dashboard-panel-heading"><div><span className="mp-dashboard-section-kicker">LATEST ACTIVITY</span><h2>Recent orders</h2></div><Link className="mp-dashboard-link" to="/admin/marketplace/orders">All orders <ArrowUpRight size={15} /></Link></div>
        {recentOrders.length ? <div className="mp-recent-orders">
          <div className="mp-recent-orders-header"><span>Order</span><span>Customer</span><span>Type</span><span>Amount</span><span>Status</span></div>
          {recentOrders.slice(0, 6).map((order) => <div className="mp-recent-order-row" key={order._id}>
            <strong className="mp-recent-order-id">{order.orderId || 'Order'}</strong>
            <span className="mp-recent-customer">{order.businessInfo?.businessName || order.shippingAddress?.fullName || 'Customer'}</span>
            <span className="mp-order-type">{order.orderType || '—'}</span>
            <strong>{rupees(order.totalAmount || 0)}</strong>
            <span className={`mp-order-status status-${String(order.orderStatus || 'pending').replaceAll('_', '-')}`}>{formatStatus(order.orderStatus)}</span>
            <small className="mp-recent-date">{formatOrderDate(order.createdAt)}</small>
          </div>)}
        </div> : <Status>No orders yet. New customer orders will show here.</Status>}
      </article>

      <article className="mp-dashboard-panel mp-low-stock-panel">
        <div className="mp-dashboard-panel-heading"><div><span className="mp-dashboard-section-kicker">STOCK WATCH</span><h2>Low stock</h2></div><span className="mp-dashboard-heading-icon warning"><TriangleAlert size={18} /></span></div>
        {lowStock.length ? <div className="mp-low-stock-list">{lowStock.slice(0, 5).map((product, index) => <div className="mp-low-stock-row" key={`${product._id}-${product.sizes?._id || index}`}>
          <span className="mp-low-stock-icon"><Boxes size={16} /></span>
          <div><strong>{product.name || 'Product'} · {product.sizes?.size || 'Variant'}</strong><small>{product.inventoryStrategy === 'shared' ? `${Number(product.retailPacks) || 0} packs available` : `${Number(product.retailPacks) || 0} packs · ${Number(product.wholesaleCartons) || 0} cartons`}</small></div>
          <span className="mp-low-stock-badge">Low</span>
        </div>)}</div> : <Status>All active variants are above their low-stock threshold.</Status>}
        <Link className="mp-dashboard-link" to="/admin/marketplace/inventory">Manage inventory <ArrowUpRight size={15} /></Link>
      </article>
    </section>
  </div>;
}
function Inventory() {
  const [page, setPage] = useState(1), [low, setLow] = useState(false), [editor, setEditor] = useState(null);
  const query = useMarketQuery('inventory', `/inventory?page=${page}&low=${low}`);
  return <><div className="mp-toolbar"><label><input type="checkbox" checked={low} onChange={e => { setLow(e.target.checked); setPage(1); }} /> Low stock only</label><button onClick={() => query.refetch()}>Refresh inventory</button></div><p className="mp-note">Shared inventory: packs and cartons show the same stock in different units. Do not add them together. Separate inventory keeps retail packs and wholesale cartons independent.</p>
    {!query.data ? <QueryState query={query} /> : <div className="mp-panel mp-table"><table><thead><tr>{['Product', 'Size / SKU', 'Strategy', 'Retail packs', 'Wholesale cartons', 'Pieces/pack', 'Packs/carton', 'Status', 'Action'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{query.data.items.map(p => <tr key={`${p._id}-${p.sizes._id}`}><td>{p.name}</td><td>{p.sizes.size}<br /><small>{p.sizes.sku}</small></td><td>{p.inventoryStrategy}</td><td>{p.retailPacks}</td><td>{p.wholesaleCartons}</td><td>{p.sizes.piecesPerPack}</td><td>{p.sizes.packsPerCarton}</td><td className={p.lowStock ? 'mp-low' : ''}>{p.lowStock ? 'Low stock' : 'In stock'} · {p.status}</td><td><button onClick={() => setEditor(p)}>Adjust stock</button></td></tr>)}</tbody></table>{!query.data.items.length && <Status>No inventory found.</Status>}</div>}<Pager page={page} setPage={setPage} data={query.data} />{editor && <StockEditor product={editor} close={() => setEditor(null)} />}
  </>;
}
function StockEditor({ product, close }) {
  const cache = useQueryClient(), key = useRef(crypto.randomUUID());
  const [field, setField] = useState(product.inventoryStrategy === 'shared' ? 'stockPacks' : 'retailStock');
  const [delta, setDelta] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [attempted, setAttempted] = useState(false);
  const save = async e => {
    e.preventDefault(); setBusy(true); setAttempted(true); setError('');
    try {
      await api.patch(`${marketApi}/inventory/${product._id}`, { variantId: product.sizes._id, field, delta: Number(delta), reason }, { headers: { 'Idempotency-Key': key.current } });
      await cache.invalidateQueries({ queryKey: ['marketplace-admin'] }); close();
    } catch (err) { setError(err.response?.data?.message || 'Connection interrupted. Retry to safely check this adjustment.'); if (err.response?.status < 500) setAttempted(false); } finally { setBusy(false); }
  };
  return <div className="mp-overlay"><section className="mp-editor" role="dialog" aria-modal="true" aria-label="Adjust inventory"><h2>{product.name} · {product.sizes.size}</h2><form onSubmit={save}><Field label="Stock unit"><select disabled={busy || attempted} value={field} onChange={e => setField(e.target.value)}>{product.inventoryStrategy === 'shared' ? <option value="stockPacks">Shared packs</option> : <><option value="retailStock">Retail packs</option><option value="wholesaleStock">Wholesale cartons</option></>}</select></Field><Field label="Adjustment (+ to add, − to remove)"><input disabled={busy || attempted} type="number" step="1" required value={delta} onChange={e => setDelta(e.target.value)} /></Field><Field label="Reason"><input disabled={busy || attempted} required value={reason} onChange={e => setReason(e.target.value)} /></Field>{error && <p role="alert" className="mp-error">{error}</p>}<footer><button type="button" disabled={busy} onClick={close}>Close</button><button disabled={busy || !Number(delta)}>{busy ? 'Saving…' : attempted ? 'Retry adjustment' : 'Save adjustment'}</button></footer></form></section></div>;
}
function Orders() {
  const [page, setPage] = useState(1), [type, setType] = useState(''), [status, setStatus] = useState(''), [selected, setSelected] = useState(null);
  const query = useMarketQuery('orders', `/orders?page=${page}&type=${type}&status=${status}`);
  return <><div className="mp-toolbar"><select aria-label="Order type" value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">All order types</option>{['retail', 'wholesale', 'mixed'].map(t => <option key={t}>{t}</option>)}</select><select aria-label="Order status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}</select><button onClick={() => query.refetch()}>Refresh orders</button></div>
    {!query.data ? <QueryState query={query} /> : <div className="mp-panel mp-table"><table><thead><tr>{['Order ID', 'Customer', 'Type', 'Items / quantity', 'Amount', 'Payment', 'Status', 'Date', 'Details'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{query.data.items.map(o => <tr key={o._id}><td>{o.orderId}</td><td>{o.businessInfo?.businessName || o.shippingAddress.fullName}</td><td>{o.orderType}</td><td>{o.items.map((i, n) => <div key={n}>{i.productName} · {i.size}<br /><small>{i.quantity} {i.purchaseMode === 'wholesale' ? 'cartons' : 'packs'} · {i.totalPacks} packs · {i.totalPieces} pieces</small></div>)}</td><td>{rupees(o.totalAmount)}</td><td>{o.paymentMethod === 'wallet' ? 'Wallet' : 'COD'} · {o.paymentStatus}</td><td>{o.orderStatus.replaceAll('_', ' ')}</td><td>{new Date(o.createdAt).toLocaleString('en-IN')}</td><td><button onClick={() => setSelected(o._id)}>View order</button></td></tr>)}</tbody></table>{!query.data.items.length && <Status>No orders match these filters.</Status>}</div>}<Pager page={page} setPage={setPage} data={query.data} />{selected && <OrderDetails id={selected} close={() => setSelected(null)} />}
  </>;
}
function OrderDetails({ id, close }) {
  const query = useMarketQuery('order', `/orders/${id}`), cache = useQueryClient();
  const [target, setTarget] = useState(''), [collected, setCollected] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const update = async () => {
    setBusy(true); setError('');
    try { await api.patch(`${marketApi}/orders/${id}/status`, { status: target, codCollected: collected }); await cache.invalidateQueries({ queryKey: ['marketplace-admin'] }); setTarget(''); }
    catch (err) { setError(err.response?.data?.message || err.message); } finally { setBusy(false); }
  };
  const o = query.data;
  const downloadQr = async () => {
    if (!o?.qrToken) return;
    try {
      const response = await fetch(qrImage(`myapp://order/${o.qrToken}`));
      const file = await response.blob();
      const url = URL.createObjectURL(file), link = document.createElement('a');
      link.href = url; link.download = `${o.orderId}-qr.png`; link.click(); URL.revokeObjectURL(url);
    } catch { setError('Unable to download the order QR code.'); }
  };
  return <div className="mp-overlay"><section className="mp-editor" role="dialog" aria-modal="true" aria-label="Order details"><header><h2>{o?.orderId || 'Order details'}</h2><button onClick={close}>Close</button></header>{!o ? <QueryState query={query} /> : <><p>{o.orderType} · {o.orderStatus.replaceAll('_', ' ')} · {o.paymentMethod === 'wallet' ? 'Wallet' : 'COD'} {o.paymentStatus}</p>{o.qrToken && <section className="mp-order-qr"><img src={qrImage(`myapp://order/${o.qrToken}`)} alt={`QR code for ${o.orderId}`} /><div><h3><QrCode size={17} /> Order QR code</h3><p>Scan this with the REPAMP app to view and update this order’s delivery status.</p><button onClick={downloadQr}><Download size={15} />Download QR</button></div></section>}<h3>Delivery</h3><p>{Object.values(o.shippingAddress).join(', ')}</p>{o.businessInfo?.businessName && <><h3>Business</h3><p>{Object.entries(o.businessInfo).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p></>}
    {o.items.map((i, n) => <div className="mp-list-row" key={n}><strong>{i.productName} · {i.size}</strong><span>{i.purchaseMode} · {i.quantity} {i.purchaseMode === 'wholesale' ? 'cartons' : 'packs'}<br />{i.totalPacks} packs · {i.totalPieces} pieces</span><span>{rupees(i.unitPrice)} each · {rupees(i.subtotal)}</span></div>)}
    <div className="mp-fields">{[['Subtotal', o.subtotal], ['Discount', o.discount], ['Delivery', o.deliveryCharge], ['Tax', o.tax], ['Grand total', o.totalAmount]].map(([l, v]) => <p key={l}>{l}: <strong>{rupees(v)}</strong></p>)}</div><h3>Status history</h3>{o.statusHistory.map((h, n) => <p key={n}>{h.status.replaceAll('_', ' ')} · {new Date(h.at).toLocaleString()}</p>)}
    {!!nextStatus[o.orderStatus]?.length && <><Field label="Update status"><select value={target} onChange={e => { setTarget(e.target.value); setCollected(false); }}><option value="">Select next status</option>{nextStatus[o.orderStatus].map(t => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}</select></Field>{target === 'cancelled' && <p>Saving will cancel this order and restore its reserved inventory.</p>}{target === 'delivered' && o.paymentMethod === 'cod' && <label><input type="checkbox" checked={collected} onChange={e => setCollected(e.target.checked)} /> I confirm the full COD payment has been collected.</label>}<footer><button disabled={busy || !target || (target === 'delivered' && !collected)} onClick={update}>{busy ? 'Updating…' : 'Save status'}</button></footer></>}{error && <p role="alert" className="mp-error">{error}</p>}
    </>}</section></div>;
}
