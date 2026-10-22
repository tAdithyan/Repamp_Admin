import { Fragment, useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { MapPinned, Plus, Search } from 'lucide-react';
import api from '../../api/axiosInstance';
import 'leaflet/dist/leaflet.css';
import './ServiceAreas.css';

export default function ServiceAreas() {
  const [districts, setDistricts] = useState([]), [radii, setRadii] = useState([]), [search, setSearch] = useState(''), [loading, setLoading] = useState(true), [savingId, setSavingId] = useState(''), [savingRadius, setSavingRadius] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [radiusName, setRadiusName] = useState(''), [center, setCenter] = useState([10.5276, 76.2144]), [radiusKm, setRadiusKm] = useState('5');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [districtResponse, radiusResponse] = await Promise.all([
        api.get('/v1/service-areas/districts'), api.get('/v1/service-areas/radii'),
      ]);
      setDistricts(districtResponse.data?.data?.districts || []);
      setRadii(radiusResponse.data?.data || []);
      if (!districtResponse.data?.data?.configured) setError('District data is not seeded yet. Run the backend Kerala district seed script.');
    } catch (e) { setError(e.response?.data?.message || 'Unable to load district serviceability.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const visibleDistricts = useMemo(() => districts.filter(district => district.districtName.toLowerCase().includes(search.trim().toLowerCase())), [districts, search]);
  const toggle = async district => {
    setSavingId(district._id); setError(''); setNotice('');
    try {
      const response = await api.patch(`/v1/service-areas/districts/${encodeURIComponent(district._id)}/status`, { isServiceable: !district.isServiceable });
      const updated = response.data?.data;
      setDistricts(current => current.map(item => item._id === district._id ? updated : item));
      setNotice(`${updated.districtName} is now ${updated.isServiceable ? 'available' : 'unavailable'} for REPAMP service.`);
    } catch (e) { setError(e.response?.data?.message || 'Unable to update district status.'); }
    finally { setSavingId(''); }
  };
  const saveRadius = async event => {
    event.preventDefault(); setSavingRadius(true); setError(''); setNotice('');
    try {
      const radiusMeters = Number(radiusKm) * 1000;
      const response = await api.post('/v1/service-areas/radii', { name: radiusName, latitude: center[0], longitude: center[1], radiusMeters });
      setRadii(current => [...current, response.data?.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNotice(`${radiusName.trim()} is now available within ${radiusKm} km of the selected point.`);
      setRadiusName('');
    } catch (e) { setError(e.response?.data?.message || 'Unable to save the radius service area.'); }
    finally { setSavingRadius(false); }
  };
  const toggleRadius = async area => {
    setSavingId(area._id); setError(''); setNotice('');
    try {
      const response = await api.patch(`/v1/service-areas/radii/${encodeURIComponent(area._id)}/status`, { isActive: !area.isActive });
      const updated = response.data?.data;
      setRadii(current => current.map(item => item._id === area._id ? updated : item));
      setNotice(`${updated.name} is now ${updated.isActive ? 'active' : 'inactive'}.`);
    } catch (e) { setError(e.response?.data?.message || 'Unable to update the radius service area.'); }
    finally { setSavingId(''); }
  };
  return <section className="service-areas-page">
    <header className="service-areas-header"><div><span>LOCATION COVERAGE</span><h1>Service Areas</h1><p>Enable service by district or by a radius around a point.</p></div><span className="district-count">{districts.filter(d => d.isServiceable).length} districts · {radii.filter(area => area.isActive).length} active radii</span></header>
    <div className="service-area-note"><MapPinned size={19} /><p>At app launch, REPAMP checks the GPS point against enabled districts and active radius areas. A point inside an active radius is serviceable even if its district is disabled. Changes take effect on the next check without a mobile app update.</p></div>
    {notice && <p className="service-area-notice">{notice}</p>}{error && <p className="service-area-error" role="alert">{error}<button onClick={() => void load()}>Retry</button></p>}
    <section className="radius-panel">
      <div className="radius-panel-heading"><div><span>POINT-BASED COVERAGE</span><h2>Add a service radius</h2><p>Click the map to choose a center, then set the coverage radius.</p></div><MapPinned size={22} /></div>
      <MapContainer className="radius-map" center={center} zoom={10} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapCenterPicker onPick={setCenter} />
        {radii.map(area => {
          const areaCenter = [area.center.coordinates[1], area.center.coordinates[0]];
          const color = area.isActive ? '#087b61' : '#78827e';
          return <Fragment key={area._id}>
            <Circle center={areaCenter} radius={area.radiusMeters} pathOptions={{ color, fillColor: color, fillOpacity: area.isActive ? 0.13 : 0.06, dashArray: area.isActive ? undefined : '5 7' }} />
            <CircleMarker center={areaCenter} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }}>
              <Popup>{area.name} · {(area.radiusMeters / 1000).toFixed(1)} km · {area.isActive ? 'Active' : 'Inactive'}</Popup>
            </CircleMarker>
          </Fragment>;
        })}
        <Circle center={center} radius={Math.max(0, Number(radiusKm) || 0) * 1000} pathOptions={{ color: '#0b9c78', fillColor: '#0b9c78', fillOpacity: 0.18 }} />
        <CircleMarker center={center} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#087b61', fillOpacity: 1 }} />
      </MapContainer>
      <form className="radius-form" onSubmit={saveRadius}>
        <label>Area name<input required maxLength={100} value={radiusName} onChange={event => setRadiusName(event.target.value)} placeholder="For example, Kochi Depot" /></label>
        <label>Radius (km)<input required type="number" min="0.1" max="100" step="0.1" value={radiusKm} onChange={event => setRadiusKm(event.target.value)} /></label>
        <label>Latitude<input required type="number" min="-90" max="90" step="any" value={center[0]} onChange={event => setCenter([Number(event.target.value), center[1]])} /></label>
        <label>Longitude<input required type="number" min="-180" max="180" step="any" value={center[1]} onChange={event => setCenter([center[0], Number(event.target.value)])} /></label>
        <button className="radius-save" type="submit" disabled={savingRadius}><Plus size={16} />{savingRadius ? 'Saving…' : 'Add service radius'}</button>
      </form>
      {radii.length > 0 && <div className="radius-list">{radii.map(area => <article className="radius-card" key={area._id}>
        <div><h3>{area.name}</h3><p>{(area.radiusMeters / 1000).toFixed(1)} km radius · {area.center.coordinates[1].toFixed(5)}, {area.center.coordinates[0].toFixed(5)}</p><small>{area.isActive ? 'Active and included in GPS checks' : 'Inactive'}</small></div>
        <button disabled={savingId === area._id} className={area.isActive ? 'district-toggle district-toggle-disable' : 'district-toggle'} onClick={() => void toggleRadius(area)}>{savingId === area._id ? 'Saving…' : area.isActive ? 'Disable' : 'Enable'}</button>
      </article>)}</div>}
    </section>
    <label className="district-search"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Kerala districts" aria-label="Search districts" /></label>
    {loading ? <p>Loading districts…</p> : visibleDistricts.length === 0 ? <div className="service-area-empty"><MapPinned size={34} /><h2>{districts.length ? 'No districts match your search' : 'No district data available'}</h2><p>{districts.length ? 'Try another district name.' : 'Seed the Kerala district boundary data, then retry.'}</p></div> : <div className="district-serviceability-list">{visibleDistricts.map(district => <article className="district-serviceability-card" key={district._id}>
      <div className="district-serviceability-copy"><h2>{district.districtName}</h2><p>{district.stateName} · {district.stateCode}</p><small>Updated {district.updatedAt ? new Date(district.updatedAt).toLocaleString('en-IN') : 'during setup'}{district.updatedBy?.name ? ` by ${district.updatedBy.name}` : ''}</small></div>
      <div className="district-serviceability-actions"><span className={district.isServiceable ? 'district-status district-status-active' : 'district-status'}>{district.isServiceable ? 'Available' : 'Unavailable'}</span><button disabled={savingId === district._id} className={district.isServiceable ? 'district-toggle district-toggle-disable' : 'district-toggle'} onClick={() => void toggle(district)}>{savingId === district._id ? 'Saving…' : district.isServiceable ? 'Disable' : 'Enable'}</button></div>
    </article>)}</div>}
  </section>;
}

function MapCenterPicker({ onPick }) {
  useMapEvents({ click: event => onPick([event.latlng.lat, event.latlng.lng]) });
  return null;
}
