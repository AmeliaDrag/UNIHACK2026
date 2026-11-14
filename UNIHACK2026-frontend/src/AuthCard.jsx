import './AuthCard.css';

export function Ladybug() {
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

/**
 * AuthCard - the one sign in / sign up screen used everywhere in the app.
 * Props: onLogin, onSignUp, error (string|null), guestEnabled, onGuest, title, subtitle
 */
export default function AuthCard({
  onLogin, onSignUp, error, guestEnabled, onGuest,
  title = 'Welcome to Buburu',
  subtitle = 'Sign in or create an account to use all features.',
}) {
  const needsApiAccess = error && /not authorized to access resource server/i.test(error);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Ladybug />
        <h2 className="auth-title">{title}</h2>
        <p className="auth-sub">{subtitle}</p>

        {error && (
          <div className="auth-error" role="alert">
            <b>Sign-in failed</b>
            <span>{error}</span>
            {needsApiAccess && (
              <small>
                Auth0 setup needed: Auth0 Dashboard, APIs, unihack-project-api,
                Application Access, then authorize this application.
              </small>
            )}
          </div>
        )}

        <button type="button" className="auth-btn" onClick={onLogin}>Sign in</button>
        <button type="button" className="auth-btn outline" onClick={onSignUp}>Create account</button>
        {guestEnabled && (
          <button type="button" className="auth-link" onClick={onGuest}>Continue without account</button>
        )}
      </div>
    </div>
  );
}