// Description + direction are not stored by the backend (it only keeps type, latitude,
// longitude). They are kept on this device, keyed by the report id the backend returned.
const KEY = 'reportNotes';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

export function loadNote(id) {
  const n = read()[id];
  return n ? { text: n.text || undefined, direction: n.direction || undefined } : {};
}

export function saveNote(id, note) {
  const all = read();
  all[id] = note;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage full or blocked */ }
}