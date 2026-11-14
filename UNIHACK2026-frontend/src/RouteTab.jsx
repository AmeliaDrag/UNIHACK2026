import { useEffect, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Buburuză SVG ca icon Leaflet ─────────────────────────────────────────────
const ladybugSvg = (color = '#c62828') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
  <!-- umbra / pin -->
  <ellipse cx="20" cy="46" rx="6" ry="2.5" fill="rgba(0,0,0,.3)"/>
  <!-- corp roșu -->
  <ellipse cx="20" cy="26" rx="14" ry="13" fill="${color}"/>
  <!-- linie mijloc -->
  <line x1="20" y1="13" x2="20" y2="39" stroke="#111" stroke-width="1.5"/>
  <!-- pete -->
  <circle cx="13" cy="23" r="3.2" fill="#111"/>
  <circle cx="27" cy="23" r="3.2" fill="#111"/>
  <circle cx="12" cy="31" r="2.8" fill="#111"/>
  <circle cx="28" cy="31" r="2.8" fill="#111"/>
  <!-- cap -->
  <circle cx="20" cy="13" r="7" fill="#111"/>
  <!-- ochi -->
  <circle cx="17" cy="11" r="1.6" fill="#fff"/>
  <circle cx="23" cy="11" r="1.6" fill="#fff"/>
  <!-- antene -->
  <line x1="17" y1="7"  x2="13" y2="2"  stroke="#111" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="23" y1="7"  x2="27" y2="2"  stroke="#111" stroke-width="1.2" stroke-linecap="round"/>
  <circle cx="12.5" cy="1.5" r="1.4" fill="#111"/>
  <circle cx="27.5" cy="1.5" r="1.4" fill="#111"/>
</svg>`;

function makeLadybugIcon(color = '#c62828') {
  return L.divIcon({
    html: ladybugSvg(color),
    className: '',           // fără clasa default alba
    iconSize:  [40, 48],
    iconAnchor:[20, 46],     // vârful pinului
    popupAnchor:[0, -46],
  });
}

const iconFrom = makeLadybugIcon('#c62828'); // red — start
const iconTo   = makeLadybugIcon('#111');    // black — destination

// ── Arrow marker for suspect direction ──────────────────────────────────────
const arrowSvg = (direction) => {
  const rot = direction === 'left' ? 180 : 0;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
  <ellipse cx="20" cy="46" rx="6" ry="2.5" fill="rgba(0,0,0,.3)"/>
  <circle cx="20" cy="24" r="18" fill="#ff4444" stroke="#111" stroke-width="2"/>
  <g transform="rotate(${rot} 20 24)">
    <path d="M10 24 L24 14 L24 20 L32 20 L32 28 L24 28 L24 34 Z" fill="#111"/>
  </g>
</svg>`;
};

function makeArrowIcon(direction) {
  return L.divIcon({
    html: arrowSvg(direction),
    className: '',
    iconSize: [40, 48],
    iconAnchor: [20, 46],
    popupAnchor: [0, -46],
  });
}

const ORS_KEY = import.meta.env.VITE_ORS_KEY;

async function geocode(address) {
  const res  = await fetch(`/nominatim/search?format=json&limit=1&q=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error('Serviciul de geocodare nu răspunde.');
  const data = await res.json();
  if (!data.length) throw new Error('Adresa nu a fost găsită. Încearcă mai specific.');
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
}

async function reverseGeocode(lat, lng) {
  try {
    const res  = await fetch(`/nominatim/reverse?format=json&lat=${lat}&lon=${lng}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function fetchRoute(from, to) {
  if (!ORS_KEY) return [from, to];
  const res = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: ORS_KEY },
    body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]] }),
  });
  if (!res.ok) throw new Error('Ruta nu a putut fi calculată.');
  const json = await res.json();
  return json.features[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
}

function ClickHandler({ mode, onPick }) {
  useMapEvents({ click(e) { if (mode) onPick(e.latlng); } });
  return null;
}

function FlyTo({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], 15, { duration: 1 });
  }, [point?.lat, point?.lng]);
  return null;
}

