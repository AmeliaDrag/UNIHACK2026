import './AccountPage.css';

function Ladybug() {
  return (
    <svg viewBox="0 0 120 120" className="lb-avatar" aria-hidden="true">
      {/* Corp roșu */}
      <ellipse cx="60" cy="68" rx="38" ry="34" fill="#c62828" />
      {/* Linie de mijloc */}
      <line x1="60" y1="34" x2="60" y2="102" stroke="#111" strokeWidth="3.5" />
      {/* Pete negre */}
      <circle cx="42" cy="58" r="8"  fill="#111" />
      <circle cx="78" cy="58" r="8"  fill="#111" />
      <circle cx="40" cy="80" r="7"  fill="#111" />
      <circle cx="80" cy="80" r="7"  fill="#111" />
      <circle cx="60" cy="90" r="6"  fill="#111" />
      {/* Cap negru */}
      <circle cx="60" cy="34" r="18" fill="#111" />
      {/* Ochi */}
      <circle cx="52" cy="29" r="4" fill="#fff" />
      <circle cx="68" cy="29" r="4" fill="#fff" />
      <circle cx="53" cy="30" r="2" fill="#111" />
      <circle cx="69" cy="30" r="2" fill="#111" />
      {/* Antene */}
      <line x1="52" y1="17" x2="44" y2="6"  stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="68" y1="17" x2="76" y2="6"  stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="43" cy="5"  r="3" fill="#111" />
      <circle cx="77" cy="5"  r="3" fill="#111" />
    </svg>
  );
}

export default function AccountPage({ name, isAuthenticated, onLogin, onLogout, onGoShare, onGoChat }) {
  return (
    <div className="lb-page">
      <Ladybug />

      {isAuthenticated ? (
        <>
          <div className="lb-name">
            <span className="lb-badge">🐞 Ladybug</span>
            <span className="lb-username">{name}</span>
          </div>

          <div className="lb-actions">
            <button className="lb-btn" onClick={onGoShare}>📍 Partajare traseu</button>
            <button className="lb-btn" onClick={onGoChat}>💬 Chat</button>
            <button className="lb-btn outline" onClick={onLogout}>Ieșire</button>
          </div>
        </>
      ) : (
        <>
          <p className="lb-sub">Conectează-te pentru a folosi toate funcțiile.</p>
          <button className="lb-btn" onClick={onLogin}>Conectează-te</button>
        </>
      )}
    </div>
  );
}
