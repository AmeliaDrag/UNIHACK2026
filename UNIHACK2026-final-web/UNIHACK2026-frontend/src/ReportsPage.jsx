import { useEffect, useState } from 'react';
import { api, describeApiError } from './api';
import FriendsSection from './FriendsSection';
import { saveNote } from './reportNotes';

const CATS = ['Poor lighting', 'Suspicious person', 'Isolated area', 'Damaged road', 'Other'];
const OK = 3;

// ── AI: extrage directia din textul liber ────────────────────────────────────
// Returneaza 'left' | 'right' | 'north' | 'south' | null
function extractDirectionFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  // Romana
  if (/spre\s+(vest|apus|stânga|stanga)/.test(t) || /\b(stânga|stanga|vest|apus)\b/.test(t)) return 'left';
  if (/spre\s+(est|răsărit|rasarit|dreapta)/.test(t) || /\b(dreapta|est|răsărit|rasarit)\b/.test(t)) return 'right';
  if (/spre\s*nord/.test(t) || /\bnord\b/.test(t)) return 'north';
  if (/spre\s*sud/.test(t)  || /\bsud\b/.test(t))  return 'south';

  // Engleza
  if (/\b(left|west)\b/.test(t))  return 'left';
  if (/\b(right|east)\b/.test(t)) return 'right';
  if (/\bnorth\b/.test(t))        return 'north';
  if (/\bsouth\b/.test(t))        return 'south';

  // Abrevieri cardinale
  if (/\bv\b/.test(t) || /\bw\b/.test(t)) return 'left';
  if (/\be\b/.test(t))                    return 'right';
  if (/\bn\b/.test(t))                    return 'north';
  if (/\bs\b/.test(t))                    return 'south';

  return null;
}

function directionLabel(dir) {
  const map = { left: '⬅ stânga / vest', right: 'dreapta / est ➡', north: '⬆ nord', south: '⬇ sud' };
  return map[dir] ?? dir;
}

function MiniBug({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="15" rx="9" ry="8" fill="#c62828"/>
      <line x1="12" y1="7" x2="12" y2="23" stroke="#111" strokeWidth="1.2"/>
      <ellipse cx="12" cy="7" rx="4" ry="2.5" fill="#111"/>
      <circle cx="8"  cy="14" r="2"   fill="#111" opacity="0.5"/>
      <circle cx="16" cy="14" r="2"   fill="#111" opacity="0.5"/>
      <circle cx="9"  cy="19" r="1.5" fill="#111" opacity="0.4"/>
      <circle cx="15" cy="19" r="1.5" fill="#111" opacity="0.4"/>
    </svg>
  );
}

export default function ReportsPage({ uid, isMod, isGuest, reports, pos, reload, addReport }) {
  const [cat, setCat]     = useState(CATS[0]);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone]   = useState(false);
  const [text, setText]   = useState('');
  const [aiDirection, setAiDirection] = useState(null); // detected from the text
  const [aiStatus, setAiStatus]       = useState('');   // message under the textarea

  // AI: read the direction out of the description (Suspicious person only)
  useEffect(() => {
    if (cat !== 'Suspicious person') { setAiDirection(null); setAiStatus(''); return; }
    const dir = extractDirectionFromText(text);
    if (dir) {
      setAiDirection(dir);
      setAiStatus(`🤖 AI detectat: ${directionLabel(dir)}`);
    } else if (text.trim().length > 5) {
      setAiDirection(null);
      setAiStatus('🤖 Nu am detectat o direcție în text. Menționează (ex: „mergea spre stânga", „se deplasa spre nord").');
    } else {
      setAiDirection(null);
      setAiStatus('');
    }
  }, [text, cat]);

  // The backend only accepts { type, latitude, longitude }. Block Submit until the
  // location is a real, finite number.
  const hasLocation = !!pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lng);

  const send = async () => {
    if (!hasLocation || busy) return;
    setBusy(true); setError(null); setDone(false);
    try {
      const direction = cat === 'Suspicious person' ? aiDirection : null;
      const note = text.trim();
      const created = await addReport({ category: cat, text: note, lat: pos.lat, lng: pos.lng, direction });
      // The backend stores only type/lat/lng, so keep text + direction on this device.
      if (created?.id != null && (note || direction)) {
        saveNote(created.id, { text: note, direction });
        reload();
      }
      setText(''); setAiDirection(null); setAiStatus('');
      setDone(true);
    } catch (e) {
      setError(describeApiError(e, 'en'));
    } finally {
      setBusy(false);
    }
  };

  // Confirm / resolve exist only in guest (mock) mode; the backend has no such endpoints.
  const act = async (f) => {
    try { await f(); reload(); } catch (e) { setError(describeApiError(e, 'en')); }
  };

  const when = (r) => {
    const d = r.createdAt ? new Date(r.createdAt) : null;
    return d && !isNaN(d) ? d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Report ── */}
      <div className="lb-section">
        <h2 className="lb-section-title">Report a problem</h2>

        <select
          className="lb-input"
          value={cat}
          onChange={(e) => { setCat(e.target.value); setDone(false); setError(null); }}
        >
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>

        <textarea
          className="lb-input"
          placeholder={
            cat === 'Suspicious person'
              ? 'Descrie situația. Menționează direcția (ex: „mergea spre stânga / nord").'
              : "What's happening? (optional)"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />

        {cat === 'Suspicious person' && aiStatus && (
          <div style={{
            fontSize: '0.82rem', padding: '8px 10px', borderRadius: '8px', marginTop: '-4px',
            background: aiDirection ? 'rgba(198,40,40,0.1)' : 'rgba(100,100,100,0.1)',
            color: aiDirection ? '#c62828' : '#666',
          }}>
            {aiStatus}
          </div>
        )}

        <p className="lb-sub-text">
          The report is saved at your current location. The description and the direction arrow stay on this device.
        </p>
        {!hasLocation && (
          <div className="lb-msg bad">Waiting for your location. Allow location access in the browser.</div>
        )}
        {error && <div className="lb-msg bad" role="alert">{error}</div>}
        {done && <div className="lb-msg ok">Report submitted. Thank you!</div>}

        <button type="button" className="lb-btn" onClick={send} disabled={!hasLocation || busy}>
          {busy ? 'Sending…' : 'Submit report'}
        </button>
      </div>

      <FriendsSection uid={uid} isGuest={isGuest} />

      {/* ── Recent reports ── */}
      <div className="lb-section">
        <h2 className="lb-section-title">Recent reports</h2>
        {reports.length === 0 && <p className="lb-empty">No reports yet. The first one could be yours.</p>}
        {reports.map((r) => {
          const n = r.confirmations?.length || 0;
          return (
            <div className="lb-card" key={r.id}>
              <b>{r.category}</b>{' '}
              {isGuest && (r.status === 'resolved' ? '(resolved)' : n >= OK ? '(confirmed)' : '')}
              {r.direction && (
                <span className="dir-badge"> · {directionLabel(r.direction)}</span>
              )}
              {r.text && <p>{r.text}</p>}
              {!isGuest && <><br /><small>{when(r)}</small></>}
              {isGuest && (
                <>
                  <br /><small>{n}/{OK} confirmations</small><br />
                  {r.status !== 'resolved' && !r.confirmations?.includes(uid) && (
                    <button className="lb-btn-sm" onClick={() => act(() => api.confirmReport(r.id, uid))}>Confirm</button>
                  )}
                  {isMod && r.status !== 'resolved' && (
                    <button className="lb-btn-sm" onClick={() => act(() => api.resolveReport(r.id))}>Mark resolved</button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}