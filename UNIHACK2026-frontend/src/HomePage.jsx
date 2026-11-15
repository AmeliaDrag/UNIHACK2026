import { useEffect, useState } from 'react';
import { useSession } from './auth';
import { api, backendApi } from './api';
import { useGeoStatus } from './useGeo';
import { startUnreadPolling, resetUnread, useUnread } from './unread';
import { useTheme } from './theme';

import ReportsPage  from './ReportsPage';
import SosPageNew    from './SosPageNew';
import SharePage    from './SharePage';
import ChatPage     from './ChatPage';
import TrackPage    from './TrackPage';
import AccountPage  from './AccountPage';
import RouteTab     from './RouteTab';
import AppShell     from './AppShell';
import ProfilePrompt from './ProfilePrompt';
import AuthCard from './AuthCard';
import { loadNote } from './reportNotes';

import './HomePage.css';
import './styles.css';

const ROLES = 'https://safewalk.app/roles';

// Map backend report type enum → frontend category string
const TYPE_TO_CAT = {
  LOW_LIGHT:        'Poor lighting',
  SUSPICIOUS_PERSON:'Suspicious person',
  ISOLATED_AREA:    'Isolated area',
  DAMAGED_ROAD:     'Damaged road',
  OTHER:            'Other',
};
const CAT_TO_TYPE = Object.fromEntries(Object.entries(TYPE_TO_CAT).map(([k, v]) => [v, k]));

function normalizeReport(r) {
  return {
    ...r,
    ...loadNote(r.id),
    category: TYPE_TO_CAT[r.type] || r.type,
    lat: r.latitude  ?? r.lat,
    lng: r.longitude ?? r.lng,
    status: r.status || 'open',
  };
}

