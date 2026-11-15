import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { missingVars, config } from './config';
import { HardcodedAuthProvider } from './demoAuth.jsx';
import App from './App';

// ── ConfigError: shown when required env vars are missing ────────────────────
function ConfigError({ missing }) {
  return (
    <div style={{
      display: 'grid', placeItems: 'center', height: '100vh',
      fontFamily: 'system-ui, sans-serif', padding: '24px', textAlign: 'center',
    }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>Configurare lipsă</h1>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          Aplicația nu poate porni. Adaugă variabilele de mai jos în fișierul{' '}
          <code>.env</code> și repornește serverul.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '6px' }}>
          {missing.map((v) => (
            <li key={v}>
              <code style={{
                background: '#f3f4f6', padding: '4px 10px',
                borderRadius: '6px', fontSize: '0.9rem',
              }}>{v}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── PhoneFrame: desktop wrapper that simulates a phone ───────────────────────
const VIEW_KEY = 'sf-view-mode';

function PhoneFrame({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) || 'phone'; }
    catch { return 'phone'; }
  });

  const toggle = () => {
    const next = mode === 'phone' ? 'desktop' : 'phone';
    setMode(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch {}
  };

  return (
    <>
      <style>{`
        .sf-desktop {
          min-height: 100vh;
          background: #1a1a2e;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
        }
        .sf-frame {
          position: relative;
          width: 390px;
          height: 844px;
          background: #000;
          border-radius: 50px;
          box-shadow: 0 0 0 2px #333, 0 0 0 6px #111, 0 30px 80px rgba(0,0,0,.7);
          overflow: hidden;
          flex-shrink: 0;
        }
        .sf-frame::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 120px; height: 30px;
          background: #000;
          border-radius: 0 0 20px 20px;
          z-index: 9999;
        }
        .sf-frame::after {
          content: '';
          position: absolute;
          top: 120px; right: -4px;
          width: 4px; height: 60px;
          background: #333;
          border-radius: 0 3px 3px 0;
          box-shadow: 0 80px 0 #333, 0 -80px 0 #333;
        }
        .sf-screen { width: 100%; height: 100%; overflow: hidden; border-radius: 44px; }
        .sf-desktop.is-desktop { background: none; padding: 0; display: block; min-height: unset; }
        .is-desktop .sf-frame { width: 100vw; height: 100dvh; border-radius: 0; box-shadow: none; }
        .is-desktop .sf-frame::before, .is-desktop .sf-frame::after { display: none; }
        .is-desktop .sf-screen { border-radius: 0; }
        @media (max-width: 600px) {
          .sf-desktop { background: none; padding: 0; display: block; min-height: unset; }
          .sf-frame { width: 100vw; height: 100dvh; border-radius: 0; box-shadow: none; }
          .sf-frame::before, .sf-frame::after { display: none; }
          .sf-screen { border-radius: 0; }
          .sf-view-toggle { display: none !important; }
        }
        .sf-view-toggle {
          position: fixed; top: 12px; right: 12px; z-index: 99999;
          padding: 8px 14px; border: 0; border-radius: 999px;
          background: #c62828; color: #fff;
          font: 600 .85rem system-ui, sans-serif;
          cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.4);
        }
        .sf-view-toggle:hover { background: #e53935; }
      `}</style>

      <button className="sf-view-toggle" onClick={toggle} aria-label="Schimbă aspectul">
        {mode === 'phone' ? '🖥 Desktop' : '📱 Telefon'}
      </button>

      <div className={`sf-desktop ${mode === 'desktop' ? 'is-desktop' : ''}`}>
        <div className="sf-frame">
          <div className="sf-screen">{children}</div>
        </div>
      </div>
    </>
  );
}

// AppWrapper: No Auth0 callback handling needed
function AppWrapper() {
  return (
    <PhoneFrame>
      <App />
    </PhoneFrame>
  );
}

// ── Root render ───────────────────────────────────────────────────────────────
const root = createRoot(document.getElementById('root'));

if (missingVars.length > 0) {
  root.render(<ConfigError missing={missingVars} />);
} else {
  // ── Hardcoded Auth: ALWAYS logged in, NO Auth0 ──────────────────────────────
  console.log('[Hardcoded Auth] Using hardcoded user: Miriam (miriam@ladymap.app)');
  root.render(
    <HardcodedAuthProvider>
      <AppWrapper />
    </HardcodedAuthProvider>
  );
}
