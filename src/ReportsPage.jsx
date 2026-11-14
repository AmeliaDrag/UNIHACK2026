import { useEffect, useState } from 'react';
import { api } from './api';
import { analyzeDirection } from './ai';

const CATS = ['Poor lighting', 'Suspicious person', 'Isolated area', 'Damaged road', 'Other'];
const NEEDS_DIRECTION = ['Suspicious person', 'Isolated area'];
const OK = 3;

function MiniBug({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="15" rx="9" ry="8" fill="#c62828"/>
      <line x1="12" y1="7" x2="12" y2="23" stroke="#111" strokeWidth="1.2"/>
      <ellipse cx="12" cy="7" rx="4" ry="2.5" fill="#111"/>
      <circle cx="8" cy="14" r="2" fill="#111" opacity="0.5"/>
      <circle cx="16" cy="14" r="2" fill="#111" opacity="0.5"/>
      <circle cx="9" cy="19" r="1.5" fill="#111" opacity="0.4"/>
      <circle cx="15" cy="19" r="1.5" fill="#111" opacity="0.4"/>
    </svg>
  );
}

export default function ReportsPage({ uid, isMod, reports, pos, reload }) {
  const [cat, setCat]         = useState(CATS[0]);
  const [text, setText]       = useState('');
  const [anon, setAnon]       = useState(false);
  const [direction, setDirection] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiError, setAiError]     = useState(null);

  // Friends
  const [friends, setFriends] = useState([]);
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');

  const loadFriends = () => api.listFriends(uid).then(setFriends).catch(() => {});
  useEffect(() => { loadFriends(); }, [uid]);

  // Reset direction when category changes
  const onCatChange = (val) => {
    setCat(val);
    setDirection(null);
    setAiSuggestion(null);
    setAiError(null);
  };

  // ── AI: Auto-analyze text with Gemini (debounced 800ms after typing stops) ──
  useEffect(() => {
    if (!NEEDS_DIRECTION.includes(cat)) return;
    if (!text.trim() || text.trim().length < 3) return;

    const timer = setTimeout(async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const result = await analyzeDirection(text.trim());
        if (result) {
          setDirection(result);
          setAiSuggestion(result);
        } else {
          setAiSuggestion(null);
        }
      } catch {
        setAiError('AI analysis failed — pick direction manually.');
      } finally {
        setAiLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [cat, text]);

  const addFriend = async () => {
    if (!fName.trim()) return alert('Enter a friend name.');
    try {
      await api.addFriend({ uid, name: fName.trim(), phone: fPhone.trim() || null });
      setFName(''); setFPhone('');
      loadFriends();
    } catch (e) { alert(e.message); }
  };

  const removeFriend = async (id) => {
    try { await api.removeFriend(id); loadFriends(); }
    catch (e) { alert(e.message); }
  };

  const act = async (f) => {
    try { await f(); reload(); } catch (e) { alert(e.message); }
  };

  const send = () => {
    if (!pos) return alert('Enable location to report.');
    if (NEEDS_DIRECTION.includes(cat) && !direction) {
      return alert('Write a description so the AI can detect the direction.');
    }
    act(async () => {
      await api.addReport({
        category: cat,
        text: text.trim(),
        lat: pos.lat, lng: pos.lng,
        author: anon ? null : uid,
        direction: NEEDS_DIRECTION.includes(cat) ? direction : null,
      });
      setText('');
      setDirection(null);
      setAiSuggestion(null);
      setAiError(null);
    });
  };

  const showDirection = NEEDS_DIRECTION.includes(cat);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── Report ── */}
      <div className="lb-section">
        <h2 className="lb-section-title">Report a problem</h2>
        <select className="lb-input" value={cat} onChange={(e) => onCatChange(e.target.value)}>
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <textarea
          className="lb-input"
          placeholder="What's happening? (optional)"
          value={text}
          onChange={(e) => { setText(e.target.value); setAiSuggestion(null); setAiError(null); }}
          rows={3}
        />

        {/* ── AI Direction Picker ── */}
        {showDirection && (
          <div className="dir-picker">
            <div className="dir-label">
              🤖 {aiLoading ? 'AI analyzing your description…' : 'Which way is the suspect moving?'}
              {aiSuggestion && !aiLoading && (
                <span className="dir-ai-hint">
                  ✅ AI detected: {aiSuggestion === 'left' ? '⬅ left' : 'right ➡'}
                </span>
              )}
            </div>

            {aiError && <div className="dir-ai-error">{aiError}</div>}

            {/* Direction display */}
            <div className="dir-buttons">
              <div className={`dir-display${direction === 'left' ? ' dir-display-active' : ''}`}>
                <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
                  <path d="M18 6 L8 14 L18 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span>Left</span>
              </div>
              <span className="dir-or">or</span>
              <div className={`dir-display${direction === 'right' ? ' dir-display-active' : ''}`}>
                <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
                  <path d="M10 6 L20 14 L10 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span>Right</span>
              </div>
            </div>
          </div>
        )}

        <label className="lb-check">
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
          Report anonymously
        </label>
        <button className="lb-btn" onClick={send}>Submit report</button>
      </div>

      {/* ── Friends ── */}
      <div className="lb-section">
        <h2 className="lb-section-title">🐞 Ladybug Friends</h2>
        <p className="lb-sub-text">Add friends to see their reports and send them alerts.</p>

        <div className="lb-friend-list">
          {friends.length === 0 && <p className="lb-empty">No friends yet.</p>}
          {friends.map((f) => (
            <div className="lb-friend-card" key={f.id}>
              <MiniBug />
              <div className="lb-friend-info">
                <b>{f.name}</b>
                {f.phone && <small>{f.phone}</small>}
              </div>
              <button className="lb-friend-remove" onClick={() => removeFriend(f.id)}>✕</button>
            </div>
          ))}
        </div>

        <div className="lb-friend-add">
          <input className="lb-input" placeholder="Name" value={fName} onChange={(e) => setFName(e.target.value)} />
          <input className="lb-input" placeholder="Phone (optional)" inputMode="tel" value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
          <button className="lb-btn" onClick={addFriend}>＋ Add friend</button>
        </div>
      </div>

      {/* ── Recent reports ── */}
      <div className="lb-section">
        <h2 className="lb-section-title">Recent reports</h2>
        {reports.length === 0 && <p className="lb-empty">No reports yet. The first one could be yours.</p>}
        {reports.map((r) => {
          const n = r.confirmations?.length || 0;
          return (
            <div className="lb-card" key={r.id}>
              <b>{r.category}</b> {r.status === 'resolved' ? '(resolved)' : n >= OK ? '(confirmed)' : ''}
              {r.direction && (
                <span className="dir-badge">
                  {r.direction === 'left' ? '⬅ moving left' : 'moving right ➡'}
                </span>
              )}
              <p>{r.text}</p>
              <small>{n}/{OK} confirmations</small><br />
              {r.status !== 'resolved' && !r.confirmations?.includes(uid) && (
                <button className="lb-btn-sm" onClick={() => act(() => api.confirmReport(r.id, uid))}>Confirm</button>
              )}
              {isMod && r.status !== 'resolved' && (
                <button className="lb-btn-sm" onClick={() => act(() => api.resolveReport(r.id))}>Mark resolved</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
