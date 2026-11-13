import { useEffect, useState } from 'react';
import { api } from './api';
import './AccountPage.css';

const COUNTRY_CODES = [
  { flag: '🇷🇴', code: '+40',  label: '🇷🇴 +40'  },
  { flag: '🇲🇩', code: '+373', label: '🇲🇩 +373' },
  { flag: '🇬🇧', code: '+44',  label: '🇬🇧 +44'  },
  { flag: '🇩🇪', code: '+49',  label: '🇩🇪 +49'  },
  { flag: '🇫🇷', code: '+33',  label: '🇫🇷 +33'  },
  { flag: '🇮🇹', code: '+39',  label: '🇮🇹 +39'  },
  { flag: '🇪🇸', code: '+34',  label: '🇪🇸 +34'  },
  { flag: '🇺🇸', code: '+1',   label: '🇺🇸 +1'   },
];

function Ladybug() {
  return (
    <svg viewBox="0 0 120 120" className="lb-avatar" aria-hidden="true">
      <ellipse cx="60" cy="68" rx="38" ry="34" fill="#c62828" />
      <line x1="60" y1="34" x2="60" y2="102" stroke="#111" strokeWidth="3.5" />
      <circle cx="42" cy="58" r="8"  fill="#111" />
      <circle cx="78" cy="58" r="8"  fill="#111" />
      <circle cx="40" cy="80" r="7"  fill="#111" />
      <circle cx="80" cy="80" r="7"  fill="#111" />
      <circle cx="60" cy="90" r="6"  fill="#111" />
      <circle cx="60" cy="34" r="18" fill="#111" />
      <circle cx="52" cy="29" r="4" fill="#fff" />
      <circle cx="68" cy="29" r="4" fill="#fff" />
      <circle cx="53" cy="30" r="2" fill="#111" />
      <circle cx="69" cy="30" r="2" fill="#111" />
      <line x1="52" y1="17" x2="44" y2="6"  stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="68" y1="17" x2="76" y2="6"  stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="43" cy="5"  r="3" fill="#111" />
      <circle cx="77" cy="5"  r="3" fill="#111" />
    </svg>
  );
}

function MiniBug({ size = 22 }) {
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

export default function AccountPage({ name, uid, isAuthenticated, onLogin, onLogout, onGoShare, onGoChat }) {
  const [editName,    setEditName]    = useState(name || '');
  const [countryCode, setCountryCode] = useState('+40');
  const [phoneLocal,  setPhoneLocal]  = useState('');
  const [saved,       setSaved]       = useState(false);

  // Prieteni
  const [friends,   setFriends]  = useState([]);
  const [fName,     setFName]    = useState('');
  const [fPhone,    setFPhone]   = useState('');

  const loadFriends = () => { if (uid) api.listFriends(uid).then(setFriends).catch(() => {}); };
  useEffect(() => { loadFriends(); }, [uid]);

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

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  if (!isAuthenticated)
    return (
      <div className="lb-page">
        <Ladybug />
        <p className="lb-sub">Sign in to use all features.</p>
        <button className="lb-btn" onClick={onLogin}>Sign in</button>
      </div>
    );

  return (
    <div className="lb-page" style={{ alignItems: 'stretch', padding: '16px 16px 24px', gap: '12px', overflowY: 'auto' }}>
      {/* ── Avatar ── */}
      <div className="lb-avatar-section">
        <Ladybug />
        <span className="lb-badge">🐞 Ladybug</span>
        <span className="lb-username">{editName || name}</span>
      </div>

      {/* ── Profile ── */}
      <div className="lb-section" style={{ padding: '12px', gap: '8px' }}>
        <h2 className="lb-section-title">Profile</h2>

        <div className="lb-field-row">
          <span className="lb-field-accent" />
          <label className="lb-field-label">Name</label>
          <input
            className="lb-input"
            type="text"
            placeholder="Your name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>

        <div className="lb-field-row">
          <span className="lb-field-accent" />
          <label className="lb-field-label">Tel</label>
          <div className="lb-phone-group">
            <select
              className="lb-country-select"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <div className="lb-phone-divider" />
            <input
              className="lb-phone-input"
              type="tel"
              inputMode="tel"
              placeholder="7xx xxx xxx"
              value={phoneLocal}
              onChange={(e) => setPhoneLocal(e.target.value)}
            />
          </div>
        </div>

        <button className="lb-btn" onClick={save}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* ── Friends ── */}
      <div className="lb-section" style={{ padding: '12px', gap: '8px' }}>
        <h2 className="lb-section-title">🐞 Ladybug Friends</h2>

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

      {/* ── Actions ── */}
      <div className="lb-section" style={{ padding: '12px', gap: '8px' }}>
        <button className="lb-btn" onClick={onGoShare}>📍 Share route</button>
        <button className="lb-btn" onClick={onGoChat}>💬 Chat</button>
        <button className="lb-btn outline" onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}
