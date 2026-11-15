import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import './SosPage.css';

const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/* Buline decorative (poziție, mărime, cu/fără puncte negre) */
const DOTS = [
  { t: '8%',  l: '12%',  s: 34 },
  { t: '4%',  l: '48%',  s: 30 },
  { t: '2%',  r: '-8%',  s: 110, spots: true },
  { t: '22%', l: '-10%', s: 110, spots: true },
  { t: '26%', r: '22%',  s: 30 },
  { t: '60%', r: '4%',   s: 44 },
  { t: '64%', l: '4%',   s: 34 },
  { b: '-6%', l: '-10%', s: 170, spots: true },
  { b: '10%', l: '38%',  s: 40 },
  { b: '14%', r: '8%',   s: 30 },
  { b: '2%',  r: '22%',  s: 36 },
];

const SirenIcon = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="#fff" aria-hidden="true">
    <path d="M20 44a12 12 0 0 1 24 0v4H20z" />
    <rect x="14" y="50" width="36" height="6" rx="3" />
    <path
      d="M32 8v8M14 16l5 6M50 16l-5 6M6 34h8M50 34h8"
      stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none"
    />
  </svg>
);

const PinIcon = () => (
  <svg
    width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c62828"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
  >
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export default function SosPage({ uid, pos, onShare }) {
  const [pins, setPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pins') || 'null'); }
    catch { return null; }
  });
  const [a, setA]     = useState('');
  const [b, setB]     = useState('');
  const [ph, setPh]   = useState('idle'); // idle | count | sent | fail
  const [n, setN]     = useState(5);
  const [pin, setPin] = useState('');
  const au = useRef();

  /* Oprește sirena și vibrația */
  const hush = () => {
    try { au.current?.o.stop(); au.current?.c.close(); } catch {}
    au.current = null;
    navigator.vibrate?.(0);
  };

  const fire = async (kind) => {
    hush();
    try {
      await api.sendAlert({ uid, kind, pos });
      if (kind === 'sos') setPh('sent');
    } catch {
      if (kind === 'sos') setPh('fail');
    }
  };

  /* Numărătoarea inversă */
  useEffect(() => {
    if (ph !== 'count') return;
    if (n <= 0) { fire('sos'); return; }
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [ph, n]);

  /* Curăță sirena la ieșirea din pagină */
  useEffect(() => () => hush(), []);

  const begin = () => {
    setN(5); setPin(''); setPh('count');
    navigator.vibrate?.([300, 200, 300, 200, 300]);
    try {
      const c = new AudioContext();
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = 880;
      o.connect(c.destination);
      o.start();
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

  const call = <a className="sos-call" href="tel:112">Sună 112</a>;

  /* Prima deschidere: setarea PIN-urilor */
  if (!pins) {
    return (
      <div className="sos-page">
        <div className="sos-content">
          <h2>Setează PIN-urile</h2>
          <input
            type="password" inputMode="numeric" placeholder="PIN pentru anulare"
            value={a} onChange={(e) => setA(e.target.value)}
          />
          <input
            type="password" inputMode="numeric" placeholder="PIN de constrângere"
            value={b} onChange={(e) => setB(e.target.value)}
          />
          <small className="sos-note">
            PIN-ul de constrângere arată alerta ca anulată, dar o trimite discret.
          </small>
          <button className="b" onClick={savePins}>Salvează PIN-urile</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sos-page">
      {DOTS.map((d, i) => (
        <span
          key={i}
          className={`sos-dot${d.spots ? ' spots' : ''}`}
          style={{ top: d.t, bottom: d.b, left: d.l, right: d.r, width: d.s, height: d.s }}
        />
      ))}

      <div className="sos-content">
        {ph === 'idle' && (
          <>
            <button className="sos-btn" onClick={begin} aria-label="Trimite alertă SOS">
              <SirenIcon />
              SOS
            </button>
            <button className="sos-share" onClick={onShare}>
              <PinIcon />
              <span>Partajează locația<br />cu lady bugs</span>
            </button>
            {call}
          </>
        )}

        {ph === 'count' && (
          <>
            <div className="sos-count">{n}</div>
            <p>Alerta pleacă la 0. Introdu PIN-ul ca să anulezi.</p>
            <input
              type="password" inputMode="numeric"
              value={pin} onChange={(e) => setPin(e.target.value)}
            />
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
    </div>
  );
}
