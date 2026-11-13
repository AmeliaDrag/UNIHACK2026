import { useState } from 'react';
import { api } from './api';

const CATS = ['Iluminat slab', 'Persoană suspectă', 'Zonă izolată', 'Drum degradat', 'Altele'];
const OK = 3;

export default function ReportsPage({ uid, isMod, reports, pos, reload }) {
  const [cat, setCat]   = useState(CATS[0]);
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(false);

  const act = async (f) => {
    try { await f(); reload(); } catch (e) { alert(e.message); }
  };

  const send = () => {
    if (!pos) return alert('Activează locația ca să poți raporta.');
    act(async () => {
      await api.addReport({ category: cat, text: text.trim(), lat: pos.lat, lng: pos.lng, author: anon ? null : uid });
      setText('');
    });
  };

  return (
    <div className="p">
      <h2>Raportează o problemă</h2>
      <select value={cat} onChange={(e) => setCat(e.target.value)}>
        {CATS.map((c) => <option key={c}>{c}</option>)}
      </select>
      <textarea placeholder="Ce se întâmplă? (opțional)" value={text} onChange={(e) => setText(e.target.value)} />
      <label>
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Raportează anonim
      </label>
      <button className="b" onClick={send}>Trimite raportarea</button>
      <h3>Raportări recente</h3>
      {reports.length === 0 && <p>Nicio raportare încă. Prima poate fi a ta.</p>}
      {reports.map((r) => {
        const n = r.confirmations?.length || 0;
        return (
          <div className="card" key={r.id}>
            <b>{r.category}</b> {r.status === 'resolved' ? '(rezolvat)' : n >= OK ? '(confirmat)' : ''}
            <p>{r.text}</p>
            <small>{n}/{OK} confirmări</small><br />
            {r.status !== 'resolved' && !r.confirmations?.includes(uid) && (
              <button className="g" onClick={() => act(() => api.confirmReport(r.id, uid))}>Confirm</button>
            )}
            {isMod && r.status !== 'resolved' && (
              <button className="g" onClick={() => act(() => api.resolveReport(r.id))}>Marchează rezolvat</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
