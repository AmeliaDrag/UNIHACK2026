import { useEffect, useState } from 'react';
import { useSession } from './auth';
import { api } from './api';
import { useGeo } from './useGeo';

import ReportsPage from './ReportsPage';
import SosPage     from './SosPage';
import SharePage   from './SharePage';
import ChatPage    from './ChatPage';
import TrackPage   from './TrackPage';
import AccountPage from './AccountPage';
import RouteTab    from './RouteTab';

import './HomePage.css';
import './styles.css';

const ROLES = 'https://safewalk.app/roles';

export default function App() {
  const { isLoading, isAuthenticated, user, login, logout, enterGuest, guestEnabled } = useSession();
  const [page, setPage]       = useState('home');
  const [reports, setReports] = useState([]);
  const pos = useGeo();

  const reload = () => api.listReports().then(setReports).catch((e) => console.error(e));
  useEffect(() => { if (isAuthenticated) reload(); }, [isAuthenticated]);

  const track = new URLSearchParams(location.search).get('track');
  if (track) return <TrackPage id={track} />;
  if (isLoading) return <p className="c">Se încarcă…</p>;

  const uid   = user?.sub;
  const isMod = !!user?.[ROLES]?.includes('moderator');
  const name  = user?.name || user?.email || uid;

  const needLogin = (
    <div className="p c">
      <h2>Conectează-te</h2>
      <button className="b" onClick={login}>Conectează-te</button>
      {guestEnabled && <button className="g" onClick={enterGuest}>Continuă fără cont</button>}
    </div>
  );
  const secure = (el) => (isAuthenticated ? el : needLogin);

  // ── Pagina principală ──
  if (page === 'home')
    return (
      <div className="app">
        {/* Fără header — titlul e în RouteTab */}
        <main style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <RouteTab userPos={pos} reports={reports} />

          {/* Butoane FAB: + și SOS deasupra navbar-ului, în dreapta */}
          <div className="fab-group">
            <button
              className="fab fab-sos"
              onClick={() => setPage('sos')}
              aria-label="SOS"
            >SOS</button>
            <button
              className="fab fab-add"
              onClick={() => setPage('reports')}
              aria-label="Raportează"
            >＋</button>
          </div>
        </main>

        <nav className="hp-nav">
          <button className="on">
            🗺
            <span>Hartă</span>
          </button>
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
            <span>Cont</span>
          </button>
        </nav>
      </div>
    );

  // ── Celelalte pagini ──
  const back = page === 'share' || page === 'chat' ? 'account' : 'home';

  return (
    <div className="app">
      <header>
        <b>LadyApp</b>
        <button className="g" onClick={() => setPage(back)}>← Înapoi</button>
      </header>
      <main>
        {page === 'reports' && secure(<ReportsPage uid={uid} isMod={isMod} reports={reports} pos={pos} reload={reload} />)}
        {page === 'sos'     && secure(<SosPage uid={uid} pos={pos} />)}
        {page === 'share'   && secure(<SharePage uid={uid} pos={pos} />)}
        {page === 'chat'    && secure(<ChatPage uid={uid} userName={name} />)}
        {page === 'account' && (
          <AccountPage
            name={name}
            isAuthenticated={isAuthenticated}
            isGuest={false}
            onLogin={login}
            onLogout={logout}
            onGoShare={() => setPage('share')}
            onGoChat={() => setPage('chat')}
          />
        )}
      </main>
    </div>
  );
}
