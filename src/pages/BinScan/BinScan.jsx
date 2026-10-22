import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MapPin, RefreshCw, Trash2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../../api/axiosInstance';
import './BinScan.css';
import logo from '../../assets/logo.jpeg';

const STATUSES = ['available', 'full', 'collection_scheduled', 'maintenance', 'inactive'];
const readable = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
export default function BinScan() {
  const { token } = useParams(); const [bin, setBin] = useState(null), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await api.get(`/v1/bins/scan/${token}`); setBin(response.data.data); } catch (requestError) { setError(requestError.response?.data?.message || 'This bin QR code is invalid.'); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const updateStatus = async (status) => { setSaving(true); setError(''); setSuccess(''); try { const response = await api.patch(`/v1/bins/scan/${token}/status`, { status }); setBin(response.data.data); setSuccess(`Bin status changed to ${readable(status)}.`); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to update bin status.'); } finally { setSaving(false); } };
  return <main className="scan-page"><div className="scan-brand"><img src={logo} alt="REPAMP" /><strong>REPAMP</strong></div>{loading ? <div className="scan-card scan-state"><RefreshCw className="scan-spin" />Reading bin QR…</div> : error && !bin ? <div className="scan-card scan-state"><Trash2 /><h2>Bin not found</h2><p>{error}</p></div> : bin && <section className="scan-card"><div className="scan-id">{bin.binId}</div><h1>{bin.name}</h1><div className={`scan-status scan-status--${bin.status}`}>{readable(bin.status)}</div><div className="scan-details"><p><MapPin />{bin.location}</p></div>{success && <div className="scan-success"><CheckCircle2 />{success}</div>}{error && <div className="scan-error">{error}</div>}<h3>Update bin status</h3><div className="scan-options">{STATUSES.map((status) => <button key={status} className={bin.status === status ? 'active' : ''} onClick={() => updateStatus(status)} disabled={saving}><span className={`scan-option-dot scan-option-dot--${status}`} />{readable(status)}{bin.status === status && <CheckCircle2 />}</button>)}</div><small className="scan-note">This permanent QR code remains assigned to {bin.binId}. Only its live status changes.</small></section>}</main>;
}
