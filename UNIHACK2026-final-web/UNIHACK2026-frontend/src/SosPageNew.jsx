import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import './SosPageNew.css';
import sosImageBackground from './image.jpeg';

const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export default function SosPageNew({ uid, pos, onShare }) {
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

  const call112 = () => {
    window.location.href = 'tel:112';
  };

  /* Prima deschidere: setarea PIN-urilor */
  if (!pins) {
    return (
      <div className="sos-new-page">
        {/* Background image */}
        <img 
          src={sosImageBackground} 
          alt="" 
          className="sos-new-bg-image"
          aria-hidden="true"
        />
        
        <div className="sos-new-content">
          <div className="sos-new-modal">
            <h2 className="sos-new-title">Setează PIN-urile</h2>
            <input
              className="sos-new-input"
              type="password" inputMode="numeric" placeholder="PIN pentru anulare"
              value={a} onChange={(e) => setA(e.target.value)}
            />
            <input
              className="sos-new-input"
              type="password" inputMode="numeric" placeholder="PIN de constrângere"
              value={b} onChange={(e) => setB(e.target.value)}
            />
            <small className="sos-new-note">
              PIN-ul de constrângere arată alerta ca anulată, dar o trimite discret.
            </small>
            <button className="sos-new-save-btn" onClick={savePins}>Salvează PIN-urile</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sos-new-page">
      {/* Background image - exact mockup */}
      <img 
        src={sosImageBackground} 
        alt="" 
        className="sos-new-bg-image"
        aria-hidden="true"
      />
      
      {/* Transparent clickable overlays positioned over mockup elements */}
      <div className="sos-new-content">
        {ph === 'idle' && (
          <>
            {/* Button 1: Ladybug SOS trigger - positioned over center red ladybug */}
            <button 
              className="sos-new-overlay-btn sos-new-ladybug-zone" 
              onClick={begin} 
              aria-label="Trimite alertă SOS"
            />

            {/* Button 2: Share location - positioned over pink pill button */}
            <button 
              className="sos-new-overlay-btn sos-new-pink-zone" 
              onClick={onShare}
              aria-label="Partajează locația cu Ladybugs"
            />

            {/* Button 3: Call 112 - positioned over red pill button */}
            <button 
              className="sos-new-overlay-btn sos-new-red-zone" 
              onClick={call112}
              aria-label="Sună la 112"
            />
          </>
        )}

        {ph === 'count' && (
          <div className="sos-new-modal">
            <div className="sos-new-countdown">{n}</div>
            <p className="sos-new-text">Alerta pleacă la 0. Introdu PIN-ul ca să anulezi.</p>
            <input
              className="sos-new-input"
              type="password" inputMode="numeric"
              value={pin} onChange={(e) => setPin(e.target.value)}
              placeholder="Introdu PIN"
            />
            <button className="sos-new-cancel-btn" onClick={check}>Anulează alerta</button>
          </div>
        )}

        {ph === 'sent' && (
          <div className="sos-new-modal">
            <h2 className="sos-new-title">Alerta a fost înregistrată</h2>
            <p className="sos-new-text">Dacă ești în pericol, sună acum la 112.</p>
            <button className="sos-new-action-btn sos-new-red-action" onClick={call112}>
              Sună la 112
            </button>
            <button className="sos-new-back-btn" onClick={() => setPh('idle')}>Revino</button>
          </div>
        )}

        {ph === 'fail' && (
          <div className="sos-new-modal">
            <h2 className="sos-new-title sos-new-error">Alerta nu a putut fi trimisă</h2>
            <p className="sos-new-text">Sună imediat la 112.</p>
            <button className="sos-new-action-btn sos-new-red-action" onClick={call112}>
              Sună la 112
            </button>
            <button className="sos-new-retry-btn" onClick={begin}>Încearcă din nou</button>
          </div>
        )}
      </div>
    </div>
  );
}
