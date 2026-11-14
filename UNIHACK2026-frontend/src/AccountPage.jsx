import { useEffect, useState } from 'react';
import { api } from './api';
import { useSession } from './auth';
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

// Split a full phone number like "+40712345678" into code + local
function splitPhone(full) {
  if (!full) return { code: '+40', local: '' };
  for (const c of COUNTRY_CODES.sort((a, b) => b.code.length - a.code.length)) {
    if (full.startsWith(c.code)) {
      return { code: c.code, local: full.slice(c.code.length) };
    }
  }
  return { code: '+40', local: full };
}

export default function AccountPage({ name, uid, isAuthenticated, onLogin, onLogout, onGoShare, onGoChat }) {
  const { backendProfile } = useSession();

  // Profile fields — seed from backendProfile when it loads
  const [editName,    setEditName]    = useState(name || '');
  const [countryCode, setCountryCode] = useState('+40');
  const [phoneLocal,  setPhoneLocal]  = useState('');
  const [saveState,   setSaveState]   = useState('idle'); // idle | saving | ok | error
  const [saveError,   setSaveError]   = useState(null);

  useEffect(() => {
    if (!backendProfile) return;
    if (backendProfile.name)        setEditName(backendProfile.name);
    if (backendProfile.phoneNumber) {
      const { code, local } = splitPhone(backendProfile.phoneNumber);
      setCountryCode(code);
      setPhoneLocal(local);
    }
  }, [backendProfile]);

  // ── Trusted contacts ──
  const [sent,     setSent]     = useState([]);
  const [received, setReceived] = useState([]);
  const [cEmail,   setCEmail]   = useState('');
  const [cBusy,    setCBusy]    = useState(false);
  const [cError,   setCError]   = useState(null);

  const loadContacts = () => {
    if (!uid) return;
    api.getSentContacts().then(setSent).catch(() => {});
    api.getReceivedContacts().then(setReceived).catch(() => {});
  };
  useEffect(() => { loadContacts(); }, [uid]);

  const addContact = async () => {
    if (!cEmail.trim()) return setCError('Enter an email address.');
    setCBusy(true); setCError(null);
    try {
      await api.addContact({ contactEmail: cEmail.trim() });
      setCEmail('');
      loadContacts();
    } catch (e) {
      setCError(e.message);
    } finally {
      setCBusy(false);
    }
  };

  const deleteContact = async (id) => {
    try { await api.deleteContact(id); loadContacts(); }
    catch (e) { alert(e.message); }
  };

  const acceptContact = async (id) => {
    try { await api.acceptContact(id); loadContacts(); }
    catch (e) { alert(e.message); }
  };

  // ── Save profile ──
  const save = async () => {
    setSaveState('saving'); setSaveError(null);
    try {
      await api.updateMe({
        name: editName.trim() || undefined,
        phoneNumber: phoneLocal.trim() ? countryCode + phoneLocal.trim() : undefined,
      });
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 1800);
    } catch (e) {
      setSaveError(e.message);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
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

        {saveState === 'error' && saveError && (
          <p style={{ color: '#c62828', margin: 0, fontSize: '0.85rem' }}>{saveError}</p>
        )}

        <button className="lb-btn" onClick={save} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'ok' ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* ── Trusted Contacts ── */}
      <div className="lb-section" style={{ padding: '12px', gap: '8px' }}>
        <h2 className="lb-section-title">🐞 Trusted Contacts</h2>

        {/* Received invitations */}
        {received.length > 0 && (
          <>
            <p className="lb-sub-text" style={{ fontWeight: 600, margin: 0 }}>Received invitations</p>
            {received.map((c) => (
              <div className="lb-friend-card" key={c.id}>
                <MiniBug />
                <div className="lb-friend-info">
                  <b>{c.senderName || c.senderEmail || c.senderId}</b>
                  <small style={{ textTransform: 'capitalize' }}>{(c.status || '').toLowerCase()}</small>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {c.status === 'PENDING' && (
                    <button className="lb-btn-sm" onClick={() => acceptContact(c.id)}>Accept</button>
                  )}
                  <button className="lb-friend-remove" onClick={() => deleteContact(c.id)}>✕</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Sent invitations */}
        <p className="lb-sub-text" style={{ fontWeight: 600, margin: 0 }}>Sent invitations</p>
        {sent.length === 0 && <p className="lb-empty">No contacts yet.</p>}
        {sent.map((c) => (
          <div className="lb-friend-card" key={c.id}>
            <MiniBug />
            <div className="lb-friend-info">
              <b>{c.contactName || c.contactEmail || c.contactId}</b>
              <small style={{ textTransform: 'capitalize' }}>{(c.status || '').toLowerCase()}</small>
            </div>
            <button className="lb-friend-remove" onClick={() => deleteContact(c.id)}>✕</button>
          </div>
        ))}

        {/* Add contact */}
        <div className="lb-friend-add">
          <input
            className="lb-input"
            type="email"
            inputMode="email"
            placeholder="friend@example.com"
            value={cEmail}
            onChange={(e) => { setCEmail(e.target.value); setCError(null); }}
          />
          {cError && <p style={{ color: '#c62828', margin: 0, fontSize: '0.85rem' }}>{cError}</p>}
          <button className="lb-btn" onClick={addContact} disabled={cBusy}>
            {cBusy ? 'Sending…' : '＋ Add contact'}
          </button>
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
