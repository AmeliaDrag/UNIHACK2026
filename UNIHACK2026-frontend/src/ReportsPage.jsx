import { useState } from 'react';
import { api } from './api';

// ── Category display label ↔ backend enum type ───────────────────────────────
const CATEGORIES = [
  { label: 'Poor lighting',    type: 'LOW_LIGHT'        },
  { label: 'Suspicious person', type: 'SUSPICIOUS_PERSON' },
  { label: 'Isolated area',    type: 'ISOLATED_AREA'    },
  { label: 'Damaged road',     type: 'DAMAGED_ROAD'     },
  { label: 'Other',            type: 'OTHER'            },
];

const TYPE_TO_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.type, c.label]));

function displayLabel(r) {
  return TYPE_TO_LABEL[r.type] || r.type || r.category || 'Unknown';
}

function formatExpiry(expiresAt) {
  if (!expiresAt) return null;
  try {
    return new Date(expiresAt).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export default function ReportsPage({ pos, reports, reload }) {
  const [cat, setCat]   = useState(CATEGORIES[0].type);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);
  const [ok,   setOk]   = useState(false);

  const send = async () => {
    if (!pos) return setErr('Enable location to submit a report.');
    setBusy(true); setErr(null); setOk(false);
    try {
      await api.addReport({ type: cat, latitude: pos.lat, longitude: pos.lng });
      setOk(true);
      reload();
      setTimeout(() => setOk(false), 2500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Report form ── */}
      <div className="lb-section">
        <h2 className="lb-section-title">Report a problem</h2>

        <select
          className="lb-input"
          value={cat}
          onChange={(e) => { setCat(e.target.value); setErr(null); setOk(false); }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.type} value={c.type}>{c.label}</option>
          ))}
        </select>

        {err && <p style={{ color: '#c62828', margin: 0, fontSize: '0.9rem' }}>{err}</p>}
        {ok  && <p style={{ color: '#2e7d32', margin: 0, fontSize: '0.9rem' }}>✓ Report submitted</p>}

        <button className="lb-btn" onClick={send} disabled={busy}>
          {busy ? 'Sending…' : 'Submit report'}
        </button>
      </div>

      {/* ── Recent reports ── */}
      <div className="lb-section">
        <h2 className="lb-section-title">Recent reports</h2>
        {reports.length === 0 && (
          <p className="lb-empty">No reports yet. The first one could be yours.</p>
        )}
        {reports.map((r) => {
          const expiry = formatExpiry(r.expiresAt);
          return (
            <div className="lb-card" key={r.id}>
              <b>{displayLabel(r)}</b>
              {expiry && (
                <small style={{ marginLeft: 6, color: '#888' }}>· expires {expiry}</small>
              )}
              {r.latitude != null && r.longitude != null && (
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#666' }}>
                  {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
