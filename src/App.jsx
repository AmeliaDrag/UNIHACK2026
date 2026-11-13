import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useSession } from './auth';
import { api } from './api';
import RouteTab from './RouteTab';
import './styles.css';

const CATS  = ['Iluminat slab', 'Persoană suspectă', 'Zonă izolată', 'Drum degradat', 'Altele'];
const ROLES = 'https://safewalk.app/roles';
const OK    = 3;
const CHAT_POLL_MS  = 3000;
const SHARE_POLL_MS = 5000;

const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

// ── Geolocation hook ──────────────────────────────────────────────────────────
function useGeo() {
  const [p, setP] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (x) => setP({ lat: x.coords.latitude, lng: x.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return p;
}

// ── Map helpers ────────────────────────────────────────────────────────────────
function Fly({ p, follow }) {
  const m = useMap();
  useEffect(() => {
    if (p) m.setView([p.lat, p.lng], Math.max(m.getZoom(), 15));
  }, [!!p, follow && p?.lat, follow && p?.lng]);
  return null;
}

function MapView({ reports, pos, follow }) {
  return (
    <MapContainer center={[45.7537, 21.2257]} zoom={13} className="map">
      <TileLayer attribution="© OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Fly p={pos} follow={follow} />
      {pos && (
        <CircleMarker center={[pos.lat, pos.lng]} radius={8} pathOptions={{ color: '#3b3f9e' }} />
      )}
      {reports
        .filter((r) => r.status !== 'resolved' && r.lat)
        .map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lng]}
            radius={10}
            pathOptions={{ color: (r.confirmations?.length || 0) >= OK ? '#c62828' : '#f5a524' }}
          >
            <Popup><b>{r.category}</b><br />{r.text}</Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}

// ── Reports tab ────────────────────────────────────────────────────────────────
function Reports({ uid, isMod, reports, pos, reload }) {
  const [cat, setCat]   = useState(CATS[0]);
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(false);

  const act = async (f) => {
    try { await f(); reload(); } catch (e) { alert(e.message); }
  };

  const send = () => {
    if (!pos) return alert('Activează locația ca să poți raporta.');
    act(async () => {
      await api.addReport({
        category: cat, text: text.trim(),
        lat: pos.lat, lng: pos.lng,
        author: anon ? null : uid,
      });
      setText('');
    });
  };

  return (
    <div className="p">
      <h2>Raportează o problemă</h2>
      <select value={cat} onChange={(e) => setCat(e.target.value)}>
        {CATS.map((c) => <option key={c}>{c}</option>)}
      </select>
      <textarea
        placeholder="Ce se întâmplă? (opțional)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <label>
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />{' '}
        Raportează anonim
      </label>
      <button className="b" onClick={send}>Trimite raportarea</button>
      <h3>Raportări recente</h3>
      {reports.length === 0 && <p>Nicio raportare încă. Prima poate fi a ta.</p>}
      {reports.map((r) => {
        const n = r.confirmations?.length || 0;
        return (
          <div className="card" key={r.id}>
            <b>{r.category}</b>{' '}
            {r.status === 'resolved' ? '(rezolvat)' : n >= OK ? '(confirmat)' : ''}
            <p>{r.text}</p>
            <small>{n}/{OK} confirmări</small><br />
            {r.status !== 'resolved' && !r.confirmations?.includes(uid) && (
              <button className="g" onClick={() => act(() => api.confirmReport(r.id, uid))}>
                Confirm
              </button>
            )}
            {isMod && r.status !== 'resolved' && (
              <button className="g" onClick={() => act(() => api.resolveReport(r.id))}>
                Marchează rezolvat
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Share tab ──────────────────────────────────────────────────────────────────
function Share({ uid, pos }) {
  const [cs, setCs]       = useState([]);
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [dest, setDest]   = useState('');
  const [mins, setMins]   = useState(30);
  const [sid, setSid]     = useState(localStorage.getItem('sid'));

  const load = () => api.listContacts(uid).then(setCs).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (sid && pos) api.updateShare(sid, pos).catch(() => {});
  }, [sid, pos?.lat, pos?.lng]);

  const add = async () => {
    if (!name.trim() || !/^\+\d{8,15}$/.test(phone))
      return alert('Completează numele și telefonul în format internațional, ex. +40712345678.');
    try {
      await api.addContact({ uid, name: name.trim(), phone });
      setName(''); setPhone(''); load();
    } catch (e) { alert(e.message); }
  };

  const start = async () => {
    if (!pos) return alert('Activează locația ca să pornești partajarea.');
    try {
      const id = await api.startShare({ uid, dest, endsAt: Date.now() + mins * 60000, pos });
      localStorage.setItem('sid', id); setSid(id);
    } catch (e) { alert(e.message); }
  };

  const stop = async () => {
    try { await api.stopShare(sid); } catch {}
    localStorage.removeItem('sid'); setSid(null);
  };

  const link = sid && `${location.origin}/?track=${sid}`;
  const send = () =>
    navigator.share
      ? navigator.share({ title: 'SafeWalk', text: 'Urmărește-mi traseul:', url: link }).catch(() => {})
      : navigator.clipboard.writeText(link).then(() => alert('Link copiat.'));

  return (
    <div className="p">
      <h2>Partajează traseul</h2>
      {sid ? (
        <>
          <div className="card">
            Partajarea este activă. Oricine are linkul vede locația ta până o oprești.
          </div>
          <button className="b" onClick={send}>Trimite linkul</button>
          <button className="g" onClick={stop}>Oprește partajarea</button>
        </>
      ) : (
        <>
          <input placeholder="Destinația" value={dest} onChange={(e) => setDest(e.target.value)} />
          <select value={mins} onChange={(e) => setMins(+e.target.value)}>
            {[15, 30, 60, 120].map((m) => <option key={m} value={m}>{m} minute</option>)}
          </select>
          <button className="b" onClick={start}>Pornește partajarea</button>
        </>
      )}
      <h3>Persoane de încredere</h3>
      {cs.map((c) => (
        <div className="card" key={c.id}>
          {c.name} · {c.phone}{' '}
          <button className="g" onClick={() => api.removeContact(c.id).then(load)}>Șterge</button>
        </div>
      ))}
      <input placeholder="Nume" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="+40712345678" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <button className="g" onClick={add}>Adaugă persoana</button>
    </div>
  );
}

// ── SOS tab ────────────────────────────────────────────────────────────────────
function SOS({ uid, pos }) {
  const [pins, setPins] = useState(JSON.parse(localStorage.getItem('pins') || 'null'));
  const [a, setA]       = useState('');
  const [b, setB]       = useState('');
  const [ph, setPh]     = useState('idle');
  const [n, setN]       = useState(5);
  const [pin, setPin]   = useState('');
  const au = useRef();

  const hush = () => {
    try { au.current?.o.stop(); au.current?.c.close(); } catch {}
    au.current = null;
    navigator.vibrate?.(0);
  };

  const fire = async (kind) => {
    hush();
    try { await api.sendAlert({ uid, kind, pos }); if (kind === 'sos') setPh('sent'); }
    catch { if (kind === 'sos') setPh('fail'); }
  };

  useEffect(() => {
    if (ph !== 'count') return;
    if (n <= 0) { fire('sos'); return; }
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [ph, n]);

  useEffect(() => () => hush(), []);

  const begin = () => {
    setN(5); setPin(''); setPh('count');
    navigator.vibrate?.([300, 200, 300, 200, 300]);
    try {
      const c = new AudioContext(), o = c.createOscillator();
      o.type = 'square'; o.frequency.value = 880;
      o.connect(c.destination); o.start();
      au.current = { c, o };
    } catch {}
  };

  const savePins = async () => {
    if (a.length < 4 || b.length < 4 || a === b)
      return alert('Alege două PIN-uri diferite, de cel puțin 4 cifre.');
    const v = { ok: await sha(a), duress: await sha(b) };
    localStorage.setItem('pins', JSON.stringify(v));
    setPins(v);
  };

  const check = async () => {
    const h = await sha(pin);
    if (h === pins.ok)          { hush(); setPh('idle'); }
    else if (h === pins.duress) { fire('duress'); setPh('idle'); }
    else                        { setPin(''); alert('PIN greșit.'); }
  };

  const call = <a className="g" href="tel:112">Sună 112</a>;

  if (!pins)
    return (
      <div className="p">
        <h2>Setează PIN-urile</h2>
        <input type="password" inputMode="numeric" placeholder="PIN pentru anulare"
          value={a} onChange={(e) => setA(e.target.value)} />
        <input type="password" inputMode="numeric" placeholder="PIN de constrângere"
          value={b} onChange={(e) => setB(e.target.value)} />
        <small>PIN-ul de constrângere arată alerta ca anulată, dar o trimite discret.</small>
        <button className="b" onClick={savePins}>Salvează PIN-urile</button>
      </div>
    );

  return (
    <div className="p c">
      {ph === 'idle' && <><button className="sos" onClick={begin}>SOS</button>{call}</>}
      {ph === 'count' && (
        <>
          <div className="big">{n}</div>
          <p>Alerta pleacă la 0. Introdu PIN-ul ca să anulezi.</p>
          <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="b" onClick={check}>Anulează alerta</button>
        </>
      )}
      {ph === 'sent' && (
        <>
          <h2>Alerta a fost înregistrată</h2>
          <p>Dacă ești în pericol, sună acum la 112.</p>
          {call}
          <button className="g" onClick={() => setPh('idle')}>Revino</button>
        </>
      )}
      {ph === 'fail' && (
        <>
          <h2>Alerta nu a putut fi trimisă</h2>
          <p>Sună imediat la 112.</p>
          {call}
          <button className="b" onClick={begin}>Încearcă din nou</button>
        </>
      )}
    </div>
  );
}

// ── Chat tab ───────────────────────────────────────────────────────────────────
function Chat({ uid, userName }) {
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
          const ids   = new Set(prev.map((m) => m.id));
          const fresh = data.filter((m) => !ids.has(m.id));
          return [...prev, ...fresh];
        });
        lastTs.current = data[data.length - 1].createdAt;
        setError(null);
      }
    } catch {
      setError('Conexiunea cu serverul a eșuat. Se reîncearcă…');
    }
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
    } catch (e) {
      alert('Mesajul nu a putut fi trimis: ' + e.message);
      setText(trimmed);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="chat-wrap">
      <div className="chat-list" ref={listRef}>
        {error && <div className="chat-error">{error}</div>}
        {messages.length === 0 && !error && (
          <p className="chat-empty">Niciun mesaj încă. Fii primul!</p>
        )}
        {messages.map((m) => {
          const mine = m.authorId === uid;
          return (
            <div key={m.id} className={`chat-msg${mine ? ' mine' : ''}`}>
              {!mine && <span className="chat-author">{m.authorName || m.authorId}</span>}
              <div className="chat-bubble">{m.text}</div>
              <span className="chat-time">
                {m.createdAt
                  ? new Date(
                      typeof m.createdAt.toMillis === 'function'
                        ? m.createdAt.toMillis()
                        : m.createdAt
                    ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </span>
            </div>
          );
        })}
      </div>
      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder="Scrie un mesaj…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          aria-label="Mesaj nou"
        />
        <button className="chat-send b" onClick={send} aria-label="Trimite">➤</button>
      </div>
    </div>
  );
}

// ── Track view (shared link) ───────────────────────────────────────────────────
function Track({ id }) {
  const [s, setS] = useState(undefined);

  useEffect(() => {
    // watchShare returns an unsubscribe function
    const unsub = api.watchShare(id, (data) => setS(data));
    return unsub;
  }, [id]);

  if (s === undefined) return <p className="c">Se încarcă…</p>;
  if (!s)              return <p className="c">Linkul nu mai este valid.</p>;

  const live = s.active && Date.now() < s.endsAt;
  return (
    <div className="track">
      <div className="p">
        <h2>{live ? 'Traseu în desfășurare' : 'Partajare încheiată'}</h2>
        <p>Destinația: {s.dest || 'nespecificată'}</p>
      </div>
      {s.pos && <MapView reports={[]} pos={s.pos} follow />}
    </div>
  );
}

// ── Root app ───────────────────────────────────────────────────────────────────
export default function App() {
  const { isLoading, isAuthenticated, user, login, logout, enterGuest, guestEnabled, isGuest } = useSession();
  const [tab, setTab]       = useState('map');
  const [reports, setReports] = useState([]);
  const pos = useGeo();

  const reload = () => api.listReports().then(setReports).catch((e) => console.error(e));

  useEffect(() => {
    if (isAuthenticated) reload();
  }, [isAuthenticated]);

  // Shared-link view requires no login
  const track = new URLSearchParams(location.search).get('track');
  if (track) return <Track id={track} />;

  if (isLoading) return <p className="c">Se încarcă…</p>;

  if (!isAuthenticated)
    return (
      <div className="login">
        <h1>SafeWalk</h1>
        <p>Hartă, raportări, partajarea traseului și SOS pentru drumurile tale prin oraș.</p>
        <button className="b" onClick={login}>Conectează-te</button>
        {guestEnabled && (
          <button className="g" onClick={enterGuest}>Continuă fără cont</button>
        )}
      </div>
    );

  const uid   = user.sub;
  const isMod = !!user[ROLES]?.includes('moderator');
  const name  = user.name || user.email || uid;

  return (
    <div className="app">
      <header>
        <b>SafeWalk</b>
        {isGuest && <span style={{ fontSize: '0.75rem', color: 'var(--mut)' }}>vizitator</span>}
        <button className="g" onClick={logout}>Ieșire</button>
      </header>
      <main>
        {tab === 'map'   && <MapView reports={reports} pos={pos} />}
        {tab === 'rep'   && <Reports uid={uid} isMod={isMod} reports={reports} pos={pos} reload={reload} />}
        {tab === 'share' && <Share uid={uid} pos={pos} />}
        {tab === 'sos'   && <SOS uid={uid} pos={pos} />}
        {tab === 'chat'  && <Chat uid={uid} userName={name} />}
        {tab === 'route' && <RouteTab userPos={pos} />}
      </main>
      <nav>
        {[['map','Hartă'],['rep','Raportează'],['share','Partajare'],['sos','SOS'],['chat','Chat'],['route','Rută']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
    </div>
  );
}
