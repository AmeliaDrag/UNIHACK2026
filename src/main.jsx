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
      <App />
    </Auth0Provider>
  );
}
