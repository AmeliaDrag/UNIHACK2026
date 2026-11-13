import { useEffect, useState } from 'react';
import { api } from './api';

const CATS = ['Iluminat slab', 'Persoană suspectă', 'Zonă izolată', 'Drum degradat', 'Altele'];
const OK = 3;

// Mică buburuză pentru lista de prieteni
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
  const [cat, setCat]   = useState(CATS[0]);
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(false);

  // Prieteni
  const [friends, setFriends] = useState([]);
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');

  const loadFriends = () => api.listFriends(uid).then(setFriends).catch(() => {});
  useEffect(() => { loadFriends(); }, [uid]);

  const addFriend = async () => {
    if (!fName.trim()) return alert('Introdu numele prietenei.');
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
    if (!pos) return alert('Activează locația ca să poți raporta.');
    act(async () => {
      await api.addReport({ category: cat, text: text.trim(), lat: pos.lat, lng: pos.lng, author: anon ? null : uid });
      setText('');
    });
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── Report ── */}
      <div className="lb-section">
        <h2 className="lb-section-title">Report a problem</h2>
        <select className="lb-input" value={cat} onChange={(e) => setCat(e.target.value)}>
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <textarea
          className="lb-input"
          placeholder="What's happening? (optional)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
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
          <input
            className="lb-input"
            placeholder="Name"
            value={fName}
            onChange={(e) => setFName(e.target.value)}
          />
          <input
            className="lb-input"
            placeholder="Phone (optional)"
            inputMode="tel"
            value={fPhone}
            onChange={(e) => setFPhone(e.target.value)}
          />
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
