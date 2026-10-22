import { useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axiosInstance';
import './SidebarAccessManagement.css';

function RoleEditor({ role, sections }) {
  const [selected, setSelected] = useState(role.sections);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const client = useQueryClient();
  const dirty = selected.length !== role.sections.length || selected.some(id => !role.sections.includes(id));
  async function save() {
    setSaving(true); setError(''); setMessage('');
    try {
      await api.put(`/v1/sidebar-access/${role.id}`, { sections: selected });
      client.setQueryData(['sidebar-settings'], current => ({ ...current, roles: current.roles.map(r => r.id === role.id ? { ...r, sections: selected } : r) }));
      await client.invalidateQueries({ queryKey: ['sidebar-access'] });
      setMessage(`${role.label} sidebar saved.`);
    } catch (err) { setError(err.response?.data?.message || 'Unable to save. Your selections are kept; please retry.'); }
    finally { setSaving(false); }
  }
  return <section className="sa-role"><h2>{role.label}</h2><p>{selected.length} sections selected</p>
    <fieldset disabled={saving}><legend className="sa-sr-only">Visible sections for {role.label}</legend>
      {sections.map(section => <label key={section.id}><input type="checkbox" checked={selected.includes(section.id)} onChange={event => { setMessage(''); setSelected(current => event.target.checked ? [...current, section.id] : current.filter(id => id !== section.id)); }}/>{section.label}</label>)}
    </fieldset>
    {!selected.length && <p className="sa-note">Only My account and sign out will remain available.</p>}
    <div className="sa-actions"><button disabled={saving || !dirty} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button><button disabled={saving || !dirty} onClick={() => { setSelected(role.sections); setError(''); setMessage(''); }}>Discard</button></div>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
export default function SidebarAccessManagement() {
  const { appUser } = useContext(AuthContext);
  const isSuperadmin = ['ROL_1', 'SuperAdmin'].includes(appUser?.role);
  const query = useQuery({ queryKey: ['sidebar-settings'], enabled: isSuperadmin, queryFn: async ({ signal }) => (await api.get('/v1/sidebar-access', { signal })).data.data, refetchOnWindowFocus: false });
  if (!isSuperadmin) return <p role="alert">Only the superadmin can manage sidebar access.</p>;
  return <section className="sa-page"><h1>Sidebar Access</h1><p>Choose the web sidebar sections shown to each staff role. Save each role separately. Changes reach signed-in users within 30 seconds or when they return to the window.</p><p className="sa-note">These settings control navigation and page visibility. Existing data and action permissions still apply. Superadmin access stays enabled.</p>
    {query.isPending && <p role="status">Loading settings…</p>}
    {query.isError && <div role="alert"><p>Unable to load settings. The updated backend must be running to manage sidebar access.</p><button onClick={() => query.refetch()}>Retry</button></div>}
    {query.data && <div className="sa-grid">{query.data.roles.map(role => <RoleEditor key={role.id} role={role} sections={query.data.sections}/>)}</div>}
  </section>;
}
