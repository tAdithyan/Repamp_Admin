import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock3,
  Inbox,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import api from '../../api/axiosInstance';
import { queryKeys } from '../../api/queryKeys';
import './Complaints.css';

const FILTERS = [
  { key: 'all', label: 'All complaints', icon: Inbox, tone: 'all' },
  { key: 'submitted', label: 'Submitted', icon: MessageSquareWarning, tone: 'submitted' },
  { key: 'in_review', label: 'In review', icon: Clock3, tone: 'in_review' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, tone: 'resolved' },
];

const statusLabel = (status = '') =>
  status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const idOf = (item) => item?.id || item?._id || '';
const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'C';
const fetchComplaints = async (status) =>
  (await api.get('/v1/complaints/admin', { params: { status, limit: 50 } })).data?.data;

export default function Complaints() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [responses, setResponses] = useState({});

  const complaintsQuery = useQuery({
    queryKey: [...queryKeys.complaints, status],
    queryFn: () => fetchComplaints(status),
  });
  // Always keep the "all" list so the summary tiles show real counts.
  const allQuery = useQuery({
    queryKey: [...queryKeys.complaints, 'all'],
    queryFn: () => fetchComplaints('all'),
  });

  const updateComplaint = useMutation({
    mutationFn: ({ id, ...updates }) =>
      api.patch(`/v1/complaints/${encodeURIComponent(id)}`, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.complaints }),
  });

  const items = complaintsQuery.data?.items || [];
  const counts = useMemo(() => {
    const all = allQuery.data?.items || [];
    return {
      all: allQuery.data?.total ?? all.length,
      submitted: all.filter((item) => item.status === 'submitted').length,
      in_review: all.filter((item) => item.status === 'in_review').length,
      resolved: all.filter((item) => item.status === 'resolved').length,
    };
  }, [allQuery.data]);

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [
        item.subject,
        item.description,
        item.category,
        item.customerId?.name,
        item.customerId?.email,
        item.customerId?.phonenumber,
      ].some((value) => String(value || '').toLowerCase().includes(needle)),
    );
  }, [items, search]);

  return (
    <section className="complaints-page">
      <header className="complaints-page-header">
        <div>
          <span>Customer support</span>
          <h1>Complaints</h1>
          <p>Review customer concerns and keep track of the team’s responses.</p>
        </div>
        <button
          className="complaints-refresh"
          onClick={() => {
            complaintsQuery.refetch();
            allQuery.refetch();
          }}
          disabled={complaintsQuery.isFetching}
        >
          <RefreshCw size={16} className={complaintsQuery.isFetching ? 'complaints-spin' : ''} />
          Refresh
        </button>
      </header>

      <div className="complaints-stats">
        {FILTERS.map(({ key, label, icon: Icon, tone }) => (
          <button
            type="button"
            key={key}
            className={`complaints-stat ${tone} ${status === key ? 'active' : ''}`}
            aria-pressed={status === key}
            onClick={() => setStatus(key)}
          >
            <span className="complaints-stat-icon">
              <Icon />
            </span>
            <span className="complaints-stat-copy">
              <strong>{counts[key] ?? 0}</strong>
              <small>{label}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="complaints-toolbar">
        <p>
          Showing <strong>{visibleItems.length}</strong>{' '}
          {status === 'all' ? 'complaints' : statusLabel(status).toLowerCase()}
        </p>
        <label className="complaints-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search complaints"
          />
        </label>
      </div>

      {complaintsQuery.error && (
        <div className="complaints-error">
          {complaintsQuery.error?.response?.data?.message || 'Could not load complaints.'}
          <button onClick={() => complaintsQuery.refetch()}>Try again</button>
        </div>
      )}

      {complaintsQuery.isLoading ? (
        <div className="complaints-loading">
          <RefreshCw className="complaints-spin" />
          Loading complaints…
        </div>
      ) : visibleItems.length ? (
        <div className="complaints-list">
          {visibleItems.map((item) => {
            const id = idOf(item);
            const name = item.customerId?.name || 'Customer';
            const contact =
              item.customerId?.email || item.customerId?.phonenumber || item.customerId?.userId || '';
            const reply = responses[id] ?? item.adminResponse ?? '';
            return (
              <article className={`complaint-card ${item.status}`} key={id}>
                <div className="complaint-main">
                  <div className="complaint-top">
                    <span className="complaint-category">{item.category}</span>
                    <span className={`complaint-status ${item.status}`}>
                      <i />
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <h2>{item.subject}</h2>
                  <p className="complaint-description">{item.description}</p>
                  <div className="complaint-customer">
                    <span className="complaint-avatar">{initials(name)}</span>
                    <div className="complaint-customer-info">
                      <strong>{name}</strong>
                      {contact && <small>{contact}</small>}
                    </div>
                    <time>
                      <Clock3 size={13} />
                      {new Date(item.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </div>
                </div>

                <div className="complaint-reply">
                  <div className="complaint-reply-head">
                    <strong>Team response</strong>
                    {item.adminResponse && <em>Replied</em>}
                  </div>
                  <label>
                    Status
                    <select
                      value={item.status}
                      onChange={(event) => updateComplaint.mutate({ id, status: event.target.value })}
                      disabled={updateComplaint.isPending}
                    >
                      <option value="submitted">Submitted</option>
                      <option value="in_review">In review</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </label>
                  <label className="complaint-response-field">
                    Reply to customer
                    <textarea
                      value={reply}
                      onChange={(event) =>
                        setResponses((current) => ({ ...current, [id]: event.target.value }))
                      }
                      placeholder="Write an update or resolution"
                      maxLength={3000}
                    />
                  </label>
                  <button
                    className="complaint-send"
                    onClick={() => updateComplaint.mutate({ id, adminResponse: reply })}
                    disabled={updateComplaint.isPending || !reply.trim()}
                  >
                    <Send size={15} />
                    Save reply
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="complaints-empty">
          <MessageSquareWarning size={27} />
          <strong>No complaints found</strong>
          <span>{search ? 'Try a different search.' : 'New customer complaints will appear here.'}</span>
        </div>
      )}
    </section>
  );
}