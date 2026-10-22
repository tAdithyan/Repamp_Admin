import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CalendarClock, CalendarDays, Download, Eye, MapPin, MoreVertical, RefreshCw, Search, Truck, UserRoundCheck, X } from 'lucide-react';
import api from '../../api/axiosInstance';
import { queryKeys } from '../../api/queryKeys';
import { useUsers } from '../../hooks/useApiQueries';
import './PickupManagement.css';
import './PickupDetails.css';

const STATUS_OPTIONS = ['all', 'scheduled', 'assigned', 'in_progress', 'completed', 'cancelled', 'failed'];
const CANCELLABLE_STATUSES = ['scheduled', 'assigned', 'on_the_way', 'in_progress'];

const getId = (item) => item?.id || item?._id || '';
const labelStatus = (status = '') => status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const localBodyTypeLabel = (value) => ({
  panjayath: 'Panchayat',
  panchayat: 'Panchayat',
  municipalaty: 'Municipality',
  municipality: 'Municipality',
  corporation: 'Corporation',
}[value] || (value ? labelStatus(value) : 'Not provided'));

const formatDate = (value) => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PickupManagement = () => {
  const queryClient = useQueryClient();
  const agentsQuery = useUsers({ role: 'ROL_4' });
  const coordinatorsQuery = useUsers({ role: 'ROL_3' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [preferredDate, setPreferredDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [notice, setNotice] = useState('');
  const [detailPickup, setDetailPickup] = useState(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [openActionsPickupId, setOpenActionsPickupId] = useState('');
  const pageSize = 10;
  const pickupsQuery = useQuery({
    queryKey: [...queryKeys.pickups, { page, limit: pageSize, search: search.trim(), status, preferredDate }],
    queryFn: async () => {
      const response = await api.get('/v1/pickups', { params: { page, limit: pageSize, search: search.trim(), status, preferredDate } });
      return response.data?.data ?? response.data;
    },
  });
  const pickups = pickupsQuery.data?.items || [];
  const totalFilteredPickups = pickupsQuery.data?.total || 0;
  const pageCount = pickupsQuery.data?.totalPages || 1;
  const agents = [
    ...(agentsQuery.data || []).map(agent => ({ ...agent, assignmentRole: 'Collection Agent' })),
    ...(coordinatorsQuery.data || []).map(agent => ({ ...agent, assignmentRole: 'Coordinator' })),
  ];
  const loading = pickupsQuery.isLoading || agentsQuery.isLoading || coordinatorsQuery.isLoading;

  const loadData = () => Promise.all([pickupsQuery.refetch(), agentsQuery.refetch(), coordinatorsQuery.refetch()]);
  const queryError = pickupsQuery.error || agentsQuery.error || coordinatorsQuery.error;
  const displayError = error || queryError?.response?.data?.message || (queryError ? 'Unable to load pickups and agents.' : '');

  const visiblePickups = pickups;
  useEffect(() => setPage((current) => Math.min(current, pageCount)), [pageCount]);
  useEffect(() => {
    if (!openActionsPickupId) return undefined;
    const handlePointerDown = (event) => {
      if (!event.target.closest?.('.pickup-card__actions')) setOpenActionsPickupId('');
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenActionsPickupId('');
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openActionsPickupId]);

  const openAssignment = (pickup) => {
    setSelectedPickup(pickup);
    setSelectedAgentId(getId(pickup.operatorId));
    setNotice('');
  };

  const closeAssignment = () => {
    if (assigning) return;
    setSelectedPickup(null);
    setSelectedAgentId('');
  };

  const assignPickup = async () => {
    const pickupId = getId(selectedPickup);
    if (!pickupId || !selectedAgentId) return;
    setAssigning(true);
    setError('');
    try {
      await api.put(`/v1/pickups/${pickupId}`, {
        operatorId: selectedAgentId,
        status: 'assigned',
      });
      const agent = agents.find((item) => getId(item) === selectedAgentId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.pickups });
      setNotice(`${selectedPickup.pickupId || 'Pickup'} assigned to ${agent?.name || 'agent'}.`);
      setSelectedPickup(null);
      setSelectedAgentId('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to assign this pickup.');
    } finally {
      setAssigning(false);
    }
  };

  const openCancel = (pickup) => {
    setDetailPickup(null);
    setCancelTarget(pickup);
    setCancellationReason('');
    setCancelError('');
    setError('');
  };

  const cancelPickup = async () => {
    const pickupId = getId(cancelTarget);
    if (!pickupId || cancelling) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.patch(`/v1/pickups/${pickupId}/cancel`, {
        cancellationReason: cancellationReason.trim() || 'Cancelled by administrator',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pickups }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
      setNotice(`${cancelTarget.pickupId || 'Pickup'} cancelled successfully.`);
      setCancelTarget(null);
      setCancellationReason('');
    } catch (requestError) {
      setCancelError(requestError.response?.data?.message || 'Unable to cancel this pickup. Please refresh and try again.');
    } finally {
      setCancelling(false);
    }
  };

  const downloadReceipt = async (pickup) => {
    setReceiptBusy(true);
    setReceiptError('');
    const receiptWindow = window.open('', '_blank', 'width=900,height=760');
    if (!receiptWindow) {
      setReceiptError('Allow pop-ups for this site to open and save the receipt.');
      setReceiptBusy(false);
      return;
    }
    try {
      const pickupId = getId(pickup);
      const { data } = await api.post(`/v1/pickups/${pickupId}/receipt-link`);
      const receiptUrl = new URL(data.data.downloadUrl, window.location.origin);
      receiptUrl.pathname = receiptUrl.pathname.replace(/\.pdf$/, '.html');
      receiptWindow.location.replace(receiptUrl.toString());
    } catch (requestError) {
      receiptWindow.close();
      setReceiptError(requestError.response?.data?.message || 'Unable to prepare the pickup receipt. Please try again.');
    } finally {
      setReceiptBusy(false);
    }
  };

  return (
    <section className="pickup-page">
      <div className="pickup-page__header">
        <div>
          <span className="pickup-page__eyebrow">Collection operations</span>
          <h1>Pickup management</h1>
          <p>Review requests and assign scheduled pickups to collection agents or coordinators.</p>
        </div>
        <button className="pickup-page__refresh" onClick={loadData} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {notice && <div className="pickup-alert pickup-alert--success">{notice}</div>}
      {displayError && <div className="pickup-alert pickup-alert--error">{displayError}</div>}

      <div className="pickup-toolbar">
        <label className="pickup-search">
          <Search size={18} />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search pickup, waste type or customer" />
        </label>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter pickups by status">
          {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item === 'all' ? 'All statuses' : labelStatus(item)}</option>)}
        </select>
        <label className="pickup-date-filter">
          <CalendarDays size={17} aria-hidden="true" />
          <span className="sr-only">Filter pickups by preferred date</span>
          <input type="date" value={preferredDate} onChange={(event) => { setPreferredDate(event.target.value); setPage(1); }} aria-label="Filter pickups by preferred date" />
        </label>
        {preferredDate && <button className="pickup-date-clear" type="button" onClick={() => { setPreferredDate(''); setPage(1); }} aria-label="Clear preferred date filter"><X size={16} /> Clear date</button>}
      </div>

      <div className="pickup-summary">
        <div><strong>{pickupsQuery.data?.counts?.total ?? '—'}</strong><span>Total pickups</span></div>
        <div><strong>{pickupsQuery.data?.counts?.scheduled ?? '—'}</strong><span>Waiting assignment</span></div>
        <div><strong>{pickupsQuery.data?.counts?.assigned ?? '—'}</strong><span>Assigned</span></div>
        <div><strong>{agents.length}</strong><span>Collection agents & coordinators</span></div>
      </div>

      <div className="pickup-list">
        {loading ? (
          <div className="pickup-empty"><RefreshCw size={28} className="spin" /><h3>Loading pickups</h3></div>
        ) : totalFilteredPickups === 0 ? (
          <div className="pickup-empty"><Truck size={34} /><h3>No pickups found</h3><p>Try changing the search, status, or preferred date filter.</p></div>
        ) : visiblePickups.map((pickup) => {
          const customer = typeof pickup.customerId === 'object' ? pickup.customerId : null;
          const operator = typeof pickup.operatorId === 'object' ? pickup.operatorId : null;
          const coordinates = pickup.pickupLocation?.coordinates;
          return (
            <article className="pickup-card" key={getId(pickup)}>
              <div className="pickup-card__main">
                <div className="pickup-card__icon"><Truck size={22} /></div>
                <div>
                  <div className="pickup-card__title-row">
                    <h3>{pickup.pickupId || 'Pickup request'}</h3>
                    <span className={`pickup-status pickup-status--${pickup.status}`}>{labelStatus(pickup.status)}</span>
                    <span className={`pickup-kind ${pickup.recurringContractId ? 'recurring' : 'one-time'}`}>
                      {pickup.recurringContractId ? <CalendarClock size={12} /> : <CalendarDays size={12} />}
                      {pickup.recurringContractId ? 'Recurring' : 'One-time'}
                    </span>
                  </div>
                  <p className="pickup-card__waste">{pickup.wasteType || 'Waste type unavailable'}</p>
                  <div className="pickup-card__details">
                    <span><CalendarDays size={15} />{formatDate(pickup.preferredDate || pickup.createdAt)}</span>
                    <span><MapPin size={15} />{coordinates?.length === 2 ? `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}` : 'Location unavailable'}</span>
                  </div>
                </div>
              </div>
              <div className="pickup-card__person">
                <small>Customer</small>
                <strong>{customer?.name || 'Customer unavailable'}</strong>
                <span>{customer?.phonenumber || ''}</span>
              </div>
              <div className="pickup-card__person">
                <small>Assigned agent</small>
                <strong>{operator?.name || 'Not assigned'}</strong>
                <span>{operator?.phonenumber || ''}</span>
              </div>
              <div className="pickup-card__actions">
                <button
                  type="button"
                  className="pickup-card__menu-trigger"
                  aria-label={`Actions for ${pickup.pickupId || 'pickup'}`}
                  aria-haspopup="menu"
                  aria-expanded={openActionsPickupId === getId(pickup)}
                  onClick={() => setOpenActionsPickupId((current) => current === getId(pickup) ? '' : getId(pickup))}
                ><MoreVertical size={19} /></button>
                {openActionsPickupId === getId(pickup) && <div className="pickup-card__menu" role="menu">
                  <button type="button" role="menuitem" className="pickup-card__menu-item" onClick={() => { setReceiptError(''); setDetailPickup(pickup); setOpenActionsPickupId(''); }}><Eye size={16} />View details</button>
                  {pickup.status !== 'expired' && <button type="button" role="menuitem" className="pickup-card__menu-item" onClick={() => { openAssignment(pickup); setOpenActionsPickupId(''); }} disabled={['completed', 'cancelled'].includes(pickup.status)}>
                    <UserRoundCheck size={16} />{operator ? 'Reassign agent' : 'Assign agent'}
                  </button>}
                  {CANCELLABLE_STATUSES.includes(pickup.status) && <button type="button" role="menuitem" className="pickup-card__menu-item pickup-card__menu-item--danger" onClick={() => { openCancel(pickup); setOpenActionsPickupId(''); }}><Ban size={16} />Cancel pickup</button>}
                </div>}
              </div>
            </article>
          );
        })}
      </div>

      {!loading && totalFilteredPickups > 0 && (
        <div className="pickup-pagination" aria-label="Pickup pages">
          <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalFilteredPickups)} of {totalFilteredPickups}</span>
          <div>
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
            <span>Page {page} of {pageCount}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Next</button>
          </div>
        </div>
      )}

      {selectedPickup && (
        <div className="assignment-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeAssignment()}>
          <div className="assignment-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-title">
            <button className="assignment-modal__close" onClick={closeAssignment} aria-label="Close"><X size={20} /></button>
            <div className="assignment-modal__icon"><UserRoundCheck size={25} /></div>
            <h2 id="assignment-title">Assign agent or coordinator</h2>
            <p>Select a collection agent or coordinator for <strong>{selectedPickup.pickupId || 'this pickup'}</strong>.</p>
            <label>
              Collection agent or coordinator
              <select value={selectedAgentId} onChange={(event) => setSelectedAgentId(event.target.value)}>
                <option value="">Select an agent or coordinator</option>
                {['Collection Agent', 'Coordinator'].map(role => <optgroup key={role} label={role === 'Coordinator' ? 'Coordinators' : 'Collection agents'}>
                  {agents.filter(agent => agent.assignmentRole === role).map(agent => <option key={getId(agent)} value={getId(agent)}>{agent.name} — {role} {agent.phonenumber ? `— ${agent.phonenumber}` : ''}</option>)}
                </optgroup>)}
              </select>
            </label>
            {(agentsQuery.isError || coordinatorsQuery.isError) && <div role="alert" className="assignment-modal__empty">Some assignment options could not be loaded. Close this window and click Refresh to retry.</div>}
            {agents.length === 0 && <div className="assignment-modal__empty">No collection agents or coordinators were found.</div>}
            <div className="assignment-modal__actions">
              <button className="assignment-modal__cancel" onClick={closeAssignment}>Cancel</button>
              <button className="assignment-modal__submit" onClick={assignPickup} disabled={!selectedAgentId || assigning}>{assigning ? 'Assigning…' : 'Assign pickup'}</button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="assignment-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !cancelling && setCancelTarget(null)}>
          <div className="assignment-modal pickup-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="pickup-cancel-title">
            <button className="assignment-modal__close" onClick={() => !cancelling && setCancelTarget(null)} aria-label="Close cancellation dialog" disabled={cancelling}><X size={20} /></button>
            <div className="assignment-modal__icon"><Ban size={24} /></div>
            <h2 id="pickup-cancel-title">Cancel pickup?</h2>
            <p>This will cancel <strong>{cancelTarget.pickupId || 'this pickup'}</strong> and notify the customer{cancelTarget.operatorId ? ' and assigned agent' : ''}.</p>
            <label>
              Cancellation reason <span>(optional)</span>
              <textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} maxLength={500} rows={3} placeholder="Add a brief reason for the cancellation" disabled={cancelling} />
            </label>
            {cancelError && <div role="alert" className="pickup-alert pickup-alert--error pickup-cancel-error">{cancelError}</div>}
            <div className="assignment-modal__actions">
              <button className="assignment-modal__cancel" onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep pickup</button>
              <button className="assignment-modal__submit" onClick={cancelPickup} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Confirm cancellation'}</button>
            </div>
          </div>
        </div>
      )}

      {detailPickup && (() => {
        const customer = typeof detailPickup.customerId === 'object' ? detailPickup.customerId : null;
        const operator = typeof detailPickup.operatorId === 'object' ? detailPickup.operatorId : null;
        const contract = typeof detailPickup.recurringContractId === 'object' ? detailPickup.recurringContractId : null;
        const coordinates = detailPickup.pickupLocation?.coordinates;
        return (
          <div className="pickup-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDetailPickup(null)}>
            <div className="pickup-detail-modal" role="dialog" aria-modal="true" aria-labelledby="pickup-detail-title">
              <button className="pickup-detail-close" onClick={() => setDetailPickup(null)} aria-label="Close pickup details"><X size={21} /></button>
              <div className="pickup-detail-heading">
                <div className="pickup-card__icon"><Truck size={23} /></div>
                <div><small>Pickup details</small><h2 id="pickup-detail-title">{detailPickup.pickupId || 'Pickup request'}</h2></div>
                <span className={`pickup-kind ${detailPickup.recurringContractId ? 'recurring' : 'one-time'}`}>{detailPickup.recurringContractId ? 'Recurring pickup' : 'One-time pickup'}</span>
              </div>
              {detailPickup.status === 'completed' && <div className="pickup-receipt-actions"><button type="button" onClick={() => downloadReceipt(detailPickup)} disabled={receiptBusy}><Download size={16}/>{receiptBusy ? 'Preparing receipt…' : 'Print / save digital receipt'}</button>{receiptError && <p role="alert">{receiptError}</p>}</div>}
              <div className="pickup-detail-grid">
                <Detail label="Status" value={labelStatus(detailPickup.status)} />
                <Detail label="Waste type" value={detailPickup.wasteType} />
                <Detail label="Preferred date" value={formatDate(detailPickup.preferredDate)} />
                <Detail label="Created" value={detailPickup.createdAt ? new Date(detailPickup.createdAt).toLocaleString('en-IN') : 'Unavailable'} />
                <Detail label="Assigned agent" value={operator?.name || 'Not assigned'} subvalue={operator?.phonenumber} />
                <Detail label="Weight" value={`${Number(detailPickup.weight || 0).toFixed(2)} kg`} />
                <Detail label="Amount" value={`₹${Number(detailPickup.amount || 0).toFixed(2)} (incl. 18% GST)`} />
                <Detail label="Rate per kg" value={detailPickup.ratePerKg != null ? `₹${Number(detailPickup.ratePerKg).toFixed(2)} + 18% GST` : 'Standard category rate + 18% GST'} />
                <Detail label="Weighing method" value={labelStatus(detailPickup.weighingMethod || 'manual')} />
                <Detail label="Coordinates" value={coordinates?.length === 2 ? `${coordinates[1]}, ${coordinates[0]}` : 'Unavailable'} />
                <Detail label="Cancellation reason" value={detailPickup.cancellationReason || '—'} />
              </div>
              <section className="pickup-customer-details" aria-labelledby="pickup-customer-title">
                <h3 id="pickup-customer-title">Customer details</h3>
                <p>Contact information and address from the customer’s profile.</p>
                <div className="pickup-detail-grid">
                  <Detail label="Customer name" value={customer?.name || 'Not provided'} />
                  <Detail label="Phone number" value={customer?.phonenumber || 'Not provided'} />
                  <Detail label="WhatsApp number" value={customer?.whatsappnumber || 'Not provided'} />
                  <Detail label="Email address" value={customer?.email || 'Not provided'} />
                  <Detail label="Local body type" value={localBodyTypeLabel(customer?.localbodytype)} />
                  <Detail label="Panchayat / Municipality / Corporation" value={customer?.localbody || 'Not provided'} />
                  <Detail label="Ward number" value={customer?.wardNo || 'Not provided'} />
                  <Detail label="House / Building number" value={customer?.houseNo || 'Not provided'} />
                  <Detail label="PIN code" value={customer?.pincode || 'Not provided'} />
                </div>
                <div className="pickup-detail-notes pickup-customer-address"><small>Customer address</small><p>{customer?.address || 'Not provided'}</p></div>
              </section>
              {contract && <div className="pickup-contract-detail"><CalendarClock size={20} /><div><small>RECURRING CONTRACT</small><strong>{contract.name}</strong><span>{contract.preferredTime} · ₹{Number(contract.ratePerKg).toFixed(2)}/kg + 18% GST · {(contract.collectionDays || []).map((day) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day]).join(', ')}</span></div></div>}
              <div className="pickup-detail-notes"><small>NOTES</small><p>{detailPickup.notes || 'No notes were added.'}</p></div>
              {coordinates?.length === 2 && <a className="pickup-map-link" href={`https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`} target="_blank" rel="noreferrer"><MapPin size={16} />Open pickup location in map</a>}
            </div>
          </div>
        );
      })()}
    </section>
  );
};

const Detail = ({ label, value, subvalue }) => <div className="pickup-detail-item"><small>{label}</small><strong>{value || 'Unavailable'}</strong>{subvalue && <span>{subvalue}</span>}</div>;

export default PickupManagement;
