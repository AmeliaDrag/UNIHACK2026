import { useEffect, useRef, useState } from 'react';
import { backendApi, describeApiError } from './api';
import FriendsChat, { useFriends } from './FriendsChat';
import LadybugIcon from './LadybugIcon';

const RESEND_MS = 5 * 60 * 1000;          // resend location every 5 minutes
const PLAN_KEY  = 'sharePlan';
const mapsLink  = (p) => `https://maps.google.com/?q=${p.lat},${p.lng}`;

function loadPlan() {
  try {
    const p = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null');
    return p && p.endsAt > Date.now() ? p : null;
  } catch { return null; }
}

// Sends one chat message to each friend id. Returns the names that failed + first error.
async function sendToAll(ids, text) {
  const results = await Promise.allSettled(
    ids.map((id) => backendApi.sendMessage({ recipientId: id, text })),
  );
  const failed = [];
  let firstError = null;
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      failed.push(ids[i]);
      firstError = firstError || describeApiError(r.reason, 'ro');
    }
  });
  return { failed, firstError };
}

export default function SharePage({ uid, pos, isGuest }) {
  const { friends, loading, error: friendsError, reload } = useFriends(isGuest);

  const [dest, setDest]         = useState('');
  const [mins, setMins]         = useState(30);
  const [picked, setPicked]     = useState([]);          // selected friend ids
  const [plan, setPlan]         = useState(loadPlan);    // active sharing: { dest, mins, endsAt, ids }
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);
  const [info, setInfo]         = useState(null);

  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  const nameOf = (id) => friends.find((f) => f.id === id)?.name || `#${id}`;
  const toggle = (id) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const clearPlan = () => { localStorage.removeItem(PLAN_KEY); setPlan(null); };

  // While sharing: resend the location every few minutes, stop when time is up.
  useEffect(() => {
    if (!plan) return undefined;
    const resend = async () => {
      const p = posRef.current;
      if (!p) return;
      const { failed, firstError } = await sendToAll(plan.ids, `Locația mea actualizată: ${mapsLink(p)}`);
      if (failed.length) setError(`Nu am putut trimite către ${failed.map(nameOf).join(', ')}: ${firstError}`);
    };
    const tick   = setInterval(resend, RESEND_MS);
    const expire = setTimeout(() => {
      clearPlan();
      setInfo('Durata partajării s-a încheiat.');
    }, Math.max(0, plan.endsAt - Date.now()));
    return () => { clearInterval(tick); clearTimeout(expire); };
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setError(null); setInfo(null);
    if (!dest.trim())        return setError('Introdu destinația.');
    if (picked.length === 0) return setError('Alege cel puțin un prieten.');
    if (!pos)                return setError('Activează locația pentru a începe partajarea.');

    setBusy(true);
    const text = `Merg spre ${dest.trim()}, estimat ${mins} min. Locația curentă: ${mapsLink(pos)}`;
    const { failed, firstError } = await sendToAll(picked, text);
    setBusy(false);

    if (failed.length === picked.length) {
      return setError(`Mesajul nu a putut fi trimis: ${firstError}`);
    }
    const next = { dest: dest.trim(), mins, endsAt: Date.now() + mins * 60000, ids: picked.filter((id) => !failed.includes(id)) };
    localStorage.setItem(PLAN_KEY, JSON.stringify(next));
    setPlan(next);
    if (failed.length) setError(`Nu am putut trimite către ${failed.map(nameOf).join(', ')}: ${firstError}`);
  };

  const stop = async () => {
    setError(null);
    setBusy(true);
    const { failed, firstError } = await sendToAll(plan.ids, 'Am ajuns în siguranță.');
    setBusy(false);
    clearPlan();
    setInfo('Partajarea a fost oprită.');
    if (failed.length) setError(`Nu am putut anunța ${failed.map(nameOf).join(', ')}: ${firstError}`);
  };

  return (
    <div className="p">
      <h2>Partajează traseul</h2>

      {isGuest && <div className="card">Autentifică-te cu un cont pentru a partaja traseul cu prietenii.</div>}

      {!isGuest && (plan ? (
        <>
          <div className="card">
            Ai trimis locația către {plan.ids.map(nameOf).join(', ')}. Destinație: <b>{plan.dest}</b>.
            Se retrimite la fiecare 5 minute până la{' '}
            {new Date(plan.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
            <br /><small>Aceasta nu este urmărire în timp real, ci mesaje trimise în chat.</small>
          </div>
          <button type="button" className="b" onClick={stop} disabled={busy}>
            {busy ? 'Se trimite…' : 'Oprește partajarea'}
          </button>
        </>
      ) : (
        <>
          <input placeholder="Destinația (ex: Acasă)" value={dest} onChange={(e) => setDest(e.target.value)} />
          <select value={mins} onChange={(e) => setMins(+e.target.value)}>
            {[15, 30, 60, 120].map((m) => <option key={m} value={m}>{m} minute</option>)}
          </select>

          <b>Trimite către</b>
          {loading && <div className="card">Se încarcă prietenii…</div>}
          {!loading && friends.length === 0 && !friendsError && (
            <div className="card">Nu ai încă prieteni acceptați. Adaugă prieteni din pagina Cont.</div>
          )}
          {friends.map((f) => (
            <label key={f.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={picked.includes(f.id)} onChange={() => toggle(f.id)} />
              <LadybugIcon wings={f.wingColor} dots={f.dotColor} size={26} />
              {f.name}
            </label>
          ))}

          <button type="button" className="b" onClick={start} disabled={busy || friends.length === 0}>
            {busy ? 'Se trimite…' : 'Începe partajarea'}
          </button>
        </>
      ))}

      {error && <div className="card" role="alert" style={{ color: 'var(--red)' }}>{error}</div>}
      {info && <div className="card">{info}</div>}

      <FriendsChat isGuest={isGuest} friends={friends} loading={loading} error={friendsError} reload={reload} />
    </div>
  );
}