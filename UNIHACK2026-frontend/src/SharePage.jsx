import { useEffect, useState } from 'react';
import { api } from './api';

export default function SharePage({ uid, pos }) {
  const [cs, setCs]       = useState([]);
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [dest, setDest]   = useState('');
  const [mins, setMins]   = useState(30);
  const [sid, setSid]     = useState(localStorage.getItem('sid'));

  const load = () => api.listContacts(uid).then(setCs).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { if (sid && pos) api.updateShare(sid, pos).catch(() => {}); }, [sid, pos?.lat, pos?.lng]);

  const add = async () => {
    if (!name.trim() || !/^\+\d{8,15}$/.test(phone))
      return alert('Enter the name and phone in international format, e.g. +40712345678.');
    try { await api.addContact({ uid, name: name.trim(), phone }); setName(''); setPhone(''); load(); }
    catch (e) { alert(e.message); }
  };

  const start = async () => {
    if (!pos) return alert('Enable location to start sharing.');
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
      ? navigator.share({ title: 'LadyMap', text: 'Track my route:', url: link }).catch(() => {})
      : navigator.clipboard.writeText(link).then(() => alert('Link copied.'));

  return (
    <div className="p">
      <h2>Share route</h2>
      {sid ? (<>
        <div className="card">Sharing is active. Anyone with the link can see your location until you stop.</div>
        <button className="b" onClick={send}>Send link</button>
        <button className="g" onClick={stop}>Stop sharing</button>
      </>) : (<>
        <input placeholder="Destination" value={dest} onChange={(e) => setDest(e.target.value)} />
        <select value={mins} onChange={(e) => setMins(+e.target.value)}>
          {[15, 30, 60, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
        </select>
        <button className="b" onClick={start}>Start sharing</button>
      </>)}
      <h3>Trusted contacts</h3>
      {cs.map((c) => (
        <div className="card" key={c.id}>{c.name} · {c.phone}{' '}
          <button className="g" onClick={() => api.removeContact(c.id).then(load)}>Delete</button>
        </div>
      ))}
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="+40712345678" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <button className="g" onClick={add}>Add contact</button>
    </div>
  );
}
