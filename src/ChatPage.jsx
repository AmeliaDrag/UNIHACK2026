import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

const CHAT_POLL_MS = 3000;

export default function ChatPage({ uid, userName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [error, setError]       = useState(null);
  const lastTs  = useRef(null);
  const listRef = useRef(null);
  const ROOM = 'global';

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.listMessages(ROOM, lastTs.current);
      if (data && data.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...data.filter((m) => !ids.has(m.id))];
        });
        lastTs.current = data[data.length - 1].createdAt;
        setError(null);
      }
    } catch { setError('Conexiunea cu serverul a eșuat. Se reîncearcă…'); }
  }, []);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, CHAT_POLL_MS);
    return () => clearInterval(id);
  }, [fetchMessages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      await api.sendMessage({ room: ROOM, authorId: uid, authorName: userName, text: trimmed });
      await fetchMessages();
    } catch (e) { alert('Mesajul nu a putut fi trimis: ' + e.message); setText(trimmed); }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="chat-wrap">
      <div className="chat-list" ref={listRef}>
        {error && <div className="chat-error">{error}</div>}
        {messages.length === 0 && !error && <p className="chat-empty">Niciun mesaj încă. Fii primul!</p>}
        {messages.map((m) => {
          const mine = m.authorId === uid;
          return (
            <div key={m.id} className={`chat-msg${mine ? ' mine' : ''}`}>
              {!mine && <span className="chat-author">{m.authorName || m.authorId}</span>}
              <div className="chat-bubble">{m.text}</div>
              <span className="chat-time">
                {m.createdAt ? new Date(typeof m.createdAt.toMillis === 'function' ? m.createdAt.toMillis() : m.createdAt)
                  .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          );
        })}
      </div>
      <div className="chat-input-row">
        <textarea className="chat-input" placeholder="Scrie un mesaj…" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={onKey} rows={1} aria-label="Mesaj nou" />
        <button className="chat-send b" onClick={send} aria-label="Trimite">➤</button>
      </div>
    </div>
  );
}
