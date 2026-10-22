import { useContext, useState } from 'react';
import { BadgeCheck, Building2, Mail, MapPin, Phone, Save, ShieldCheck, UserRound } from 'lucide-react';
import api from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import './Account.css';

const ROLE_LABELS = { ROL_1: 'Super Administrator', ROL_2: 'Administrator', ROL_3: 'Coordinator', ROL_4: 'Collection Agent', ROL_5: 'Customer', ROL_6: 'Client Administrator', CLIENT_ADMIN: 'Client Administrator' };
const initials = (name = 'User') => name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export default function Account() {
  const { appUser, updateAppUser } = useContext(AuthContext);
  const [form, setForm] = useState({ name: appUser?.name || '', email: appUser?.email || '', whatsappnumber: appUser?.whatsappnumber || '', address: appUser?.address || '', houseNo: appUser?.houseNo || '', wardNo: appUser?.wardNo || '', pincode: appUser?.pincode || '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Name is required.');
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await api.patch('/v1/users/me', form);
      updateAppUser(response.data.data);
      setMessage('Your account details were updated.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to update your account.'); }
    finally { setSaving(false); }
  };
  return <section className="account-page">
    <header><span>Account management</span><h1>My account</h1><p>Manage your personal and contact information.</p></header>
    {message && <div className="account-notice success"><BadgeCheck size={17} />{message}</div>}{error && <div className="account-notice error">{error}</div>}
    <div className="account-layout">
      <aside className="profile-card"><div className="profile-avatar">{initials(appUser?.name)}</div><h2>{appUser?.name}</h2><p>{appUser?.email || appUser?.phonenumber}</p><span><ShieldCheck size={15} />{ROLE_LABELS[appUser?.role] || appUser?.role}</span><dl><div><dt>User ID</dt><dd>{appUser?.userId || 'Not assigned'}</dd></div><div><dt>Phone number</dt><dd>{appUser?.phonenumber || 'Not available'}</dd></div><div><dt>Account status</dt><dd className="active">{appUser?.is_active === false ? 'Inactive' : 'Active'}</dd></div></dl><small>Your role, phone number and permissions are managed by an administrator.</small></aside>
      <form className="account-form" onSubmit={save}><div className="account-form-heading"><div><h2>Profile information</h2><p>Keep your account information accurate and up to date.</p></div><UserRound /></div><div className="account-fields"><Field icon={<UserRound />} label="Full name" required value={form.name} onChange={(event) => set('name', event.target.value)} /><Field icon={<Mail />} label="Email address" type="email" value={form.email} onChange={(event) => set('email', event.target.value)} /><Field icon={<Phone />} label="WhatsApp number" value={form.whatsappnumber} onChange={(event) => set('whatsappnumber', event.target.value)} /><Field icon={<Building2 />} label="House / Building number" value={form.houseNo} onChange={(event) => set('houseNo', event.target.value)} /><Field icon={<MapPin />} label="Ward number" value={form.wardNo} onChange={(event) => set('wardNo', event.target.value)} /><Field icon={<MapPin />} label="PIN code" value={form.pincode} onChange={(event) => set('pincode', event.target.value)} /><label className="wide"><span><MapPin size={16} />Address</span><textarea rows="4" value={form.address} onChange={(event) => set('address', event.target.value)} placeholder="Enter your complete address" /></label></div><div className="account-form-actions"><button disabled={saving}><Save size={17} />{saving ? 'Saving…' : 'Save changes'}</button></div></form>
    </div>
  </section>;
}
function Field({ icon, label, ...props }) { return <label><span>{icon}{label}</span><input {...props} /></label>; }
