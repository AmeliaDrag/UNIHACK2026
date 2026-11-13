import { useEffect, useRef, useState } from 'react';
import { api } from './api';

const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

export default function SosPage({ uid, pos }) {
  const [pins, setPins] = useState(JSON.parse(localStorage.getItem('pins') || 'null'));
  const [a, setA]       = useState('');
  const [b, setB]       = useState('');
  const [ph, setPh]     = useState('idle');
  const [n, setN]       = useState(5);
  const [pin, setPin]   = useState('');
  const au = useRef();

  const hush = () => {
    try { au.current?.o.stop(); au.current?.c.close(); } catch {}
    au.current = null; navigator.vibrate?.(0);
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
      o.connect(c.destination); o.start(); au.current = { c, o };
    } catch {}
  };

  const savePins = async () => {
    if (a.length < 4 || b.length < 4 || a === b)
      return alert('Alege două PIN-uri diferite, de cel puțin 4 cifre.');
    const v = { ok: await sha(a), duress: await sha(b) };
    localStorage.setItem('pins', JSON.stringify(v)); setPins(v);
  };

  const check = async () => {
    const h = await sha(pin);
    if (h === pins.ok)          { hush(); setPh('idle'); }
    else if (h === pins.duress) { fire('duress'); setPh('idle'); }
    else                        { setPin(''); alert('PIN greșit.'); }
  };

  const call = <a className="g" href="tel:112">Sună 112</a>;

  if (!pins) return (
    <div className="p">
      <h2>Setează PIN-urile</h2>
      <input type="password" inputMode="numeric" placeholder="PIN pentru anulare" value={a} onChange={(e) => setA(e.target.value)} />
      <input type="password" inputMode="numeric" placeholder="PIN de constrângere" value={b} onChange={(e) => setB(e.target.value)} />
      <small>PIN-ul de constrângere arată alerta ca anulată, dar o trimite discret.</small>
      <button className="b" onClick={savePins}>Salvează PIN-urile</button>
    </div>
  );

  return (
    <div className="p c">
      {ph === 'idle'  && <><button className="sos" onClick={begin}>SOS</button>{call}</>}
      {ph === 'count' && (<><div className="big">{n}</div><p>Alerta pleacă la 0. Introdu PIN-ul ca să anulezi.</p>
        <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
        <button className="b" onClick={check}>Anulează alerta</button></>)}
      {ph === 'sent'  && (<><h2>Alerta a fost înregistrată</h2><p>Dacă ești în pericol, sună acum la 112.</p>{call}
        <button className="g" onClick={() => setPh('idle')}>Revino</button></>)}
      {ph === 'fail'  && (<><h2>Alerta nu a putut fi trimisă</h2><p>Sună imediat la 112.</p>{call}
        <button className="b" onClick={begin}>Încearcă din nou</button></>)}
    </div>
  );
}
