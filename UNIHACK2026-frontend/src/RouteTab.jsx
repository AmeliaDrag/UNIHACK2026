import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Polyline, Circle, Popup, useMapEvents, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-rotate';   // adds map rotation (GPL-3.0); used only by the navigation mode
import { backendApi, describeApiError } from './api';
import 'leaflet/dist/leaflet.css';

// ── Buburuză SVG ca icon Leaflet ─────────────────────────────────────────────
const ladybugSvg = (color = '#c62828', size = 40) => {
  const h = size * 1.2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="${size}" height="${h}">
  <ellipse cx="20" cy="46" rx="6" ry="2.5" fill="rgba(0,0,0,.3)"/>
  <ellipse cx="20" cy="26" rx="14" ry="13" fill="${color}"/>
  <line x1="20" y1="13" x2="20" y2="39" stroke="#111" stroke-width="1.5"/>
  <circle cx="13" cy="23" r="3.2" fill="#111"/>
  <circle cx="27" cy="23" r="3.2" fill="#111"/>
  <circle cx="12" cy="31" r="2.8" fill="#111"/>
  <circle cx="28" cy="31" r="2.8" fill="#111"/>
  <circle cx="20" cy="13" r="7" fill="#111"/>
  <circle cx="17" cy="11" r="1.6" fill="#fff"/>
  <circle cx="23" cy="11" r="1.6" fill="#fff"/>
  <line x1="17" y1="7"  x2="13" y2="2"  stroke="#111" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="23" y1="7"  x2="27" y2="2"  stroke="#111" stroke-width="1.2" stroke-linecap="round"/>
  <circle cx="12.5" cy="1.5" r="1.4" fill="#111"/>
  <circle cx="27.5" cy="1.5" r="1.4" fill="#111"/>
</svg>`;
};

function makeLadybugIcon(color = '#c62828', size = 40) {
  const h = size * 1.2;
  return L.divIcon({
    html: ladybugSvg(color, size),
    className: '',
    iconSize:   [size, h],
    iconAnchor: [size / 2, h - 2],
    popupAnchor:[0, -h],
  });
}

// Route markers
const iconFrom = makeLadybugIcon('#c62828', 40); // red — start
const iconTo   = makeLadybugIcon('#111',    40); // black — destination

// ── Marker locatie curenta: buburuza mai mare roz ────────────────────────────
const iconMe = makeLadybugIcon('#e91e8c', 36);

// ── Arrow marker for suspect direction ──────────────────────────────────────
// angleDeg: 0=right(east), 90=down(south), 180=left(west), 270=up(north)
const directionAngle = { right: 0, left: 180, north: 270, south: 90 };
const DIRECTION_LABEL = { left: '⬅ stânga / vest', right: 'dreapta / est ➡', north: '⬆ nord', south: '⬇ sud' };

const arrowSvg = (direction) => {
  const angle = directionAngle[direction] ?? 0;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="28" height="28">
  <circle cx="24" cy="24" r="20" fill="#ff4444" fill-opacity="0.45" stroke="#c62828" stroke-width="1.5"/>
  <g transform="rotate(${angle} 24 24)">
    <path d="M14 24 L26 16 L26 21 L35 21 L35 27 L26 27 L26 32 Z" fill="rgba(255,255,255,0.75)"/>
  </g>
</svg>`;
};

function makeArrowIcon(direction) {
  return L.divIcon({
    html: arrowSvg(direction),
    className: '',
    iconSize:  [28, 28],
    iconAnchor:[14, 14],
    popupAnchor:[0, -18],
  });
}

// ── Punct rosu: dubiosul sta pe loc ─────────────────────────────────────────
const dotSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <circle cx="12" cy="12" r="10" fill="#ff4444" stroke="#111" stroke-width="2"/>
</svg>`;

const iconDot = L.divIcon({
  html: dotSvg,
  className: '',
  iconSize:  [24, 24],
  iconAnchor:[12, 12],
  popupAnchor:[0, -16],
});

// ── Z marker: dubiosul doarme ────────────────────────────────────────────────
const zSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="20" fill="#7b1fa2" fill-opacity="0.85" stroke="#111" stroke-width="2"/>
  <text x="24" y="31" text-anchor="middle" font-size="22" font-weight="bold"
        font-family="sans-serif" fill="#fff" letter-spacing="1">Z</text>
</svg>`;

