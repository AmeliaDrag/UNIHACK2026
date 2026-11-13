import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { missingVars, config } from './config';
import App from './App';

/** Full-screen error shown when required env vars are absent. */
function ConfigError({ missing }) {
  return (
    <div style={{
      display: 'grid', placeItems: 'center', height: '100vh',
      fontFamily: 'system-ui, sans-serif', padding: '24px', textAlign: 'center',
    }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>Configurare lipsă</h1>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          Aplicația nu poate porni. Adaugă variabilele de mai jos în fișierul <code>.env</code>
          {' '}și repornește serverul.
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

/**
 * Pe desktop (>600px lățime) învelește aplicația într-un cadru de telefon.
 * Pe un telefon real ocupă tot ecranul — cadrul dispare.
 */
function PhoneFrame({ children }) {
  return (
    <>
      {/* Stiluri inline ca să nu depindă de ordinea încărcării CSS */}
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
          box-shadow:
            0 0 0 2px #333,
            0 0 0 6px #111,
            0 30px 80px rgba(0,0,0,.7);
          overflow: hidden;
          flex-shrink: 0;
        }
        /* Notch */
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
        /* Side buttons */
        .sf-frame::after {
          content: '';
          position: absolute;
          top: 120px; right: -4px;
          width: 4px; height: 60px;
          background: #333;
          border-radius: 0 3px 3px 0;
          box-shadow: 0 80px 0 #333, 0 -80px 0 #333;
        }
        .sf-screen {
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 44px;
        }
        /* Pe telefon real — niciun cadru */
        @media (max-width: 600px) {
          .sf-desktop {
            background: none;
            padding: 0;
            display: block;
            min-height: unset;
          }
          .sf-frame {
            width: 100vw;
            height: 100dvh;
            border-radius: 0;
            box-shadow: none;
          }
          .sf-frame::before,
          .sf-frame::after { display: none; }
          .sf-screen { border-radius: 0; }
        }
      `}</style>
      <div className="sf-desktop">
        <div className="sf-frame">
          <div className="sf-screen">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

const root = createRoot(document.getElementById('root'));

if (missingVars.length > 0) {
  root.render(<ConfigError missing={missingVars} />);
} else {
  root.render(
    <Auth0Provider
      domain={config.auth0Domain}
      clientId={config.auth0ClientId}
      cacheLocation="localstorage"
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: config.auth0Audience,
      }}
    >
      <PhoneFrame>
        <App />
      </PhoneFrame>
    </Auth0Provider>
  );
}
