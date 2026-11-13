/**
 * api.js — data access layer backed by json-server (db.json).
 *
 * json-server runs on port 3001. Vite proxies /api → http://localhost:3001
 * so CORS is never an issue in dev.
 *
 * Function signatures are stable — when Spring Boot is ready, replace each
 * function body with the real fetch call, nothing else changes.
 */

const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const get  = (path)       => req('GET',    path);
const post = (path, body) => req('POST',   path, body);
const put  = (path, body) => req('PUT',    path, body);
const del  = (path)       => req('DELETE', path);

// json-server uses _sort / _order query params
// and returns arrays for collections.

export const api = {
  // ── Reports ───────────────────────────────────────────────────────────────
  listReports: () =>
    get('/reports?_sort=createdAt&_order=desc&_limit=100'),

  addReport: (r) =>
    post('/reports', { ...r, confirmations: [], status: 'open', createdAt: Date.now() }),

  confirmReport: async (id, uid) => {
    const report = await get(`/reports/${id}`);
    const confirmations = [...new Set([...(report.confirmations ?? []), uid])];
    return put(`/reports/${id}`, { ...report, confirmations });
  },

  resolveReport: async (id) => {
    const report = await get(`/reports/${id}`);
    return put(`/reports/${id}`, { ...report, status: 'resolved' });
  },

  // ── Trusted contacts ──────────────────────────────────────────────────────
  listContacts: (uid) =>
    get(`/contacts?uid=${encodeURIComponent(uid)}`),

  addContact: (c) =>
    post('/contacts', c),

  removeContact: (id) =>
    del(`/contacts/${id}`),

  // ── Location sharing ──────────────────────────────────────────────────────
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
    // json-server has no real-time; poll every 5 s
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

  // ── SOS alerts ────────────────────────────────────────────────────────────
  sendAlert: (a) =>
    post('/alerts', { ...a, createdAt: Date.now() }),

  // ── Chat ──────────────────────────────────────────────────────────────────
  listMessages: (room, after) => {
    let url = `/messages?room=${encodeURIComponent(room)}&_sort=createdAt&_order=asc`;
    if (after) url += `&createdAt_gte=${encodeURIComponent(after)}`;
    return get(url);
  },

  sendMessage: (msg) =>
    post('/messages', { ...msg, createdAt: Date.now() }),
};
