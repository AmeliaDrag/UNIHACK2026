/**
 * api.js — data access layer backed by the Spring Boot backend.
 *
 * All calls go to /api/v1/... (proxied to http://localhost:8080 in dev).
 *
 * In dev mode (VITE_AUTH_MODE=dev) no token is sent.
 * In auth mode a Bearer token is injected via api.init(getTokenFn).
 *
 * Usage:
 *   import { api } from './api';
 *   api.init(getAccessToken);   // call once after auth is set up
 */

import { config } from './config';

const BASE = '/api/v1';

let _getToken = null;

/**
 * Set the token getter function for auth mode.
 * @param {(() => Promise<string|null>)|null} getTokenFn
 */
function init(getTokenFn) {
  _getToken = getTokenFn;
}

async function req(method, path, body) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject Bearer token when in auth mode and a getter is set
  if (config.authMode === 'auth' && _getToken) {
    try {
      const token = await _getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // If token fetch fails, proceed without token (let server reject if needed)
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return null;

  if (!res.ok) {
    // Try to parse structured error body {status, error, message}
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const errBody = await res.json();
        throw new Error(errBody.message || errBody.error || `HTTP ${res.status}`);
      } catch (e) {
        if (e instanceof SyntaxError) throw new Error(`HTTP ${res.status}`);
        throw e;
      }
    } else {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  // Some 2xx responses may have no body
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;

  return res.json();
}

const get    = (path)        => req('GET',    path);
const post   = (path, body)  => req('POST',   path, body);
const put    = (path, body)  => req('PUT',    path, body);
const patch  = (path, body)  => req('PATCH',  path, body);
const del    = (path)        => req('DELETE', path);

export const api = {
  init,

  // ── User ─────────────────────────────────────────────────────────────────
  /** GET /api/v1/users/me */
  getMe: () =>
    get('/users/me'),

  /** PUT /api/v1/users/me */
  updateMe: ({ name, phoneNumber }) =>
    put('/users/me', { name, phoneNumber }),

  // ── Reports ──────────────────────────────────────────────────────────────
  /** GET /api/v1/reports */
  listReports: () =>
    get('/reports'),

  /**
   * POST /api/v1/reports
   * @param {{ type: string, latitude: number, longitude: number }} report
   */
  addReport: ({ type, latitude, longitude }) =>
    post('/reports', { type, latitude, longitude }),

  // ── Trusted contacts ─────────────────────────────────────────────────────
  /** GET /api/v1/trusted-contacts/sent */
  getSentContacts: () =>
    get('/trusted-contacts/sent'),

  /** GET /api/v1/trusted-contacts/received */
  getReceivedContacts: () =>
    get('/trusted-contacts/received'),

  /**
   * POST /api/v1/trusted-contacts
   * @param {{ contactEmail: string }} contact
   */
  addContact: ({ contactEmail }) =>
    post('/trusted-contacts', { contactEmail }),

  /** PATCH /api/v1/trusted-contacts/:id/accept */
  acceptContact: (id) =>
    patch(`/trusted-contacts/${id}/accept`),

  /** DELETE /api/v1/trusted-contacts/:id  (204, no body) */
  deleteContact: (id) =>
    del(`/trusted-contacts/${id}`),

  // ── SOS alerts ───────────────────────────────────────────────────────────
  /** POST /api/v1/sos */
  sendSos: ({ latitude, longitude }) =>
    post('/sos', { latitude, longitude }),

  /** GET /api/v1/sos/mine */
  getMySos: () =>
    get('/sos/mine'),

  /** GET /api/v1/sos/received */
  getReceivedSos: () =>
    get('/sos/received'),

  /** PATCH /api/v1/sos/:id/resolve */
  resolveSos: (id) =>
    patch(`/sos/${id}/resolve`),

  // ── Routes ───────────────────────────────────────────────────────────────
  /**
   * POST /api/v1/routes
   * @param {{ origin: {latitude, longitude}, destination: {latitude, longitude} }} params
   * @returns {{ geometry, distanceMeters, durationSeconds, avoidanceApplied, avoidanceLimited, warning }}
   */
  getRoute: ({ origin, destination }) =>
    post('/routes', { origin, destination }),

  // ── Chat (json-server / Firebase — kept for ChatPage compatibility) ──────
  listMessages: (room, after) => {
    // ChatPage uses this; it talks to Firebase directly via firebase.js,
    // but ChatPage calls api.listMessages. Keep a stub that delegates through
    // the same /api path so ChatPage continues to work if the server has it,
    // or fails gracefully otherwise.
    let url = `/messages?room=${encodeURIComponent(room)}&_sort=createdAt&_order=asc`;
    if (after) url += `&createdAt_gte=${encodeURIComponent(after)}`;
    return get(url);
  },

  sendMessage: (msg) =>
    post('/messages', { ...msg, createdAt: Date.now() }),

  // ── Location sharing (kept for SharePage / TrackPage compatibility) ──────
  listContacts: (uid) =>
    get(`/contacts?uid=${encodeURIComponent(uid)}`),

  addContact_legacy: (c) =>
    post('/contacts', c),

  removeContact: (id) =>
    del(`/contacts/${id}`),

  startShare: async (s) => {
    const rec = await post('/shares', { ...s, active: true, createdAt: Date.now() });
    return rec.id;
  },

  updateShare: async (id, pos) => {
    const share = await get(`/shares/${id}`);
    return put(`/shares/${id}`, { ...share, pos, updatedAt: Date.now() });
  },

  stopShare: async (id) => {
    const share = await get(`/shares/${id}`);
    return put(`/shares/${id}`, { ...share, active: false });
  },

  watchShare: (id, cb) => {
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await get(`/shares/${id}`);
        if (!cancelled) cb(data);
      } catch {
        if (!cancelled) cb(null);
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  },
};