const iconZ = L.divIcon({
  html: zSvg,
  className: '',
  iconSize:  [48, 48],
  iconAnchor:[24, 24],
  popupAnchor:[0, -28],
});

// ── Circle styles per category ────────────────────────────────────────────────
function reportCircleOptions(category) {
  if (category === 'Poor lighting')
    return { color: '#f9a825', fillColor: '#ffe57f', fillOpacity: 0.15, weight: 1.5 };
  if (category === 'Suspicious person')
    return { color: '#c62828', fillColor: '#ff4444', fillOpacity: 0.12, weight: 1.5 };
  return { color: '#757575', fillColor: '#bdbdbd', fillOpacity: 0.10, weight: 1 };
}

// Raza cercului per categorie (metri)
function reportCircleRadius(category) {
  if (category === 'Poor lighting') return 30;
  return 80;
}


// Address search (Nominatim through the /nominatim proxy). Returns up to 5 places.
// `near` ({lat,lng}) only RANKS results around you (bounded=0): places elsewhere still show up.
async function searchPlaces(query, near) {
  const q = query.trim();
  if (q.length < 2) return [];
  let url = `/nominatim/search?format=json&limit=5&addressdetails=0&q=${encodeURIComponent(q)}`;
  if (near && Number.isFinite(near.lat) && Number.isFinite(near.lng)) {
    const d = 0.35;   // about 35 km around you
    url += `&viewbox=${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}&bounded=0`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`The address search is not available right now (HTTP ${res.status}). Try again in a moment.`);
  const data = await res.json();
  return data
    .map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), label: d.display_name }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
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

// Safest route: the backend asks OpenRouteService to avoid areas around active reports.
async function fetchSafeRoute(from, to) {
  const r = await backendApi.getRoute({
    origin:      { latitude: from.lat, longitude: from.lng },
    destination: { latitude: to.lat,   longitude: to.lng },
  });
  const coords = r?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) throw new Error('Răspuns de rută invalid.');
  const points = coords.map(([lng, lat]) => ({ lat, lng }));
  const km  = r.distanceMeters / 1000;
  const min = Math.max(1, Math.round(r.durationSeconds / 60));
  let safety;
  if (r.avoidanceApplied)      safety = `Rută sigură: ocolește ${r.avoidancePolygonCount} zone raportate`;
  else if (r.avoidanceLimited) safety = r.warning || 'Nu s-a putut ocoli zonele raportate';
  else                         safety = 'Nicio zonă raportată pe traseu, deci este și cea mai scurtă';
  return { points, text: `~${km.toFixed(2)} km · ~${min} min pe jos · ${safety}` };
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

// ── 24/7 shops from OpenStreetMap (Overpass API) ─────────────────────────────
// Public Overpass servers are often busy, so try several of them in order.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const SHOP_LABEL = {
  convenience: 'Minimarket', supermarket: 'Supermarket', general: 'Magazin general', kiosk: 'Chioșc',
  pharmacy: 'Farmacie', fuel: 'Benzinărie',
};
// The server also stores odd shop types (funeral services, storage...); show only useful ones.
const SHOW_KINDS = new Set(Object.keys(SHOP_LABEL));

const iconShop = L.divIcon({
  html: '<div class="shop24"><span>24</span></div>',
  className: '',
  iconSize:   [34, 34],
  iconAnchor: [17, 17],
  popupAnchor:[0, -20],
});

// Shops are loaded ONCE for a wide area around you (not on every pan or zoom) and
// cached on this device, so the markers are always on the map at every zoom level.
const SHOPS_CACHE_KEY = 'shops24:v1';
const SHOPS_TTL_MS    = 12 * 60 * 60 * 1000;   // refresh after 12 hours
const SPAN_LAT = 0.10;                          // ~11 km north/south of the anchor
const SPAN_LNG = 0.15;                          // ~11 km east/west (at 45 N)
const MAX_AREAS = 6;

