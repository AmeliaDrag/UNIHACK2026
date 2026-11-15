import { useEffect, useRef, useState } from 'react';
import { useSession } from './auth';
import { api } from './api';
import { useGeo } from './useGeo';
import { useTheme } from './theme';

import ReportsPage from './ReportsPage';
import SosPage     from './SosPage';
import SharePage   from './SharePage';
import ChatPage    from './ChatPage';
import TrackPage   from './TrackPage';
import AccountPage from './AccountPage';
import RouteTab    from './RouteTab';
import AppShell    from './AppShell';

import './HomePage.css';
import './styles.css';

const ROLES = 'https://safewalk.app/roles';
const SOS_POLL_MS = 10_000;

// ── Received SOS banner ──────────────────────────────────────────────────────
function ReceivedSosBanner({ alerts, onResolve }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9000,
      background: '#c62828', color: '#fff',
      padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {alerts.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>🚨 SOS</span>
          <span style={{ fontSize: '0.85rem' }}>
            from {a.senderName || a.senderId || 'unknown'} · {a.status}
          </span>
          {a.latitude != null && (
            <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>
              ({a.latitude.toFixed(4)}, {a.longitude.toFixed(4)})
            </span>
          )}
          {a.status !== 'RESOLVED' && (
            <button
              style={{
                marginLeft: 'auto', background: 'transparent', border: '1px solid #fff',
                color: '#fff', borderRadius: 6, padding: '2px 8px', cursor: 'pointer',
                fontSize: '0.78rem',
              }}
              onClick={() => onResolve(a.id)}
            >
              Resolve
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { isLoading, isAuthenticated, user, login, logout, enterGuest, guestEnabled } = useSession();
  const [page, setPage]       = useState('home');
  const [reports, setReports] = useState([]);
  const [receivedSos, setReceivedSos] = useState([]);
  const pos = useGeo();
  const { theme, cycleTheme } = useTheme();

  const inFlight = useRef(false);

  const reload = () => api.listReports().then(setReports).catch((e) => console.error(e));
  useEffect(() => { if (isAuthenticated) reload(); }, [isAuthenticated]);

  // ── Received SOS polling — 10 s, no overlapping requests ──
  useEffect(() => {
    if (!isAuthenticated) return;

    const poll = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const data = await api.getReceivedSos();
        if (Array.isArray(data)) {
          setReceivedSos((prev) => {
            // Reconcile by id; replace whole list each cycle
            const incoming = data.filter((a) => a.status !== 'RESOLVED');
            // Preserve any we already knew about that the server no longer returns (edge case)
            return incoming;
          });
        }
      } catch {
        // fail silently — don't spam the user
      } finally {
        inFlight.current = false;
      }
    };

    poll();
    const timer = setInterval(poll, SOS_POLL_MS);
    return () => {
      clearInterval(timer);
      inFlight.current = false;
    };
  }, [isAuthenticated]);

  const resolveReceivedSos = async (id) => {
    try {
      await api.resolveSos(id);
      setReceivedSos((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert('Could not resolve alert: ' + e.message);
    }
  };

  const track = new URLSearchParams(location.search).get('track');
  if (track) return <TrackPage id={track} />;
  if (isLoading) return <p className="c">Loading…</p>;

  const uid   = user?.sub;
  const isMod = !!user?.[ROLES]?.includes('moderator');
  const name  = user?.name || user?.email || uid;

  const needLogin = (
    <div className="p c">
      <h2>Sign in</h2>
      <button className="b" onClick={login}>Sign in</button>
      {guestEnabled && <button className="g" onClick={enterGuest}>Continue without account</button>}
    </div>
  );
  const secure = (el) => (isAuthenticated ? el : needLogin);

  // ── Page titles ──
  const titles = {
    home:    'LadyMap',
    reports: 'Report',
    share:   'Share',
    chat:    'Chat',
    account: 'My Account',
  };

  // Received SOS banner (shown on all pages when active alerts exist)
  const sosBanner = (
    <ReceivedSosBanner alerts={receivedSos} onResolve={resolveReceivedSos} />
  );

  // ── Home: RouteTab with own dropdown ──
  if (page === 'home')
    return (
      <div className="app" style={{ position: 'relative' }}>
        {sosBanner}
        <RouteTab userPos={pos} reports={reports} />

        <div className="fab-group">
          <button className="fab fab-sos" onClick={() => setPage('sos')} aria-label="SOS">SOS</button>
          <button className="fab fab-add" onClick={() => setPage('reports')} aria-label="Report">＋</button>
        </div>

        <nav className="hp-nav">
          <button className="on">🗺<span>Map</span></button>
          <button onClick={() => setPage('account')} className="hp-nav-lb">
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
            <span>Account</span>
          </button>
        </nav>
      </div>
    );

  // ── SOS: no dropdown, keeps ladybug background ──
  if (page === 'sos')
    return (
      <div className="app" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {sosBanner}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {secure(<SosPage uid={uid} pos={pos} onShare={() => setPage('share')} />)}
        </div>
        <nav className="hp-nav">
          <button onClick={() => setPage('home')}>🗺<span>Map</span></button>
          <button onClick={() => setPage('account')} className="hp-nav-lb">
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
            <span>Account</span>
          </button>
        </nav>
      </div>
    );

  // ── Account: no dropdown, has theme switcher ──
  if (page === 'account')
    return (
      <div className="app" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {sosBanner}
        <button
          onClick={cycleTheme}
          className="theme-switch"
          aria-label="Switch theme"
          title="Switch theme"
        >
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌸'}
        </button>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
          <AccountPage
            uid={uid}
            name={name}
            isAuthenticated={isAuthenticated}
            isGuest={false}
            onLogin={login}
            onLogout={logout}
            onGoShare={() => setPage('share')}
            onGoChat={() => setPage('chat')}
          />
        </div>

        <nav className="hp-nav">
          <button onClick={() => setPage('home')}>🗺<span>Map</span></button>
          <button className="hp-nav-lb on">
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
            <span>Account</span>
          </button>
        </nav>
      </div>
    );

  // ── All other pages with AppShell ──
  const nav = (p) => setPage(p);

  return (
    <AppShell title={titles[page] || 'LadyMap'} active={page} onNav={nav} showFab={page !== 'reports'}>
      {sosBanner}
      {page === 'reports' && secure(<ReportsPage pos={pos} reports={reports} reload={reload} />)}
      {page === 'share'   && secure(<SharePage uid={uid} pos={pos} />)}
      {page === 'chat'    && secure(<ChatPage uid={uid} userName={name} />)}
    </AppShell>
  );
}
