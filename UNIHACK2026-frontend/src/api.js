/**
 * api.js — two data-access layers:
 *
 *  1. `api`        — json-server mock (port 3001 via /api proxy). Used by
 *                    guest mode and dev features (friends, shares, chat).
 *
 *  2. `backendApi` — Spring Boot REST (port 8081 via /api/v1 proxy).
 *                    Requires a Bearer access token supplied by setTokenProvider().
 *
 * Call setTokenProvider(fn) once after Auth0 login.
 * fn must be an async function that resolves to a valid access-token string.
 */

// ── Token provider ────────────────────────────────────────────────────────────
let _tokenProvider = null;

export function setTokenProvider(fn) {
  _tokenProvider = fn;
}

export function clearTokenProvider() {
  _tokenProvider = null;
}

async function getBearerToken() {
  if (!_tokenProvider) throw new Error('No token provider set. Call setTokenProvider() after login.');
  return _tokenProvider();
}

// ── json-server mock API (/api proxy → port 3001) ────────────────────────────
const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    console.error(`[mock-api] ${method} ${BASE}${path} -> ${res.status}`, { requestBody: body, response: text });
    const err = new Error(text || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

const get  = (path)       => req('GET',    path);
const post = (path, body) => req('POST',   path, body);
const put  = (path, body) => req('PUT',    path, body);
const del  = (path)       => req('DELETE', path);

export const api = {
  // ── Reports (mock) ──────────────────────────────────────────────────────────
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

  // ── Trusted contacts (mock) ─────────────────────────────────────────────────
  listContacts: (uid) =>
    get(`/contacts?uid=${encodeURIComponent(uid)}`),

  addContact: (c) =>
    post('/contacts', c),

  removeContact: (id) =>
    del(`/contacts/${id}`),

  // ── Location sharing (mock) ─────────────────────────────────────────────────
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

  // ── SOS alerts (mock) ───────────────────────────────────────────────────────
  sendAlert: (a) =>
    post('/alerts', { ...a, createdAt: Date.now() }),

  // ── Chat (mock) ─────────────────────────────────────────────────────────────
  listMessages: (room, after) => {
    let url = `/messages?room=${encodeURIComponent(room)}&_sort=createdAt&_order=asc`;
    if (after) url += `&createdAt_gte=${encodeURIComponent(after)}`;
    return get(url);
  },

  sendMessage: (msg) =>
    post('/messages', { ...msg, createdAt: Date.now() }),

  // ── Friends (mock) ──────────────────────────────────────────────────────────
  listFriends: (uid) =>
    get(`/friends?uid=${encodeURIComponent(uid)}`),

  addFriend: (f) =>
    post('/friends', { ...f, createdAt: Date.now() }),

  removeFriend: (id) =>
    del(`/friends/${id}`),
};

// ── Readable error text for the UI. lang: 'en' | 'ro' ─────────────────────────
const ERR_TEXT = {
  en: {
    net: 'Cannot reach the server (network or CORS problem).',
    401: 'Your session is not valid. Sign out and sign in again.',
    400: 'Invalid request', 403: 'Not allowed', 404: 'Not found',
    409: 'Conflict', 500: 'Server error', other: 'Something went wrong',
  },
  ro: {
    net: 'Conexiunea la server a eșuat (rețea sau CORS).',
    401: 'Sesiune invalidă. Deconectează-te și autentifică-te din nou.',
    400: 'Cerere invalidă', 403: 'Acces interzis', 404: 'Negăsit',
    409: 'Conflict', 500: 'Eroare de server', other: 'A apărut o eroare',
  },
};

/** status 0 = real network failure; otherwise the HTTP status + the server's "message". */
export function describeApiError(err, lang = 'en') {
  const t = ERR_TEXT[lang] || ERR_TEXT.en;
  const status = err?.status;
  const server = err?.message;
  if (status === 0) return t.net;
  if (status === 401) return t[401];
  if (status && t[status]) return server ? `${t[status]}: ${server}` : t[status];
  return server || t.other;
}
// ── Spring Boot authenticated API (/api/v1 proxy → port 8081) ─────────────────

// VITE_API_BASE_URL is the backend origin only (no trailing slash, no /api/v1),
// e.g. http://localhost:8081. A trailing "/" or "/api/v1" is tolerated.
// If it is empty, requests stay relative and go through the Vite /api/v1 proxy.
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api\/v1$/, '');
const API_BASE = `${API_ORIGIN}/api/v1`;

async function authReq(method, path, body) {
  const token = await getBearerToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const url = `${API_BASE}${path}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (netErr) {
    console.error(`[api] ${method} ${url} -> network error`, { requestBody: body }, netErr);
    const err = new Error(`Cannot reach the backend at ${url}`);
    err.status = 0; err.url = url;
    throw err;
  }

  if (!res.ok) {
    // Read the body once as text, then try JSON.
    const raw = await res.text().catch(() => '');
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { /* not JSON */ }
    console.error(`[api] ${method} ${url} -> ${res.status}`, { requestBody: body, response: parsed ?? raw });
    const err = new Error((parsed && parsed.message) || raw.trim().slice(0, 200) || `HTTP ${res.status}`);
    err.status = res.status; err.url = url; err.body = parsed ?? raw;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}
const bGet    = (path)        => authReq('GET',   path);
const bPost   = (path, body)  => authReq('POST',  path, body);
const bPut    = (path, body)  => authReq('PUT',   path, body);
const bPatch  = (path)        => authReq('PATCH', path);
const bDelete = (path)        => authReq('DELETE', path);

export const backendApi = {
  // ── User profile ────────────────────────────────────────────────────────────
  getMe: ()       => bGet('/users/me'),
  updateMe: (dto) => bPut('/users/me', dto),

  // ── Reports ─────────────────────────────────────────────────────────────────
  listReports: ()    => bGet('/reports'),
  addReport:   (dto) => bPost('/reports', dto),

  // ── Trusted contacts ────────────────────────────────────────────────────────
  sentContacts:     ()   => bGet('/trusted-contacts/sent'),
  receivedContacts: ()   => bGet('/trusted-contacts/received'),
  addContact:       (dto) => bPost('/trusted-contacts', dto),
  acceptContact:    (id)  => bPatch(`/trusted-contacts/${id}/accept`),
  deleteContact:    (id)  => bDelete(`/trusted-contacts/${id}`),

  // -- Friends + in-app chat (accepted friends only) --
  listFriends:  ()                   => bGet('/friends'),
  sendMessage:  (dto)                => bPost('/messages', dto),
  receivedMessages: (afterId)        =>
    bGet('/messages/received' + (afterId != null ? `?afterId=${encodeURIComponent(afterId)}` : '')),
  messagesWith: (friendId, afterId)  =>
    bGet(`/messages/with/${encodeURIComponent(friendId)}` +
         (afterId != null ? `?afterId=${encodeURIComponent(afterId)}` : '')),
  // ── SOS ─────────────────────────────────────────────────────────────────────
  sendSos:    (dto) => bPost('/sos', dto),
  mySos:      ()    => bGet('/sos/mine'),
  receivedSos:()    => bGet('/sos/received'),
  resolveSos: (id)  => bPatch(`/sos/${id}/resolve`),

  // ── Routes ──────────────────────────────────────────────────────────────────
  getRoute: (dto) => bPost('/routes', dto),
};