const inArea = (a, lat, lng, m = 0.02) =>
  lat > a.s + m && lat < a.n - m && lng > a.w + m && lng < a.e - m;

function readShopCache() {
  try {
    const all = JSON.parse(localStorage.getItem(SHOPS_CACHE_KEY) || '[]');
    return Array.isArray(all) ? all.filter((a) => Date.now() - a.at < SHOPS_TTL_MS) : [];
  } catch { return []; }
}
function writeShopCache(areas) {
  try { localStorage.setItem(SHOPS_CACHE_KEY, JSON.stringify(areas)); } catch { /* storage blocked */ }
}
function flattenShops(areas) {
  const m = new Map();
  areas.forEach((a) => a.shops.forEach((s) => m.set(s.id, s)));
  return [...m.values()];
}

// "24/7" or an all-day range like "Mo-Su 00:00-24:00"
function shopsQuery(b) {
  const bbox = `${b.s},${b.w},${b.n},${b.e}`;
  return '[out:json][timeout:25];(nwr["shop"~"^(convenience|supermarket|general|kiosk)$"]'
    + '["opening_hours"~"^(24/7|(Mo-Su )?00:00-24:00)$"](' + bbox + '););out center tags 800;';
}

async function fetchShops(bbox, signal) {
  let lastErr = new Error('no server');
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: shopsQuery(bbox) }), signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json.elements || [])
        .map((el) => {
          const tags = el.tags || {};
          return {
            id:      `${el.type}/${el.id}`,
            lat:     el.lat ?? el.center?.lat,
            lng:     el.lon ?? el.center?.lon,
            name:    tags.name || tags.brand || 'Magazin non-stop',
            kind:    tags.shop,
            address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
          };
        })
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      console.error(`[shops] ${url} failed:`, e);
      lastErr = e;
    }
  }
  throw lastErr;
}

