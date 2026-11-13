/**
 * RouteTab.jsx — plan a route from A to B, displayed on the map.
 *
 * - Click "Folosește locația mea" to set the start point from GPS.
 * - Or click anywhere on the map to place the start/end pin.
 * - Destination: type an address (geocoded via Nominatim, free, no key needed)
 *   or click on the map when destination mode is active.
 * - Route is drawn using OpenRouteService (VITE_ORS_KEY) if configured,
 *   otherwise falls back to a straight line.
 */
import { useEffect, useRef, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons broken by Vite's asset pipeline
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ORS_KEY = import.meta.env.VITE_ORS_KEY;

// ── Geocode an address string via Nominatim (proxied through Vite) ───────────
async function geocode(address) {
  const url = `/nominatim/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('Serviciul de geocodare nu răspunde.');
  const data = await res.json();
  if (!data.length) throw new Error('Adresa nu a fost găsită. Încearcă mai specific, ex: "Strada X, Timișoara"');
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
}

// ── Reverse geocode a lat/lng → address label ────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const url = `/nominatim/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// ── Fetch a walking route from ORS ───────────────────────────────────────────
async function fetchRoute(from, to) {
  if (!ORS_KEY) {
    // No key — return a straight line with two points
    return [from, to];
  }
  const url = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: ORS_KEY },
    body: JSON.stringify({
      coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
    }),
  });
  if (!res.ok) throw new Error('Ruta nu a putut fi calculată.');
  const json  = await res.json();
  const coords = json.features[0].geometry.coordinates;
  // ORS returns [lng, lat] — flip to [lat, lng] for Leaflet
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

// ── Map click handler component ───────────────────────────────────────────────
function ClickHandler({ mode, onPick }) {
  useMapEvents({
    click(e) {
      if (mode) onPick(e.latlng);
    },
  });
  return null;
}

// ── Fly to a point ────────────────────────────────────────────────────────────
function FlyTo({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], 15, { duration: 1 });
  }, [point?.lat, point?.lng]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RouteTab({ userPos }) {
  const [from, setFrom]         = useState(null);   // { lat, lng, label }
  const [to, setTo]             = useState(null);
  const [toInput, setToInput]   = useState('');
  const [route, setRoute]       = useState(null);   // array of { lat, lng }
  const [pickMode, setPickMode] = useState(null);   // 'from' | 'to' | null
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [info, setInfo]         = useState(null);   // distance / duration text

  // Use GPS position as starting point
  const useMyLocation = () => {
    if (!userPos) return alert('Locația GPS nu este disponibilă încă.');
    setFrom({ ...userPos, label: 'Locația mea' });
    setRoute(null);
  };

  // Handle map click depending on active pick mode
  const handleMapPick = async (latlng) => {
    setPickMode(null);
    const label = await reverseGeocode(latlng.lat, latlng.lng).catch(() => `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
    const point = { lat: latlng.lat, lng: latlng.lng, label };
    if (pickMode === 'from') {
      setFrom(point);
    } else if (pickMode === 'to') {
      setTo(point);
      setToInput(label);
    }
    setRoute(null);
  };

  // Geocode the typed destination
  const resolveDestination = async () => {
    if (!toInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const point = await geocode(toInput);
      setTo(point);
      setToInput(point.label);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate route
  const calculate = async () => {
    if (!from) return setError('Selectează punctul de plecare.');
    if (!to)   return setError('Selectează destinația.');
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const points = await fetchRoute(from, to);
      setRoute(points);

      // Rough distance in km (sum of segment haversines)
      let dist = 0;
      for (let i = 1; i < points.length; i++) {
        dist += haversine(points[i - 1], points[i]);
      }
      const walkMin = Math.round((dist / 5) * 60); // assume 5 km/h walking
      setInfo(`~${dist.toFixed(2)} km · ~${walkMin} min pe jos${ORS_KEY ? '' : ' (linie dreaptă — adaugă VITE_ORS_KEY pentru rute reale)'}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFrom(null); setTo(null); setToInput(''); setRoute(null); setInfo(null); setError(null); };

  const flyTarget = from ?? to ?? null;

  return (
    <div className="route-wrap">
      {/* ── Controls ── */}
      <div className="p route-controls">
        <h2>Calculează ruta</h2>

        {/* From */}
        <div className="route-row">
          <label className="route-label">De la</label>
          <div className="route-field">
            <div className="route-value">{from ? from.label : <span className="mut">neselectat</span>}</div>
            <div className="route-actions">
              <button className="g" onClick={useMyLocation}>📍 Locația mea</button>
              <button
                className={`g${pickMode === 'from' ? ' active-pick' : ''}`}
                onClick={() => setPickMode(pickMode === 'from' ? null : 'from')}
              >
                🗺 Pe hartă
              </button>
              {from && <button className="g" onClick={() => { setFrom(null); setRoute(null); }}>✕</button>}
            </div>
          </div>
        </div>

        {/* To */}
        <div className="route-row">
          <label className="route-label">Până la</label>
          <div className="route-field">
            <input
              placeholder="Adresă sau loc…"
              value={toInput}
              onChange={(e) => { setToInput(e.target.value); setTo(null); setRoute(null); }}
              onBlur={resolveDestination}
              onKeyDown={(e) => e.key === 'Enter' && resolveDestination()}
            />
            <div className="route-actions">
              <button
                className={`g${pickMode === 'to' ? ' active-pick' : ''}`}
                onClick={() => setPickMode(pickMode === 'to' ? null : 'to')}
              >
                🗺 Pe hartă
              </button>
              {to && <button className="g" onClick={() => { setTo(null); setToInput(''); setRoute(null); }}>✕</button>}
            </div>
          </div>
        </div>

        {pickMode && (
          <div className="route-hint">
            Apasă pe hartă pentru a plasa {pickMode === 'from' ? 'punctul de plecare' : 'destinația'}.
            <button className="g" onClick={() => setPickMode(null)} style={{ marginLeft: 8 }}>Anulează</button>
          </div>
        )}

        {error && <div className="route-error">{error}</div>}
        {info  && <div className="route-info">{info}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="b" onClick={calculate} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Se calculează…' : 'Calculează ruta'}
          </button>
          <button className="g" onClick={reset}>Resetează</button>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="route-map">
        <MapContainer center={[45.7537, 21.2257]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution="© OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler mode={pickMode} onPick={handleMapPick} />
          <FlyTo point={flyTarget} />
          {from  && <Marker position={[from.lat, from.lng]} />}
          {to    && <Marker position={[to.lat, to.lng]} />}
          {route && <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#3b3f9e', weight: 4 }} />}
        </MapContainer>
      </div>
    </div>
  );
}

// ── Haversine distance in km ──────────────────────────────────────────────────
function haversine(a, b) {
  const R  = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const x  = Math.sin(dLat / 2) ** 2 +
              Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function deg2rad(d) { return d * (Math.PI / 180); }
