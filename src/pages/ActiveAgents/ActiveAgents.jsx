import { useEffect, useState } from 'react';
import { Clock3, LocateFixed, MapPin, Navigation, Phone, RefreshCw, Trash2, Truck } from 'lucide-react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useShifts } from '../../hooks/useApiQueries';
import 'leaflet/dist/leaflet.css';
import './ActiveAgents.css';
import './CollectedBins.css';

const agentIcon = L.divIcon({
  className: 'agent-map-marker',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapViewport({ point }) {
  const map = useMap();
  useEffect(() => {
    map.setView(point, 16, { animate: true });
  }, [map, point[0], point[1]]);
  return null;
}

const duration = (startedAt, now) => {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
};

export default function ActiveAgents() {
  const shiftsQuery = useShifts({ refetchInterval: 15000, staleTime: 10000 });
  const shifts = shiftsQuery.data || [];
  const [selectedId, setSelectedId] = useState(null);
  const loading = shiftsQuery.isLoading;
  const refreshing = shiftsQuery.isFetching;
  const error = shiftsQuery.error?.response?.data?.message || (shiftsQuery.error ? 'Unable to load active collection agents.' : '');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setSelectedId((current) => shifts.some((shift) => shift._id === current) ? current : shifts[0]?._id || null);
  }, [shifts]);
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const selected = shifts.find((shift) => shift._id === selectedId) || null;
  const lastPoint = selected?.lastLocation
    ? [selected.lastLocation.latitude, selected.lastLocation.longitude]
    : selected?.route?.length
      ? [selected.route[selected.route.length - 1].latitude, selected.route[selected.route.length - 1].longitude]
      : null;
  const routePoints = (selected?.route || [])
    .map((point) => [Number(point.latitude), Number(point.longitude)])
    .filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));

  return (
    <section className="agent-tracking-page">
      <header className="agent-tracking-header">
        <div>
          <span>Fleet operations</span>
          <h1>Active collection agents</h1>
          <p>Track Role 4 agents who currently have an active vehicle shift.</p>
        </div>
        <button onClick={() => shiftsQuery.refetch()} disabled={refreshing}>
          <RefreshCw size={17} className={refreshing ? 'agent-spin' : ''} />
          Refresh
        </button>
      </header>

      {error && <div className="agent-error">{error}</div>}
      <div className="agent-summary">
        <div><Truck size={21} /><span><strong>{shifts.length}</strong> active agents</span></div>
        <div><LocateFixed size={21} /><span><strong>{shifts.filter((shift) => shift.lastLocation).length}</strong> reporting GPS</span></div>
        <div><Trash2 size={21} /><span><strong>{shifts.reduce((sum, shift) => sum + (shift.collectedBins?.length || 0), 0)}</strong> bins collected</span></div>
      </div>

      <div className="agent-tracking-layout">
        <aside className="agent-list">
          <div className="agent-list-heading">Agents on shift <span>{shifts.length}</span></div>
          {loading ? <div className="agent-state">Loading active shifts…</div> : !shifts.length ? (
            <div className="agent-state"><Truck size={32} /><strong>No active agents</strong><p>Role 4 agents appear here after starting a shift.</p></div>
          ) : shifts.map((shift) => {
            const agent = shift.agentId || {};
            const location = shift.lastLocation;
            return (
              <button key={shift._id} className={`agent-item ${selectedId === shift._id ? 'selected' : ''}`} onClick={() => setSelectedId(shift._id)}>
                <div className="agent-avatar">{(agent.name || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div className="agent-item-copy">
                  <div><strong>{agent.name || 'Collection agent'}</strong><span className="agent-live"><i />LIVE</span></div>
                  <small>{agent.userId || 'ROL_4'}{agent.vehicleno ? ` · ${agent.vehicleno}` : ''}</small>
                  <span><Clock3 size={13} />{duration(shift.startedAt, now)}</span>
                  <span><MapPin size={13} />{location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Waiting for GPS'}</span>
                  <span><Trash2 size={13} />{shift.collectedBins?.length || 0} bins collected this shift</span>
                </div>
              </button>
            );
          })}
        </aside>

        <div className="agent-map-panel">
          {lastPoint ? (
            <MapContainer
              key={selected?._id}
              className="agent-map"
              center={lastPoint}
              zoom={16}
              scrollWheelZoom
              attributionControl
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewport point={lastPoint} />
              {routePoints.length > 1 && <Polyline positions={routePoints} pathOptions={{ color: '#07875f', weight: 5, opacity: 0.8 }} />}
              <Marker position={lastPoint} icon={agentIcon} />
            </MapContainer>
          ) : (
            <div className="agent-map-placeholder">
              <Navigation size={32} />
              <strong>{!selected ? 'Select an active agent' : 'Waiting for the agent’s first GPS update'}</strong>
              <span>{!selected ? 'The current location will appear here after you select an agent.' : 'The agent needs an active shift and location access for their position to appear.'}</span>
            </div>
          )}
          {selected && (
            <div className="agent-map-info">
              <div><strong>{selected.agentId?.name || 'Collection agent'}</strong><span>Shift started {new Date(selected.startedAt).toLocaleString()}</span></div>
              <div className="agent-map-actions">
                {selected.agentId?.phonenumber && <a href={`tel:${selected.agentId.phonenumber}`}><Phone size={15} />Call</a>}
                {lastPoint && <a href={`https://www.openstreetmap.org/?mlat=${lastPoint[0]}&mlon=${lastPoint[1]}#map=17/${lastPoint[0]}/${lastPoint[1]}`} target="_blank" rel="noreferrer"><MapPin size={15} />Open map</a>}
              </div>
            </div>
          )}
          {selected && (
            <div className="agent-bins">
              <div className="agent-bins-title"><span><Trash2 size={15} />Collected bins</span><strong>{selected.collectedBins?.length || 0}</strong></div>
              <div className="agent-bins-list">
                {selected.collectedBins?.length ? selected.collectedBins.map((bin) => (
                  <div key={bin._id}><span><strong>{bin.binId}</strong>{bin.name}</span><small>{bin.location}</small></div>
                )) : <p>No bins collected during this shift.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
