/**
 * AppShell.jsx — shell comun pentru toate paginile.
 * Oferă dropdown-ul negru sus + navbar-ul negru jos cu FAB-uri.
 * Nu atinge conținutul paginii — fiecare pagină își păstrează propriul fundal/decorații.
 */
import { useState } from 'react';
import { useUnread } from './unread';

const LADYBUG_SVG = (
  <svg viewBox="0 0 36 40" width="34" height="38" aria-hidden="true">
    <ellipse cx="18" cy="26" rx="13" ry="12" fill="#c62828"/>
    <line x1="18" y1="14" x2="18" y2="38" stroke="#111" strokeWidth="1.4"/>
    <circle cx="12" cy="22" r="3" fill="#111"/>
    <circle cx="24" cy="22" r="3" fill="#111"/>
    <circle cx="11" cy="30" r="2.5" fill="#111"/>
    <circle cx="25" cy="30" r="2.5" fill="#111"/>
    <circle cx="18" cy="13" r="6.5" fill="#111"/>
    <circle cx="15.5" cy="11" r="1.4" fill="#fff"/>
    <circle cx="20.5" cy="11" r="1.4" fill="#fff"/>
    <line x1="15.5" y1="7" x2="12" y2="2" stroke="#111" strokeWidth="1.1" strokeLinecap="round"/>
    <line x1="20.5" y1="7" x2="24" y2="2" stroke="#111" strokeWidth="1.1" strokeLinecap="round"/>
    <circle cx="11.5" cy="1.5" r="1.3" fill="#111"/>
    <circle cx="24.5" cy="1.5" r="1.3" fill="#111"/>
  </svg>
);

export default function AppShell({
  title = 'Buburu',
  active = 'home',
  onNav,
  children,
  dropdown,
  showFab = true,
}) {
  const [open, setOpen] = useState(false);
  const unread = useUnread();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* ── Dropdown sus ── */}
      <div style={{ padding: '10px 10px 0', flexShrink: 0, zIndex: 10, position: 'relative' }}>
        <button
          className="rt-toggle"
          onClick={() => setOpen(o => !o)}
        >
          <span className="rt-title">{title}</span>
          <span className="rt-arrow">{open ? '▲' : '▼'}</span>
        </button>

        {dropdown && (
          <div className={`rt-panel${open ? ' open' : ''}`}>
            {dropdown}
          </div>
        )}
      </div>

      {/* ── Conținutul paginii — neatins, fiecare pagină își păstrează stilurile ── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {children}

        {/* FAB-uri — absolut pe lângă conținut, nu îl învelluiesc */}
        {showFab && (
          <div className="fab-group">
            <button className="fab fab-sos" onClick={() => onNav('sos')} aria-label="SOS">SOS</button>
            <button className="fab fab-add" onClick={() => onNav('reports')} aria-label="Raportează">＋</button>
          </div>
        )}
      </div>

      {/* ── Navbar jos ── */}
      <nav className="hp-nav">
        <button
          className={active === 'home' ? 'on' : ''}
          onClick={() => onNav('home')}
        >
          🗺<span>Hartă</span>
        </button>
        <button
          className={active === 'chat' ? 'on' : ''}
          onClick={() => onNav('chat')}
        >
          <span className="nav-ico">
            💬
            {unread.total > 0 && <i className="nav-dot" aria-label={`${unread.total} mesaje noi`} />}
          </span>
          <span>Chat</span>
        </button>
        <button
          className={`hp-nav-lb${active === 'account' ? ' on' : ''}`}
          onClick={() => onNav('account')}
        >
          {LADYBUG_SVG}
          <span>Cont</span>
        </button>
      </nav>
    </div>
  );
}
