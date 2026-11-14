import { useCallback, useEffect, useState } from 'react';
import { api, backendApi, describeApiError } from './api';
import LadybugIcon from './LadybugIcon';
import './AccountPage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Friendly text for the backend's known messages; everything else goes through describeApiError.
function explain(err) {
  const server = err.message;
  if (err.status === 404 && server === 'Contact user not found')
    return 'No user with that email. Your friend must sign in to the app once first.';
  if (err.status === 400 && server === 'You cannot add yourself') return 'You cannot add yourself.';
  if (err.status === 409 && server === 'Contact already exists') return 'You already invited this person.';
  return describeApiError(err, 'en');
}
/**
 * FriendsSection - real friends via the backend's trusted-contacts API.
 * Guest mode has no backend account, so it falls back to the local mock list.
 */
export default function FriendsSection({ uid, isGuest }) {
  return isGuest ? <GuestFriends uid={uid} /> : <BackendFriends />;
}

function BackendFriends() {
  const [sent, setSent]         = useState([]);
  const [received, setReceived] = useState([]);
  const [email, setEmail]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState(null); // { ok: bool, text }
  const [loadErr, setLoadErr]   = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([backendApi.sentContacts(), backendApi.receivedContacts()]);
      setSent(s); setReceived(r); setLoadErr(null);
    } catch (e) {
      console.error('[friends] load error:', e);
      setLoadErr(explain(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (fn, okText) => {
    setBusy(true); setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ ok: true, text: okText });
      await load();
      return true;
    } catch (e) {
      console.error('[friends] action error:', e);
      setMsg({ ok: false, text: explain(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) { setMsg({ ok: false, text: 'Enter a valid email address.' }); return; }
    const ok = await run(() => backendApi.addContact({ contactEmail: value }), 'Invitation sent.');
    if (ok) setEmail('');
  };

  // Build the lists. Each relationship is seen from the other person's side.
  const incoming = received.filter((c) => c.status === 'PENDING');
  const outgoing = sent.filter((c) => c.status === 'PENDING');

  const friendMap = new Map(); // dedupe by the other person's email
  sent.filter((c) => c.status === 'ACCEPTED').forEach((c) =>
    friendMap.set(c.contactUserEmail, { id: c.id, name: c.contactUserName, email: c.contactUserEmail, wings: c.contactUserWingColor, dots: c.contactUserDotColor }));
  received.filter((c) => c.status === 'ACCEPTED').forEach((c) => {
    if (!friendMap.has(c.userEmail)) friendMap.set(c.userEmail, { id: c.id, name: c.userName, email: c.userEmail, wings: c.userWingColor, dots: c.userDotColor });
  });
  const friends = [...friendMap.values()];

  return (
    <div className="lb-section" style={{ padding: '12px', gap: '8px' }}>
      <h2 className="lb-section-title">🐞 Ladybug Friends</h2>
      <p className="lb-sub-text">Add a friend by the email they signed up with.</p>

      {loadErr && <div className="lb-msg bad">{loadErr}</div>}

      {incoming.length > 0 && (
        <>
          <h3 className="lb-subhead">Friend requests</h3>
          {incoming.map((c) => (
            <div className="lb-friend-card" key={c.id}>
              <LadybugIcon wings={c.userWingColor} dots={c.userDotColor} />
              <div className="lb-friend-info">
                <b>{c.userName}</b>
                <small>{c.userEmail}</small>
              </div>
              <button className="lb-mini accept" disabled={busy}
                onClick={() => run(() => backendApi.acceptContact(c.id), 'Friend added.')}>Accept</button>
              <button className="lb-friend-remove" disabled={busy} title="Decline"
                onClick={() => run(() => backendApi.deleteContact(c.id))}>✕</button>
            </div>
          ))}
        </>
      )}

      <h3 className="lb-subhead">Friends</h3>
      <div className="lb-friend-list">
        {friends.length === 0 && !loadErr && <p className="lb-empty">No friends yet.</p>}
        {friends.map((f) => (
          <div className="lb-friend-card" key={f.email}>
            <LadybugIcon wings={f.wings} dots={f.dots} />
            <div className="lb-friend-info">
              <b>{f.name}</b>
              <small>{f.email}</small>
            </div>
            <button className="lb-friend-remove" disabled={busy} title="Remove"
              onClick={() => run(() => backendApi.deleteContact(f.id))}>✕</button>
          </div>
        ))}
      </div>

      {outgoing.length > 0 && (
        <>
          <h3 className="lb-subhead">Waiting for reply</h3>
          {outgoing.map((c) => (
            <div className="lb-friend-card" key={c.id}>
              <LadybugIcon wings={c.contactUserWingColor} dots={c.contactUserDotColor} />
              <div className="lb-friend-info">
                <b>{c.contactUserName}</b>
                <small>{c.contactUserEmail} · pending</small>
              </div>
              <button className="lb-friend-remove" disabled={busy} title="Cancel invite"
                onClick={() => run(() => backendApi.deleteContact(c.id))}>✕</button>
            </div>
          ))}
        </>
      )}

      <form className="lb-friend-add" onSubmit={(e) => { e.preventDefault(); invite(); }} noValidate>
        <input className="lb-input" type="email" placeholder="Friend's email" autoComplete="off"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        {msg && <div className={`lb-msg ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</div>}
        <button type="submit" className="lb-btn" disabled={busy || !email.trim()}>
          {busy ? 'Please wait…' : '＋ Add friend'}
        </button>
      </form>
    </div>
  );
}

// Guest mode: local mock list (json-server), name + optional phone.
function GuestFriends({ uid }) {
  const [friends, setFriends] = useState([]);
  const [fName, setFName]     = useState('');
  const [fPhone, setFPhone]   = useState('');
  const [msg, setMsg]         = useState(null);

  const load = () => api.listFriends(uid).then(setFriends).catch(() => {});
  useEffect(() => { load(); }, [uid]);

  const add = async () => {
    if (!fName.trim()) { setMsg({ ok: false, text: 'Enter a friend name.' }); return; }
    try {
      await api.addFriend({ uid, name: fName.trim(), phone: fPhone.trim() || null });
      setFName(''); setFPhone(''); setMsg(null); load();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  const remove = async (id) => {
    try { await api.removeFriend(id); load(); } catch (e) { setMsg({ ok: false, text: e.message }); }
  };

  return (
    <div className="lb-section" style={{ padding: '12px', gap: '8px' }}>
      <h2 className="lb-section-title">🐞 Ladybug Friends</h2>
      <p className="lb-sub-text">Guest mode: friends are stored on this device only.</p>
      <div className="lb-friend-list">
        {friends.length === 0 && <p className="lb-empty">No friends yet.</p>}
        {friends.map((f) => (
          <div className="lb-friend-card" key={f.id}>
            <MiniBug />
            <div className="lb-friend-info"><b>{f.name}</b>{f.phone && <small>{f.phone}</small>}</div>
            <button className="lb-friend-remove" onClick={() => remove(f.id)}>✕</button>
          </div>
        ))}
      </div>
      <form className="lb-friend-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="lb-input" placeholder="Name" value={fName} onChange={(e) => setFName(e.target.value)} />
        <input className="lb-input" placeholder="Phone (optional)" inputMode="tel" value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
        {msg && <div className={`lb-msg ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</div>}
        <button type="submit" className="lb-btn">＋ Add friend</button>
      </form>
    </div>
  );
}