export default function App() {
  const {
    isLoading, isAuthenticated, isGuest, user,
    login, loginSignUp, logout,
    enterGuest, guestEnabled,
    backendProfile, profileError, profileLoading, authError,
    showProfilePrompt, dismissProfilePrompt, updateBackendProfile,
  } = useSession();

  const [page, setPage]       = useState('home');
  const [reports, setReports] = useState([]);
  const { pos, error: geoError } = useGeoStatus();
  const unread = useUnread();
  const { theme, cycleTheme } = useTheme();

  // ── Load reports from backend (auth mode) or mock (guest/dev) ──
  const reload = async () => {
    try {
      if (isAuthenticated && !isGuest) {
        const raw = await backendApi.listReports();
        setReports(raw.map(normalizeReport));
      } else if (isAuthenticated && isGuest) {
        const raw = await api.listReports();
        setReports(raw);
      }
    } catch (e) {
      console.error('[home] listReports error:', e);
    }
  };

  // Load reports when signed in, whenever you come back to a page, and every 30 s,
  // so reports made by other accounts show up without a manual refresh.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    reload();
    const id = setInterval(() => { if (document.visibilityState === 'visible') reload(); }, 30000);
    return () => clearInterval(id);
  }, [isAuthenticated, isGuest, page]); // eslint-disable-line react-hooks/exhaustive-deps
  // Unread chat messages: poll for messages sent to me (real accounts only).
  const meId = user?.sub;
  useEffect(() => {
    if (!isAuthenticated || isGuest || !meId) { resetUnread(null); return undefined; }
    return startUnreadPolling(meId);
  }, [isAuthenticated, isGuest, meId]);

  // ── Deep-link: track page ──
  const track = new URLSearchParams(location.search).get('track');
  if (track) return <TrackPage id={track} />;

  // ── Loading spinner ──
  if (isLoading || profileLoading) return <p className="c">Loading…</p>;

  // ── Backend auth error screen ──
  if (profileError) {
    const where = profileError.url ? ` (${profileError.url})` : '';
    const COPY = {
      0:   ['Backend unreachable', `Could not connect to the backend${where}. Is it running?`],
      401: ['Not authorized', 'The backend rejected your login token. Sign out and sign in again.'],
      403: ['Email not verified', 'Check your inbox and click the verification link, then sign in again.'],
      404: ['Backend endpoint not found', `The server answered 404${where}. Check that VITE_API_BASE_URL points to the Spring backend.`],
      409: ['Account conflict', profileError.message],
    };
    const [title, text] = COPY[profileError.status] || ['Sign-in error', profileError.message];
    return (
      <div className="p c" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2>{title}</h2>
        <p style={{ textAlign: 'center', opacity: 0.75 }}>{text}</p>
        {profileError.status ? <small style={{ opacity: 0.5 }}>HTTP {profileError.status}</small> : null}
        <button className="b" onClick={logout}>Sign out and try again</button>
      </div>
    );
  }
  const uid   = user?.sub;
  const isMod = !!user?.[ROLES]?.includes('moderator');
  const name  = backendProfile?.name || user?.name || user?.email || uid;

  // ── Add report (backend or mock) ──
  const addReport = async (r) => {
    let created = null;
    if (isGuest) {
      await api.addReport(r);
    } else {
      created = await backendApi.addReport({
        type:      CAT_TO_TYPE[r.category] || 'OTHER',
        latitude:  r.lat,
        longitude: r.lng,
      });
    }
    reload();
    return created;
  };

  // ── Login wall for sub-pages ──
  const needLogin = (
    <AuthCard
      onLogin={login}
      onSignUp={loginSignUp}
      error={authError}
      guestEnabled={guestEnabled}
      onGuest={enterGuest}
    />
  );
  const secure = (el) => (isAuthenticated ? el : needLogin);

  const LadybugNav = ({ active, onMap, onChat, onAccount }) => (
    <nav className="hp-nav">
      <button className={active === 'home' ? 'on' : ''} onClick={onMap}>🗺<span>Map</span></button>
      <button className={active === 'chat' ? 'on' : ''} onClick={onChat}>
        <span className="nav-ico">
          💬
          {unread.total > 0 && <i className="nav-dot" aria-label={`${unread.total} mesaje noi`} />}
        </span>
        <span>Chat</span>
      </button>
      <button className={`hp-nav-lb${active === 'account' ? ' on' : ''}`} onClick={onAccount}>
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
  );

  // ── Profile prompt overlay ──
  const profilePromptOverlay = showProfilePrompt && user && backendProfile ? (
    <ProfilePrompt
      user={user}
      backendProfile={backendProfile}
      onSave={(updated) => {
        updateBackendProfile(updated);
        dismissProfilePrompt(true);
      }}
      onSkip={() => dismissProfilePrompt(false)}
    />
  ) : null;

  // ── Home: map + sign-in button if not authenticated ──
  if (page === 'home')
    return (
      <div className="app" style={{ position: 'relative' }}>
        {profilePromptOverlay}
        <RouteTab userPos={pos} geoError={geoError} reports={reports} safe={isAuthenticated && !isGuest} />

        <div className="fab-group">
          <button className="fab fab-sos" onClick={() => setPage('sos')} aria-label="SOS">SOS</button>
          <button className="fab fab-add" onClick={() => setPage('reports')} aria-label="Report">＋</button>
        </div>

        <LadybugNav active="home" onMap={() => setPage('home')} onChat={() => setPage('chat')} onAccount={() => setPage('account')} />
      </div>
    );

  // ── SOS ──
  if (page === 'sos')
    return (
      <div className="app" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {profilePromptOverlay}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {secure(<SosPageNew uid={uid} pos={pos} isGuest={isGuest} onShare={() => setPage('share')} />)}
        </div>
        <LadybugNav active="sos" onMap={() => setPage('home')} onChat={() => setPage('chat')} onAccount={() => setPage('account')} />
      </div>
    );

  // ── Account ──
  if (page === 'account')
    return (
      <div className="app" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {profilePromptOverlay}
        <button onClick={cycleTheme} className="theme-switch" aria-label="Switch theme" title="Switch theme">
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌸'}
        </button>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
          {!isAuthenticated ? needLogin : (
          <AccountPage
            uid={uid}
            name={name}
            email={backendProfile?.email || user?.email}
            phoneNumber={backendProfile?.phoneNumber}
            wingColor={backendProfile?.wingColor}
            dotColor={backendProfile?.dotColor}
            isAuthenticated={isAuthenticated}
            isGuest={isGuest}
            onLogin={login}
            onLogout={logout}
            onGoShare={() => setPage('share')}
            onGoChat={() => setPage('chat')}
            onProfileUpdated={updateBackendProfile}
          />
          )}
        </div>
        <LadybugNav active="account" onMap={() => setPage('home')} onChat={() => setPage('chat')} onAccount={() => setPage('account')} />
      </div>
    );

  // ── All other pages with AppShell ──
  const titles = { reports: 'Report', share: 'Share', chat: 'Chat' };
  const nav = (p) => setPage(p);

  return (
    <AppShell title={titles[page] || 'Buburu'} active={page} onNav={nav} showFab={page !== 'reports' && page !== 'chat'}>
      {profilePromptOverlay}
      {page === 'reports' && secure(
        <ReportsPage
          uid={uid} isMod={isMod} isGuest={isGuest} reports={reports} pos={pos}
          reload={reload} addReport={addReport}
        />
      )}
      {page === 'share' && secure(<SharePage uid={uid} pos={pos} isGuest={isGuest} />)}
      {page === 'chat'  && secure(<ChatPage isGuest={isGuest} />)}
    </AppShell>
  );
}

