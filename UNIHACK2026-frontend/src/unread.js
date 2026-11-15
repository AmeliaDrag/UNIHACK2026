import { useSyncExternalStore } from 'react';
import { backendApi } from './api';

// Unread chat messages. One request ("what was sent to me?") covers all friends.
// "Read" marks live on this device: for each friend, the id of the last message you saw.

const POLL_MS = 8000;

let uid = null;
let marks = {};          // senderId -> id of the last message I have read
let counts = {};         // senderId -> number of unread messages
let lastId = null;       // highest received message id seen so far (null = not loaded yet)
let hadStored = false;   // marks came from a previous session
let snapshot = { total: 0, counts: {} };
const listeners = new Set();

const keyOf = (u) => `chatRead:${u}`;

function publish() {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  snapshot = { total, counts: { ...counts } };
  listeners.forEach((l) => l());
}

function persist() {
  try { localStorage.setItem(keyOf(uid), JSON.stringify({ baseline: true, marks })); } catch { /* storage blocked */ }
}

export function resetUnread(newUid) {
  if (newUid === uid) return;
  uid = newUid;
  marks = {}; counts = {}; lastId = null; hadStored = false;
  if (uid) {
    try {
      const s = JSON.parse(localStorage.getItem(keyOf(uid)) || 'null');
      if (s?.baseline) { marks = s.marks || {}; hadStored = true; }
    } catch { /* ignore corrupt data */ }
  }
  publish();
}

const isNew = (m) => Number(m.id) > (Number(marks[m.senderId]) || 0);

export async function pollUnread() {
  if (!uid) return;
  const me = uid;
  const first = lastId == null;
  let data;
  try {
    data = await backendApi.receivedMessages(first ? null : lastId);
  } catch (e) {
    console.error('[unread] poll failed:', e);
    return;
  }
  if (me !== uid || !Array.isArray(data)) return;
  const ids = data.map((m) => Number(m.id)).filter(Number.isFinite);
  const maxId = ids.length ? Math.max(...ids) : null;

  if (first) {
    const maxMark = Math.max(0, ...Object.values(marks).map(Number).filter(Number.isFinite));
    const serverWasReset = maxId != null && maxId < maxMark;
    if (!hadStored || data.length === 0 || serverWasReset) {
      // First run on this device (or the server's data was reset): what exists counts as read.
      marks = {};
      data.forEach((m) => { marks[m.senderId] = Math.max(Number(marks[m.senderId]) || 0, Number(m.id)); });
      counts = {};
      hadStored = true;
      persist();
    } else {
      counts = {};
      data.forEach((m) => { if (isNew(m)) counts[m.senderId] = (counts[m.senderId] || 0) + 1; });
    }
    lastId = maxId ?? 0;
  } else {
    data.forEach((m) => { if (isNew(m)) counts[m.senderId] = (counts[m.senderId] || 0) + 1; });
    if (maxId != null) lastId = Math.max(lastId, maxId);
  }
  publish();
}

// Call when a conversation is on screen: everything up to upToId is read.
export function markChatRead(friendId, upToId) {
  if (!uid) return;
  const id = Number(upToId);
  if (!Number.isFinite(id)) return;
  let changed = false;
  if (id > (Number(marks[friendId]) || 0)) { marks[friendId] = id; persist(); changed = true; }
  if (counts[friendId]) { delete counts[friendId]; changed = true; }
  if (changed) publish();
}

export function startUnreadPolling(newUid) {
  resetUnread(newUid);
  pollUnread();
  const timer = setInterval(() => { if (document.visibilityState === 'visible') pollUnread(); }, POLL_MS);
  const onVisible = () => { if (document.visibilityState === 'visible') pollUnread(); };
  document.addEventListener('visibilitychange', onVisible);
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
}

const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
const getSnapshot = () => snapshot;

/** { total, counts: { [friendId]: n } } - re-renders when it changes. */
export function useUnread() {
  return useSyncExternalStore(subscribe, getSnapshot);
}