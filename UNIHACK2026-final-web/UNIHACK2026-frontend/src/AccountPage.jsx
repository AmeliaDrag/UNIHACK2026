import { useEffect, useRef, useState } from 'react';
import { backendApi, describeApiError } from './api';
import FriendsSection from './FriendsSection';
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

// ── Ladybug colors: saved on this device, per user ──────────────────────────
const DEFAULT_COLORS = { wings: '#c62828', dots: '#111111' };
const WING_PRESETS = ['#c62828', '#e91e8c', '#ff9800', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#f5f5f5'];
const DOT_PRESETS  = ['#111111', '#ffffff', '#c62828', '#fdd835', '#1e88e5', '#43a047', '#8e24aa', '#ff9800'];
const HEX = /^#[0-9a-f]{6}$/i;
const colorKey = (uid) => `ladybugColors:${uid || 'anon'}`;

function loadColors(uid) {
  try {
    const c = JSON.parse(localStorage.getItem(colorKey(uid)) || 'null');
    return {
      wings: HEX.test(c?.wings) ? c.wings : DEFAULT_COLORS.wings,
      dots:  HEX.test(c?.dots)  ? c.dots  : DEFAULT_COLORS.dots,
    };
  } catch { return { ...DEFAULT_COLORS }; }
}
function saveColors(uid, colors) {
  try { localStorage.setItem(colorKey(uid), JSON.stringify(colors)); } catch { /* storage blocked */ }
}

function ColorRow({ label, value, presets, onChange }) {
  return (
    <div className="lb-color-row">
      <span className="lb-color-label">{label}</span>
      <div className="lb-swatches">
        {presets.map((c) => (
          <button
            key={c} type="button" aria-label={`${label} ${c}`}
            className={`lb-swatch${value.toLowerCase() === c ? ' on' : ''}`}
            style={{ background: c }} onClick={() => onChange(c)}
          />
        ))}
        <input type="color" className="lb-color-input" value={value}
          aria-label={`${label} personalizat`} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
function Ladybug({ wings = DEFAULT_COLORS.wings, dots = DEFAULT_COLORS.dots }) {
  return (
    <svg viewBox="0 0 120 120" className="lb-avatar" aria-hidden="true">
      <ellipse cx="60" cy="68" rx="38" ry="34" fill={wings} />
      <line x1="60" y1="34" x2="60" y2="102" stroke="#111" strokeWidth="3.5" />
      <circle cx="42" cy="58" r="8"  fill={dots} />
      <circle cx="78" cy="58" r="8"  fill={dots} />
      <circle cx="40" cy="80" r="7"  fill={dots} />
      <circle cx="80" cy="80" r="7"  fill={dots} />
      <circle cx="60" cy="90" r="6"  fill={dots} />
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

export default function AccountPage({ name, email, phoneNumber, wingColor, dotColor, uid, isAuthenticated, isGuest, onLogin, onLogout, onGoShare, onGoChat, onProfileUpdated }) {
  const [editName,    setEditName]    = useState(name || '');
  const [countryCode, setCountryCode] = useState('+40');
  const [phoneLocal,  setPhoneLocal]  = useState('');
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [colors,      setColors]      = useState(() => loadColors(uid));
  const [editingLook, setEditingLook]  = useState(false);
  const [colorError, setColorError] = useState(null);
  const pushTimer = useRef(null);
  const appliedRemote = useRef(false);

  // Save the colors on the server (debounced) so friends see them too.
  const pushColors = (c) => {
    if (isGuest) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        const updated = await backendApi.updateMe({ wingColor: c.wings, dotColor: c.dots });
        setColorError(null);
        if (onProfileUpdated) onProfileUpdated(updated);
      } catch (e) {
        console.error('[account] saving ladybug colors failed:', e);
        setColorError(describeApiError(e, 'ro'));
      }
    }, 600);
  };

  // First load: the server's colors win; colors only stored on this device are uploaded once.
  useEffect(() => {
    const local = loadColors(uid);
    if (isGuest) { setColors(local); return; }
    if (appliedRemote.current) return;
    appliedRemote.current = true;
    const hasW = HEX.test(wingColor);
    const hasD = HEX.test(dotColor);
    const merged = { wings: hasW ? wingColor : local.wings, dots: hasD ? dotColor : local.dots };
    setColors(merged);
    saveColors(uid, merged);
    const isDefault = merged.wings === DEFAULT_COLORS.wings && merged.dots === DEFAULT_COLORS.dots;
    if ((!hasW || !hasD) && !isDefault) pushColors(merged);
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyColors = (next) => { setColors(next); saveColors(uid, next); pushColors(next); };
  const setColor = (part, value) => applyColors({ ...colors, [part]: value });
  const resetColors = () => applyColors({ ...DEFAULT_COLORS });
  // Pre-fill phone if we have one
  useEffect(() => {
    if (phoneNumber) {
      // Try to split country code
      const match = COUNTRY_CODES.find((c) => phoneNumber.startsWith(c.code));
      if (match) {
        setCountryCode(match.code);
        setPhoneLocal(phoneNumber.slice(match.code.length));
      } else {
        setPhoneLocal(phoneNumber);
      }
    }
  }, [phoneNumber]);

  // Keep editName in sync when backendProfile prop changes
  useEffect(() => { if (name) setEditName(name); }, [name]);

  const save = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      if (isGuest) {
        // Guest: local save only
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
        return;
      }
      const dto = { name: editName.trim() };
      const fullPhone = (countryCode + phoneLocal.trim()).replace(/\s/g, '');
      if (phoneLocal.trim()) dto.phoneNumber = fullPhone;

      const updated = await backendApi.updateMe(dto);
      if (onProfileUpdated) onProfileUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setSaveError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
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
        <div className="lb-avatar-wrap">
          <Ladybug wings={colors.wings} dots={colors.dots} />
          <button
            type="button"
            className={`lb-pencil${editingLook ? ' on' : ''}`}
            onClick={() => setEditingLook((v) => !v)}
            aria-label="Personalizează buburuza"
            aria-pressed={editingLook}
            title="Personalizează buburuza"
          >✏️</button>
        </div>
        <span className="lb-badge">🐞 Ladybug</span>
        <span className="lb-username">{editName || name}</span>
      </div>
      {editingLook && (
      <div className="lb-section" style={{ padding: '12px', gap: '8px' }}>
        <h2 className="lb-section-title">Personalizează buburuza</h2>
        <p className="lb-sub-text">{isGuest ? 'Culorile rămân doar pe acest dispozitiv.' : 'Prietenii tăi vor vedea buburuza ta în aceste culori.'}</p>
        {colorError && <div className="lb-msg bad" role="alert">Nu am putut salva culorile pentru prieteni: {colorError}</div>}
        <ColorRow label="Aripi"  value={colors.wings} presets={WING_PRESETS} onChange={(c) => setColor('wings', c)} />
        <ColorRow label="Buline" value={colors.dots}  presets={DOT_PRESETS}  onChange={(c) => setColor('dots', c)} />
        <button type="button" className="lb-btn outline" onClick={resetColors}>Resetează culorile</button>
        <button type="button" className="lb-btn" onClick={() => setEditingLook(false)}>Gata</button>
      </div>
      )}

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
          <label className="lb-field-label">Email</label>
          <input
            className="lb-input"
            type="email"
            value={email || ''}
            readOnly
            style={{ opacity: 0.6, cursor: 'default' }}
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

        {saveError && (
          <div style={{ color: '#ff6b6b', fontSize: '0.83rem', padding: '6px 0' }}>
            {saveError}
          </div>
        )}

        <button className="lb-btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <FriendsSection uid={uid} isGuest={isGuest} />

      {/* ── Actions ── */}
      <div className="lb-section" style={{ padding: '12px', gap: '8px' }}>
        <button className="lb-btn" onClick={onGoShare}>📍 Share route</button>
        <button className="lb-btn" onClick={onGoChat}>💬 Chat</button>
        <button className="lb-btn outline" onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}
