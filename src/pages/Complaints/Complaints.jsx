import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareWarning, RefreshCw, Search, Send, UserRound } from 'lucide-react';
import api from '../../api/axiosInstance';
import { queryKeys } from '../../api/queryKeys';
import './Complaints.css';

const FILTERS = ['all', 'submitted', 'in_review', 'resolved'];
const statusLabel = (status = '') => status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const idOf = (item) => item?.id || item?._id || '';

export default function Complaints() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [responses, setResponses] = useState({});
  const complaintsQuery = useQuery({
    queryKey: [...queryKeys.complaints, status],
    queryFn: async () => (await api.get('/v1/complaints/admin', { params: { status, limit: 50 } })).data?.data,
  });
  const updateComplaint = useMutation({
    mutationFn: ({ id, ...updates }) => api.patch(`/v1/complaints/${encodeURIComponent(id)}`, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.complaints }),
  });
  const items = complaintsQuery.data?.items || [];
  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => [item.subject, item.description, item.category, item.customerId?.name, item.customerId?.email, item.customerId?.phonenumber].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [items, search]);

  return <section className="complaints-page">
    <header className="complaints-page-header">
      <div><span>Customer support</span><h1>Complaints</h1><p>Review customer concerns and keep track of the team’s responses.</p></div>
      <button className="complaints-refresh" onClick={() => complaintsQuery.refetch()} disabled={complaintsQuery.isFetching}><RefreshCw size={16} className={complaintsQuery.isFetching ? 'complaints-spin' : ''} />Refresh</button>
    </header>
    <div className="complaints-toolbar">
      <div className="complaints-filters">{FILTERS.map((item) => <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item === 'all' ? 'All complaints' : statusLabel(item)}</button>)}</div>
      <label className="complaints-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search complaints" /></label>
    </div>
    {complaintsQuery.error && <div className="complaints-error">{complaintsQuery.error?.response?.data?.message || 'Could not load complaints.'}<button onClick={() => complaintsQuery.refetch()}>Try again</button></div>}
    {complaintsQuery.isLoading ? <div className="complaints-loading"><RefreshCw className="complaints-spin" />Loading complaints…</div> : visibleItems.length ? <div className="complaints-list">{visibleItems.map((item) => {
      const id = idOf(item);
      return <article className="complaint-admin-card" key={id}>
        <div className="complaint-admin-top"><div className="complaint-category-label">{item.category}</div><span className={`complaint-status ${item.status}`}>{statusLabel(item.status)}</span></div>
        <h2>{item.subject}</h2>
        <p className="complaint-description">{item.description}</p>
        <div className="complaint-customer"><UserRound size={15} /><strong>{item.customerId?.name || 'Customer'}</strong><span>{item.customerId?.email || item.customerId?.phonenumber || item.customerId?.userId || ''}</span><time>{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
        <div className="complaint-admin-actions">
          <label>Status<select value={item.status} onChange={(event) => updateComplaint.mutate({ id, status: event.target.value })} disabled={updateComplaint.isPending}><option value="submitted">Submitted</option><option value="in_review">In review</option><option value="resolved">Resolved</option></select></label>
          <label className="complaint-response-field">Reply to customer<textarea value={responses[id] ?? item.adminResponse ?? ''} onChange={(event) => setResponses((current) => ({ ...current, [id]: event.target.value }))} placeholder="Write an update or resolution" maxLength={3000} /></label>
          <button className="complaint-send" onClick={() => updateComplaint.mutate({ id, adminResponse: responses[id] ?? item.adminResponse ?? '' })} disabled={updateComplaint.isPending || !(responses[id] ?? item.adminResponse ?? '').trim()}><Send size={15} />Save reply</button>
        </div>
      </article>;
    })}</div> : <div className="complaints-empty"><MessageSquareWarning size={27} /><strong>No complaints found</strong><span>{search ? 'Try a different search.' : 'New customer complaints will appear here.'}</span></div>}
  </section>;
}