export default function RouteTab({ userPos, reports = [] }) {
  const [open, setOpen]         = useState(false);
  const [from, setFrom]         = useState(null);
  const [to, setTo]             = useState(null);
  const [toInput, setToInput]   = useState('');
  const [route, setRoute]       = useState(null);
  const [pickMode, setPickMode] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [info, setInfo]         = useState(null);

  const closePanel = () => setOpen(false);

  const useMyLocation = () => {
    if (!userPos) return alert('GPS location not available yet.');
    setFrom({ ...userPos, label: 'My location' });
    setRoute(null);
  };

  const handleMapPick = async (latlng) => {
    const mode = pickMode;
    setPickMode(null);
    const label = await reverseGeocode(latlng.lat, latlng.lng);
    const point = { lat: latlng.lat, lng: latlng.lng, label };
    if (mode === 'from') setFrom(point);
    if (mode === 'to')   { setTo(point); setToInput(label); }
    setRoute(null);
  };

  const resolveDestination = async () => {
    if (!toInput.trim()) return;
    setLoading(true); setError(null);
    try {
      const point = await geocode(toInput);
      setTo(point); setToInput(point.label);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const calculate = async () => {
    if (!from) return setError('Selectează punctul de plecare.');
    if (!to)   return setError('Selectează destinația.');
    setLoading(true); setError(null); setInfo(null);
    try {
      const points = await fetchRoute(from, to);
      setRoute(points);
      let dist = 0;
      for (let i = 1; i < points.length; i++) dist += haversine(points[i-1], points[i]);
      const walkMin = Math.round((dist / 5) * 60);
      setInfo(`~${dist.toFixed(2)} km · ~${walkMin} min pe jos${ORS_KEY ? '' : ' (linie dreaptă)'}`);
      closePanel(); // ← închide panoul după calcul
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setFrom(null); setTo(null); setToInput('');
    setRoute(null); setInfo(null); setError(null);
    closePanel();
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>

      {/* ── Harta ocupă tot fundalul ── */}
      <MapContainer center={[45.7537, 21.2257]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="© OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler mode={pickMode} onPick={handleMapPick} />
        <FlyTo point={from ?? to ?? null} />
        {from  && <Marker position={[from.lat, from.lng]} icon={iconFrom} />}
        {to    && <Marker position={[to.lat,   to.lng]}   icon={iconTo}   />}
        {route && <Polyline positions={route.map(p => [p.lat, p.lng])} pathOptions={{ color: '#c62828', weight: 4 }} />}

        {/* ── Report markers with direction arrows ── */}
        {reports
          .filter((r) => r.status !== 'resolved' && r.lat && r.direction)
          .map((r) => (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={makeArrowIcon(r.direction)}
            >
              <Popup>
                <b>{r.category}</b><br />
                {r.direction === 'left' ? '⬅ Moving left' : 'Moving right ➡'}<br />
                {r.text}
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* ── Overlay sus: titlu + toggle ── */}
      <div className="rt-top">
        <button className="rt-toggle" onClick={() => setOpen(o => !o)}>
          <span className="rt-title">LadyMap</span>
          <span className="rt-arrow">{open ? '▲' : '▼'}</span>
        </button>

        {/* Panel care slide down/up */}
        <div className={`rt-panel${open ? ' open' : ''}`}>

          {/* De la */}
          <div className="rt-row">
            <span className="rt-dot" />
            <div className="rt-field">
              <div className="rt-val">{from ? from.label : <span className="rt-ph">From…</span>}</div>
              <div className="rt-actions">
                <button className="g" onClick={useMyLocation}>📍 My location</button>
                <button
                  className={`g${pickMode === 'from' ? ' active-pick' : ''}`}
                  onClick={() => setPickMode(pickMode === 'from' ? null : 'from')}
                >🗺 On map</button>
                {from && <button className="g" onClick={() => { setFrom(null); setRoute(null); }}>✕</button>}
              </div>
            </div>
          </div>

          {/* Linie conector */}
          <div className="rt-connector" />

          {/* Până la */}
          <div className="rt-row">
            <span className="rt-dot dest" />
            <div className="rt-field">
              <input
                className="rt-input"
                placeholder="Destination…"
                value={toInput}
                onChange={(e) => { setToInput(e.target.value); setTo(null); setRoute(null); }}
                onBlur={resolveDestination}
                onKeyDown={(e) => e.key === 'Enter' && resolveDestination()}
              />
              <div className="rt-actions">
                <button
                  className={`g${pickMode === 'to' ? ' active-pick' : ''}`}
                  onClick={() => setPickMode(pickMode === 'to' ? null : 'to')}
                >🗺 On map</button>
                {to && <button className="g" onClick={() => { setTo(null); setToInput(''); setRoute(null); }}>✕</button>}
              </div>
            </div>
          </div>

          {pickMode && (
            <div className="rt-hint">
              Tap the map — {pickMode === 'from' ? 'start point' : 'destination'}
              <button className="g" onClick={() => setPickMode(null)} style={{ marginLeft: 8 }}>✕</button>
            </div>
          )}

          {error && <div className="rt-error">{error}</div>}
          {info  && <div className="rt-info">{info}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="b" onClick={calculate} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Calculating…' : 'Find route'}
            </button>
            <button className="g" onClick={reset}>↺</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function haversine(a, b) {
  const R = 6371, dLat = deg2rad(b.lat - a.lat), dLng = deg2rad(b.lng - a.lng);
  const x = Math.sin(dLat/2)**2 + Math.cos(deg2rad(a.lat))*Math.cos(deg2rad(b.lat))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
function deg2rad(d) { return d * Math.PI / 180; }