// Always-on layer of highlighted 24/7 shops. Network only when you leave the cached area.
function ShopsLayer({ anchor, onStatus, signedIn = false }) {
  const map = useMap();
  const areas = useRef(readShopCache());
  const backendRef = useRef(new Map());   // places from the server snapshot (signed-in users)
  // live OpenStreetMap results + server places, without duplicates
  const merged = () => {
    const m = new Map();
    flattenShops(areas.current).forEach((s) => m.set(s.id, s));
    backendRef.current.forEach((s, id) => m.set(id, s));
    return [...m.values()];
  };
  const [shops, setShops] = useState(() => merged());
  const busy  = useRef(false);
  const timer = useRef(null);
  const ctrl  = useRef(null);
  const last  = useRef('');

  const report = useCallback((s) => {
    const k = JSON.stringify(s);
    if (k !== last.current) { last.current = k; onStatus(s); }
  }, [onStatus]);

  const ensure = useCallback(async (lat, lng) => {
    if (busy.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (areas.current.some((a) => inArea(a, lat, lng))) {
      report({ state: 'ok', count: merged().length });
      return;
    }
    busy.current = true;
    ctrl.current = new AbortController();
    if (areas.current.length === 0) report({ state: 'loading' });   // silent when refreshing
    try {
      const bbox = { s: lat - SPAN_LAT, n: lat + SPAN_LAT, w: lng - SPAN_LNG, e: lng + SPAN_LNG };
      const found = await fetchShops(bbox, ctrl.current.signal);
      areas.current = [...areas.current, { ...bbox, at: Date.now(), shops: found }].slice(-MAX_AREAS);
      writeShopCache(areas.current);
      const all = merged();
      setShops(all);
      report({ state: 'ok', count: all.length });
    } catch (e) {
      if (e.name !== 'AbortError') report({ state: 'error' });
    } finally {
      busy.current = false;
    }
  }, [report]);

  // Server snapshot of 24/7 places: instant, no outside request, needs a login.
  useEffect(() => {
    if (!signedIn) return undefined;
    let alive = true;
    backendApi.places()
      .then((list) => {
        if (!alive || !Array.isArray(list)) return;
        const m = new Map();
        list.filter((p) => SHOW_KINDS.has(p.category)).forEach((p) => m.set(p.id, {
          id: p.id, lat: p.latitude, lng: p.longitude,
          name: p.name || SHOP_LABEL[p.category] || 'Non-stop', kind: p.category, address: '',
        }));
        backendRef.current = m;
        const all = merged();
        setShops(all);
        report({ state: 'ok', count: all.length });
      })
      .catch((e) => console.error('[shops] server places failed:', e));
    return () => { alive = false; };
  }, [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps
  // After panning, only check whether the center left the cached area (no request otherwise).
  useMapEvents({
    moveend: () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { const c = map.getCenter(); ensure(c.lat, c.lng); }, 1200);
    },
  });

  // On start, and when your GPS position first arrives.
  useEffect(() => {
    const c = anchor ?? map.getCenter();
    ensure(c.lat, c.lng);
  }, [anchor?.lat, anchor?.lng, ensure, map]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { clearTimeout(timer.current); if (ctrl.current) ctrl.current.abort(); }, []);

  return shops.map((s) => (
    <Marker key={s.id} position={[s.lat, s.lng]} icon={iconShop} zIndexOffset={800}>
      <Popup>
        <b>{s.name}</b><br />
        {SHOP_LABEL[s.kind] || 'Magazin'}<br />
        {s.address && <>{s.address}<br /></>}
        <span style={{ color: '#00a846', fontWeight: 700 }}>Deschis non-stop (24/7)</span>
      </Popup>
    </Marker>
  ));
}
// ── Navigation mode: progress along the route, bearing, off-route detection ──
const M_PER_DEG = 111320;
const NAV_OFF_ROUTE_M  = 40;    // farther than this from the line = off route
const NAV_ARRIVE_M     = 25;    // closer than this to the end = arrived
const NAV_LOOKAHEAD_M  = 35;    // the map points toward where the route goes in the next 35 m
const NAV_ZOOM         = 18;
const WALK_M_PER_MIN   = 5000 / 60;

function toLocal(p, lat0, lng0) {
  return { x: (p.lng - lng0) * M_PER_DEG * Math.cos(lat0 * Math.PI / 180), y: (p.lat - lat0) * M_PER_DEG };
}
function buildCum(route) {
  const cum = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + haversine(route[i - 1], route[i]) * 1000);
  return cum;
}
// Closest point of the route to p, looking only at segments fromIdx..toIdx.
function snapToRoute(route, cum, p, fromIdx, toIdx) {
  let best = null;
  const last = route.length - 2;
  for (let i = Math.max(0, fromIdx); i <= Math.min(toIdx, last); i++) {
    const a = route[i], b = route[i + 1];
    const B = toLocal(b, a.lat, a.lng), P = toLocal(p, a.lat, a.lng);
    const len2 = B.x * B.x + B.y * B.y;
    const t = len2 > 0 ? Math.max(0, Math.min(1, (P.x * B.x + P.y * B.y) / len2)) : 0;
    const dist = Math.hypot(P.x - t * B.x, P.y - t * B.y);
    if (!best || dist < best.dist) {
      best = {
        idx: i, dist,
        point: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t },
        along: cum[i] + t * (cum[i + 1] - cum[i]),
      };
    }
  }
  return best;
}
function pointAtDistance(route, cum, d) {
  if (d <= 0) return route[0];
  for (let i = 1; i < cum.length; i++) {
    if (cum[i] >= d) {
      const f = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
      return { lat: route[i - 1].lat + (route[i].lat - route[i - 1].lat) * f, lng: route[i - 1].lng + (route[i].lng - route[i - 1].lng) * f };
    }
  }
  return route[route.length - 1];
}
// Compass bearing (0 = north, clockwise) from a to b.
function bearingDeg(a, b) {
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
const fmtDist = (m) => (m == null ? '…' : m < 1000 ? `${Math.round(m / 5) * 5} m` : `${(m / 1000).toFixed(1)} km`);

// Camera for navigation: follows the snapped position and turns the map so the way
// ahead points up. leaflet-rotate bearing = clockwise rotation of the map, so heading H -> 360 - H.
function NavCamera({ active, target, bearing }) {
  const map = useMap();
  const was = useRef(false);
  useEffect(() => {
    if (!active) {
      if (was.current) {
        was.current = false;
        if (map.setBearing) map.setBearing(0, { animate: true, duration: 0.5 });
      }
      return;
    }
    if (!target) return;
    const first = !was.current;
    was.current = true;
    map.setView([target.lat, target.lng], first ? NAV_ZOOM : map.getZoom(), { animate: true });
    if (map.setBearing) map.setBearing((360 - bearing) % 360, { animate: true, duration: 0.6 });
  }, [active, target?.lat, target?.lng, bearing]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
// Keeps the map on your live position. Dragging the map by hand turns following off.
function LocateControl({ userPos, follow, setFollow }) {
  const map = useMap();
  const centered = useRef(false);
  useMapEvents({ dragstart: () => setFollow(false) });
  useEffect(() => {
    if (!userPos) return;
    if (!centered.current) {              // first GPS fix: jump to you once
      centered.current = true;
      map.setView([userPos.lat, userPos.lng], Math.max(map.getZoom(), 16));
      setFollow(true);
      return;
    }
    if (follow) map.setView([userPos.lat, userPos.lng], Math.max(map.getZoom(), 16), { animate: true });
  }, [userPos?.lat, userPos?.lng, follow]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
export default function RouteTab({ userPos, geoError = null, reports = [], safe = false }) {
  const [open, setOpen]         = useState(false);
  const [from, setFrom]         = useState(null);
  const [to, setTo]             = useState(null);
  const [toInput, setToInput]   = useState('');
  const [route, setRoute]       = useState(null);
  const [routeSafe, setRouteSafe] = useState(false);   // true = route came from the backend (avoids reported areas)
  const [pickMode, setPickMode] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [info, setInfo]         = useState(null);
  const [showShops, setShowShops] = useState(true);
  const [follow, setFollow]       = useState(false);   // map follows your live position
  const [suggestions, setSuggestions] = useState([]);   // places found for the typed destination
  const [searched, setSearched]     = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [progress, setProgress]     = useState(null);    // { point, idx, remainingM, dist, bearing }
  const [navNote, setNavNote]       = useState(null);
  const lastIdx     = useRef(0);
  const offCount    = useRef(0);
  const rerouting   = useRef(false);
  const lastReroute = useRef(0);
  const navBearing  = useRef(0);
  const cum = useMemo(() => (route && route.length > 1 ? buildCum(route) : null), [route]);
  const [shopStatus, setShopStatus] = useState({ state: 'idle' });

  const closePanel = () => setOpen(false);

  const useMyLocation = () => {
    if (!userPos) return setError(geoError || 'Locația nu este încă disponibilă.');
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

  // Search the typed destination and show the matches (nothing is chosen for you).
  const findDestination = async () => {
    if (!toInput.trim()) { setError('Type where you want to go.'); return []; }
    setLoading(true); setError(null); setSuggestions([]); setSearched(false);
    try {
      const found = await searchPlaces(toInput, userPos || from || null);
      setSuggestions(found); setSearched(true);
      if (!found.length) setError('No place found. Try adding the city or a more specific name.');
      return found;
    } catch (e) { setError(e.message); return []; }
    finally { setLoading(false); }
  };
  const chooseDestination = (place) => {
    setTo(place); setToInput(place.label);
    setSuggestions([]); setSearched(false); setError(null); setRoute(null);
  };  const calculate = async () => {
    setError(null); setInfo(null);
    // start: your current location unless you picked another start point
    let start = from;
    if (!start && userPos) { start = { lat: userPos.lat, lng: userPos.lng, label: 'My location' }; setFrom(start); }
    if (!start) return setError(geoError || 'Your location is not available yet. Allow location access, or choose a start point on the map.');

    // destination: use the one you picked; otherwise search what you typed and use the best match
    let dest = to;
    if (!dest) {
      if (!toInput.trim()) return setError('Type where you want to go, or pick it on the map.');
      const found = await findDestination();
      if (!found.length) return undefined;
      if (found.length > 1) { setError('Several places match. Tap the right one in the list, then press Find route again.'); return undefined; }
      dest = found[0]; chooseDestination(dest);
    }

    setLoading(true);
    try {
      // The route is always computed by the backend (it keeps the routing key private).
      if (!safe) throw new Error('Sign in with an account to calculate a route.');
      const r = await fetchSafeRoute(start, dest);
      setRoute(r.points);
      setRouteSafe(true);
      setInfo(r.text);
      closePanel();
    } catch (e) { setError(e.status !== undefined ? describeApiError(e, 'en') : e.message); }
    finally { setLoading(false); }
  };  const startNav = () => {
    if (!route || !cum) return;
    if (!userPos) { setError(geoError || 'Locația nu este încă disponibilă.'); return; }
    lastIdx.current = 0; offCount.current = 0; lastReroute.current = 0;
    setProgress(null); setNavNote(null); setError(null);
    setFollow(true); setNavigating(true);
    closePanel();
  };
  const stopNav = (note = null) => {
    setNavigating(false); setProgress(null); setNavNote(null);
    if (typeof note === 'string') setInfo(note);
  };

  // Progress along the route, arrival, and off-route detection with an automatic new route.
  useEffect(() => {
    if (!navigating) return;
    if (!route || !cum) { stopNav(); return; }
    if (!userPos) return;
    const total = cum[cum.length - 1];
    let s = snapToRoute(route, cum, userPos, lastIdx.current, lastIdx.current + 80);
    if (!s || s.dist > 100) s = snapToRoute(route, cum, userPos, 0, route.length - 2) || s;   // lost it: search everywhere
    if (!s) return;
    lastIdx.current = s.idx;
    const remaining = Math.max(0, total - s.along);
    const ahead = pointAtDistance(route, cum, Math.min(total, s.along + NAV_LOOKAHEAD_M));
    const b = remaining > 5 && haversine(s.point, ahead) * 1000 > 3 ? bearingDeg(s.point, ahead) : navBearing.current;
    navBearing.current = b;
    setProgress({ point: s.point, idx: s.idx, remainingM: remaining, dist: s.dist, bearing: b });

    if (remaining < NAV_ARRIVE_M) { stopNav('Ai ajuns la destinație 🎉'); return; }

    if (s.dist > NAV_OFF_ROUTE_M) {
      offCount.current += 1;
      if (offCount.current >= 3 && !rerouting.current && to && Date.now() - lastReroute.current > 20000) {
        rerouting.current = true; lastReroute.current = Date.now();
        setNavNote('Ai ieșit de pe traseu. Recalculez ruta…');
        fetchSafeRoute({ lat: userPos.lat, lng: userPos.lng }, to)
          .then((r) => {
            lastIdx.current = 0; offCount.current = 0;
            setRoute(r.points); setRouteSafe(true); setInfo(r.text);
            setNavNote('Ruta a fost recalculată.');
          })
          .catch((e) => {
            console.error('[nav] reroute failed:', e);
            setNavNote(`Nu am putut recalcula ruta: ${describeApiError(e, 'ro')}`);
          })
          .finally(() => { rerouting.current = false; });
      }
    } else {
      offCount.current = 0;
    }
  }, [userPos?.lat, userPos?.lng, navigating, route]); // eslint-disable-line react-hooks/exhaustive-deps
  const reset = () => {
    setNavigating(false); setProgress(null);
    setFrom(null); setTo(null); setToInput('');
    setRoute(null); setInfo(null); setError(null);
    closePanel();
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>

      {/* ── Harta ocupă tot fundalul ── */}
      <MapContainer center={[45.7537, 21.2257]} zoom={13} style={{ height: '100%', width: '100%' }}
        rotate={true} bearing={0} rotateControl={false} shiftKeyRotate={false} pitchDrag={false}>
        <TileLayer attribution="© OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler mode={pickMode} onPick={handleMapPick} />
        <FlyTo point={from ?? to ?? null} />

        {/* ── Locatia curenta: buburuza mica neagra ── */}
        <LocateControl userPos={userPos} follow={follow && !navigating} setFollow={setFollow} />
        <NavCamera active={navigating} target={progress?.point} bearing={progress?.bearing ?? 0} />
        {userPos && Number.isFinite(userPos.accuracy) && userPos.accuracy < 2000 && (
          <Circle center={[userPos.lat, userPos.lng]} radius={userPos.accuracy}
            pathOptions={{ color: '#1e88e5', weight: 1, fillColor: '#1e88e5', fillOpacity: 0.1 }} />
        )}
        {userPos && (
          <Marker position={[userPos.lat, userPos.lng]} icon={iconMe} zIndexOffset={1000} />
        )}

        {/* ── Route markers ── */}
        {from  && <Marker position={[from.lat, from.lng]} icon={iconFrom} />}
        {to    && <Marker position={[to.lat,   to.lng]}   icon={iconTo}   />}
        {route && !(navigating && progress) && (
          <Polyline positions={route.map(p => [p.lat, p.lng])} pathOptions={{ color: routeSafe ? '#00a846' : '#c62828', weight: 5 }} />
        )}
        {route && navigating && progress && (
          <>
            {/* already walked: faded */}
            <Polyline positions={[...route.slice(0, progress.idx + 1), progress.point].map(p => [p.lat, p.lng])}
              pathOptions={{ color: '#9e9e9e', weight: 5, opacity: 0.55, dashArray: '2 9' }} />
            {/* still to walk */}
            <Polyline positions={[progress.point, ...route.slice(progress.idx + 1)].map(p => [p.lat, p.lng])}
              pathOptions={{ color: routeSafe ? '#00a846' : '#c62828', weight: 6 }} />
          </>
        )}

        {/* ── Magazine non-stop (24/7) ── */}
        {showShops && <ShopsLayer anchor={userPos} onStatus={setShopStatus} signedIn={safe} />}

        {/* ── Report circles + directional arrows ── */}
        {deduplicateReports(reports.filter((r) => r.status !== 'resolved' && r.lat != null && r.lng != null))
          .map((r) => (
            <React.Fragment key={r.id}>
              {/* Zona colorata */}
              <Circle
                center={[r.lat, r.lng]}
                radius={reportCircleRadius(r.category)}
                pathOptions={reportCircleOptions(r.category)}
              />
              {/* Marker special doar pentru persoana periculoasa */}
              {r.category === 'Suspicious person' && (() => {
                const t = (r.text || '').toLowerCase();
                let icon;
                let state;
                if (/doarm|sleep|sleeping|dormit/.test(t)) {
                  icon = iconZ;   state = 'Doarme';
                } else if (/sta |stă |stationea|stood|standing|nu se misc|nu se miș/.test(t)) {
                  icon = iconDot; state = 'Stă pe loc';
                } else if (r.direction) {
                  icon = makeArrowIcon(r.direction);
                  state = `Se deplasează: ${DIRECTION_LABEL[r.direction] ?? r.direction}`;
                } else {
                  icon = iconDot; state = 'Direcție necunoscută';
                }
                const when = r.createdAt ? new Date(r.createdAt) : null;
                return (
                  <Marker position={[r.lat, r.lng]} icon={icon}>
                    <Popup>
                      <b>Persoană suspectă</b><br />
                      {state}<br />
                      {r.text ? r.text : <i>Fără descriere</i>}
                      {when && !isNaN(when) && (
                        <><br /><small>{when.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</small></>
                      )}
                    </Popup>
                  </Marker>
                );
              })()}
            </React.Fragment>
          ))}
      </MapContainer>

      {/* ── Navigatie: pornire + bara de progres ── */}
      {route && !navigating && (
        <button type="button" className="nav-start" onClick={startNav}>▶ Pornește navigarea</button>
      )}
      {navigating && (
        <div className="nav-hud" role="status">
          <div className="nav-hud-main">
            <b>{fmtDist(progress?.remainingM)}</b>
            <span>· ~{progress ? Math.max(1, Math.ceil(progress.remainingM / WALK_M_PER_MIN)) : '…'} min</span>
            <button type="button" className="nav-stop" onClick={() => stopNav()}>■ Oprește</button>
          </div>
          {progress && progress.dist > NAV_OFF_ROUTE_M && !navNote && (
            <div className="nav-hud-note">Ești în afara traseului…</div>
          )}
          {navNote && <div className="nav-hud-note">{navNote}</div>}
        </div>
      )}
      {/* ── Locatie in timp real: buton + avertisment ── */}
      <button
        type="button"
        className={`locate-btn${follow ? ' on' : ''}`}
        onClick={() => setFollow((f) => !f)}
        disabled={!userPos}
        aria-pressed={follow}
        title={userPos ? 'Urmărește locația mea' : 'Locația nu este disponibilă'}
      >📍</button>
      {geoError && <div className="geo-warn" role="alert">{geoError}</div>}

      {/* ── Toggle magazine non-stop ── */}
      <button
        type="button"
        className={`shops-toggle${showShops ? ' on' : ''}`}
        onClick={() => setShowShops((s) => !s)}
        aria-pressed={showShops}
      >
        <span className="shop24 mini"><span>24</span></span>
        <span>
          Magazine non-stop
          {showShops && shopStatus.state === 'loading' && ' · se caută…'}
          {showShops && shopStatus.state === 'error'   && ' · indisponibil'}
          {showShops && shopStatus.state === 'ok'      && ` · ${shopStatus.count}`}
        </span>
      </button>

      {/* ── Overlay sus: titlu + toggle ── */}
      <div className="rt-top">
        <button className="rt-toggle" onClick={() => setOpen(o => !o)}>
          <span className="rt-title">Buburu</span>
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
              <div className="rt-search-row">
                <input
                  className="rt-input"
                  placeholder="Type an address or place…"
                  value={toInput}
                  autoComplete="off"
                  onChange={(e) => { setToInput(e.target.value); setTo(null); setRoute(null); setSuggestions([]); setSearched(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); findDestination(); } }}
                />
                <button type="button" className="rt-search-btn" onClick={findDestination} disabled={loading || !toInput.trim()}>
                  Search
                </button>
              </div>
              {to && <div className="rt-chosen">✔ {to.label}</div>}
              {!to && suggestions.length > 0 && (
                <ul className="rt-suggestions" role="listbox" aria-label="Matching places">
                  {suggestions.map((s, i) => (
                    <li key={`${s.lat},${s.lng},${i}`}>
                      <button type="button" role="option" onClick={() => chooseDestination(s)}>📍 {s.label}</button>
                    </li>
                  ))}
                </ul>
              )}              <div className="rt-actions">
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

// Rapoartele din aceeasi categorie la mai putin de 15m se contopesc intr-unul singur.
// Ramane cel cu informatie (directie / descriere); la egalitate, cel mai nou.
const reportScore = (r) => (r.direction ? 2 : 0) + (r.text ? 1 : 0);
const reportTime  = (r) => {
  const ms = r.createdAt ? new Date(r.createdAt).getTime() : NaN;
  return Number.isNaN(ms) ? Number(r.id) || 0 : ms;
};
const isBetterReport = (a, b) =>
  reportScore(a) !== reportScore(b) ? reportScore(a) > reportScore(b) : reportTime(a) > reportTime(b);

function deduplicateReports(reports, thresholdM = 15) {
  const kept = [];
  for (const r of reports) {
    const i = kept.findIndex(
      (k) => k.category === r.category && haversine(r, k) * 1000 < thresholdM
    );
    if (i === -1) kept.push(r);
    else if (isBetterReport(r, kept[i])) kept[i] = r;
  }
  return kept;
}
