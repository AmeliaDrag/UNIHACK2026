import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import './SosPage.css';

const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/* Decorative dots */
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
  const [a,    setA]   = useState('');
  const [b,    setB]   = useState('');
  // ph: idle | count | sent | fail
  const [ph,   setPh]  = useState('idle');
  const [n,    setN]   = useState(3);
  const [pin,  setPin] = useState('');
  const [sentAlert, setSentAlert] = useState(null);  // { id, status }
  const au = useRef();

  /* Stop siren and vibration */
  const hush = () => {
    try { au.current?.o.stop(); au.current?.c.close(); } catch {}
    au.current = null;
    navigator.vibrate?.(0);
  };

  const fire = async () => {
    hush();
    try {
      const result = await api.sendSos({ latitude: pos?.lat ?? 0, longitude: pos?.lng ?? 0 });
      setSentAlert(result ? { id: result.id, status: result.status } : null);
      setPh('sent');
    } catch {
      setPh('fail');
    }
  };

  /* 3-second countdown */
  useEffect(() => {
    if (ph !== 'count') return;
    if (n <= 0) { fire(); return; }
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [ph, n]);

  /* Clean up siren when leaving page */
  useEffect(() => () => hush(), []);

  const begin = () => {
    setN(3); setPin(''); setSentAlert(null); setPh('count');
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
      return alert('Choose two different PINs of at least 4 digits.');
    const v = { ok: await sha(a), duress: await sha(b) };
    localStorage.setItem('pins', JSON.stringify(v));
    setPins(v);
  };

  const check = async () => {
    const h = await sha(pin);
    if (h === pins.ok) {
      hush(); setPh('idle');
    } else if (h === pins.duress) {
      // Duress PIN: silently fire SOS, appear to cancel
      fire();
      setPh('idle');
    } else {
      setPin(''); alert('Wrong PIN.');
    }
  };

  const call = <a className="sos-call" href="tel:112">Call 112</a>;

  /* First open: set up PINs */
  if (!pins) {
    return (
      <div className="sos-page">
        <div className="sos-content">
          <h2>Set up PINs</h2>
          <input
            type="password" inputMode="numeric" placeholder="Cancel PIN"
            value={a} onChange={(e) => setA(e.target.value)}
          />
          <input
            type="password" inputMode="numeric" placeholder="Duress PIN"
            value={b} onChange={(e) => setB(e.target.value)}
          />
          <small className="sos-note">
            The duress PIN makes the alert appear cancelled but sends it silently.
          </small>
          <button className="b" onClick={savePins}>Save PINs</button>
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
            <button className="sos-btn" onClick={begin} aria-label="Send SOS alert">
              <SirenIcon />
              SOS
            </button>
            <button className="sos-share" onClick={onShare}>
              <PinIcon />
              <span>Share location<br />with lady bugs</span>
            </button>
            {call}
          </>
        )}

        {ph === 'count' && (
          <>
            <div className="sos-count">{n}</div>
            <p>Alert sends at 0. Enter your PIN to cancel.</p>
            <input
              type="password" inputMode="numeric"
              value={pin} onChange={(e) => setPin(e.target.value)}
            />
            <button className="b" onClick={check}>Cancel alert</button>
          </>
        )}

        {ph === 'sent' && (
          <>
            <h2>Alert sent</h2>
            {sentAlert && (
              <p style={{ fontSize: '0.85rem', color: '#555' }}>
                Alert ID: {sentAlert.id} · Status: {sentAlert.status}
              </p>
            )}
            <p>If you are in danger, call 112 now.</p>
            {call}
            <button className="g" onClick={() => setPh('idle')}>Go back</button>
          </>
        )}

        {ph === 'fail' && (
          <>
            <h2>Alert could not be sent</h2>
            <p>Call 112 immediately.</p>
            {call}
            <button className="b" onClick={begin}>Try again</button>
          </>
        )}
      </div>
    </div>
  );
}
