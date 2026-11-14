import { useCallback, useEffect, useRef, useState } from 'react';
import { backendApi, describeApiError } from './api';
import LadybugIcon from './LadybugIcon';
import { markChatRead, useUnread } from './unread';

const POLL_MS     = 4000;    // normal polling interval
const POLL_MAX_MS = 30000;   // backoff ceiling after repeated errors

// ── Friends list hook: GET /api/v1/friends -> [{ id, name }] ──────────────────
export function useFriends(isGuest) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(!isGuest);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    if (isGuest) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await backendApi.listFriends();
      setFriends(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      console.error('[chat] friends load failed:', e);
      setError(describeApiError(e, 'ro'));
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => { load(); }, [load]);
  return { friends, loading, error, reload: load };
}

// The message DTO shape is not fixed by the contract, so read it defensively.
const senderOf = (m) => m.senderId ?? m.fromUserId ?? m.fromId ?? m.sender?.id ?? m.sender;
const recipientOf = (m) => m.recipientId ?? m.toUserId ?? m.toId ?? m.recipient?.id ?? m.recipient;
const isMine = (m, friendId) => {
  const s = senderOf(m);
  if (s != null) return String(s) !== String(friendId);
  const r = recipientOf(m);
  return r != null ? String(r) === String(friendId) : true;
};
const timeOf = (m) => m.createdAt ?? m.sentAt ?? m.timestamp ?? null;
const fmtTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── One open conversation. Polls only while mounted. ─────────────────────────
function ChatView({ friend, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [error, setError]       = useState(null);
  const [sending, setSending]   = useState(false);
  const lastId   = useRef(null);
  const inFlight = useRef(false);
  const alive    = useRef(true);
  const listRef  = useRef(null);

  const fetchNew = useCallback(async () => {
    if (inFlight.current) return true;
    inFlight.current = true;
    try {
      const data = await backendApi.messagesWith(friend.id, lastId.current);
      if (!alive.current) return true;
      if (Array.isArray(data) && data.length > 0) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...data.filter((m) => !seen.has(m.id))];
        });
        const ids = data.map((m) => Number(m.id)).filter((n) => !Number.isNaN(n));
        if (ids.length) lastId.current = Math.max(lastId.current ?? 0, ...ids);
        if (ids.length) markChatRead(friend.id, Math.max(...ids));   // you are looking at them
      }
      setError(null);
      return true;
    } catch (e) {
      console.error('[chat] poll failed:', e);
      if (alive.current) setError(describeApiError(e, 'ro'));
      return false;
    } finally {
      inFlight.current = false;
    }
  }, [friend.id]);

  useEffect(() => {
    alive.current = true;
    let timer = null;
    let delay = POLL_MS;
    // setTimeout loop: normal pace while OK, doubles (up to 30s) after errors.
    const loop = async () => {
      const ok = await fetchNew();
      if (!alive.current) return;
      delay = ok ? POLL_MS : Math.min(delay * 2, POLL_MAX_MS);
      timer = setTimeout(loop, delay);
    };
    loop();
    return () => { alive.current = false; clearTimeout(timer); };
  }, [fetchNew]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await backendApi.sendMessage({ recipientId: friend.id, text: trimmed });
      setText('');
      setError(null);
      await fetchNew();
    } catch (e) {
      console.error('[chat] send failed:', e);
      setError(describeApiError(e, 'ro'));
    } finally {
      if (alive.current) setSending(false);
    }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--mut)' }}>
        <button type="button" className="g" style={{ margin: 0 }} onClick={onBack}>← Înapoi</button>
        <LadybugIcon wings={friend.wingColor} dots={friend.dotColor} size={30} />
        <b>{friend.name}</b>
      </div>
      <div style={{ height: 340 }}>
        <div className="chat-wrap">
          <div className="chat-list" ref={listRef}>
            {messages.length === 0 && !error && <p className="chat-empty">Niciun mesaj încă. Scrie primul mesaj!</p>}
            {messages.map((m) => {
              const mine = isMine(m, friend.id);
              return (
                <div key={m.id} className={`chat-msg${mine ? ' mine' : ''}`}>
                  <div className="chat-bubble">{m.text}</div>
                  <span className="chat-time">{fmtTime(timeOf(m))}</span>
                </div>
              );
            })}
          </div>
          {error && <div className="chat-error" role="alert" style={{ padding: '6px 12px', margin: 0 }}>{error}</div>}
          <div className="chat-input-row">
            <textarea className="chat-input" placeholder="Scrie un mesaj…" value={text} rows={1}
              onChange={(e) => setText(e.target.value)} onKeyDown={onKey} aria-label="Mesaj nou" />
            <button type="button" className="chat-send b" onClick={send}
              disabled={!text.trim() || sending} aria-label="Trimite">➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Friends chat section: list of friends -> open conversation ───────────────
export default function FriendsChat({ isGuest, friends, loading, error, reload }) {
  const [open, setOpen] = useState(null);
  const unread = useUnread();

  if (isGuest) {
    return (
      <>
        <h3>Chat cu prietenii</h3>
        <div className="card">Autentifică-te cu un cont pentru a vorbi cu prietenii.</div>
      </>
    );
  }

  if (open) return <ChatView key={open.id} friend={open} onBack={() => setOpen(null)} />;

  return (
    <>
      <h3>Chat cu prietenii</h3>
      {loading && <div className="card">Se încarcă…</div>}
      {error && (
        <div className="card" role="alert" style={{ color: 'var(--red)' }}>
          {error} <button type="button" className="g" onClick={reload}>Reîncearcă</button>
        </div>
      )}
      {!loading && !error && friends.length === 0 && (
        <div className="card">Nu ai încă prieteni acceptați. Adaugă prieteni din pagina Cont.</div>
      )}
      {friends.map((f) => (
        <div className="card" key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LadybugIcon wings={f.wingColor} dots={f.dotColor} size={32} />
            <b>{f.name}</b>
            {unread.counts[f.id] > 0 && <span className="chat-badge">{unread.counts[f.id]}</span>}
          </span>
          <button type="button" className="b" style={{ padding: '8px 14px' }} onClick={() => setOpen(f)}>Chat</button>
        </div>
      ))}
    </>
  );
}