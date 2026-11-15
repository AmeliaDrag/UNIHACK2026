import { useEffect, useRef, useState } from 'react';
import { api, backendApi, describeApiError } from './api';
import './SosPageNew.css';
import sosImageBackground from './image.jpeg';

const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/**
 * SOS screen: image.jpeg is the whole background; three invisible buttons sit on top of the
 * drawn ladybug and the two pills. PINs, countdown, siren and the alert call work as before.
 */
export default function SosPageNew({ uid, pos, onShare, isGuest }) {
  const [pins, setPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pins') || 'null'); }
    catch { return null; }
  });
  const [a, setA]     = useState('');
  const [b, setB]     = useState('');
  const [ph, setPh]   = useState('idle'); // idle | count | sent | fail
  const [n, setN]     = useState(5);
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState(null);   // inline error text (replaces alert())
  const au = useRef();

  /* Stop the siren and the vibration */
  const hush = () => {
    try { au.current?.o.stop(); au.current?.c.close(); } catch { /* already stopped */ }
    au.current = null;
    navigator.vibrate?.(0);
  };

  /* Send the alert: real accounts use the backend (POST /api/v1/sos), guests use the local mock */
  const fire = async (kind) => {
    hush();
    try {
      if (isGuest) {
        await api.sendAlert({ uid, kind, pos });
      } else {
        if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) {
          throw new Error('Your location is not available. Turn on location access.');
        }
        await backendApi.sendSos({ latitude: pos.lat, longitude: pos.lng });
      }
      if (kind === 'sos') { setMsg(null); setPh('sent'); }
    } catch (e) {
      console.error('[sos] alert failed:', e);
      if (kind === 'sos') { setMsg(e.status !== undefined ? describeApiError(e, 'en') : e.message); setPh('fail'); }
    }
  };

  /* Countdown */
  useEffect(() => {
    if (ph !== 'count') return undefined;
    if (n <= 0) { fire('sos'); return undefined; }
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [ph, n]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Silence the siren when leaving the page */
  useEffect(() => () => hush(), []);

  const begin = () => {
    setN(5); setPin(''); setMsg(null); setPh('count');
    navigator.vibrate?.([300, 200, 300, 200, 300]);
    try {
      const c = new AudioContext();
      const o = c.createOscillator();
      o.type = 'square';
      o.frequency.value = 880;
      o.connect(c.destination);
      o.start();
      au.current = { c, o };
    } catch { /* audio not available */ }
  };

  const savePins = async () => {
    if (a.length < 4 || b.length < 4 || a === b) {
      setMsg('Choose two different PINs of at least 4 digits.');
      return;
    }
    const v = { ok: await sha(a), duress: await sha(b) };
    localStorage.setItem('pins', JSON.stringify(v));
    setMsg(null);
    setPins(v);
  };

  const check = async () => {
    const h = await sha(pin);
    if (h === pins.ok)          { hush(); setMsg(null); setPh('idle'); }
    else if (h === pins.duress) { fire('duress'); setMsg(null); setPh('idle'); }
    else                        { setPin(''); setMsg('Wrong PIN.'); }
  };

  const call112 = () => { window.location.href = 'tel:112'; };

  const background = (
    <img src={sosImageBackground} alt="" className="sos-new-bg-image" aria-hidden="true" draggable="false" />
  );

  /* First visit: set the PINs */
  if (!pins) {
    return (
      <div className="sos-new-page">
        {background}
        <div className="sos-new-content">
          <div className="sos-new-modal">
            <h2 className="sos-new-title">Set your PINs</h2>
            <input
              className="sos-new-input"
              type="password" inputMode="numeric" placeholder="Cancel PIN"
              value={a} onChange={(e) => setA(e.target.value)}
            />
            <input
              className="sos-new-input"
              type="password" inputMode="numeric" placeholder="Duress PIN"
              value={b} onChange={(e) => setB(e.target.value)}
            />
            <small className="sos-new-note">
              The duress PIN makes the alert look cancelled, but it is still sent quietly.
            </small>
            {msg && <div className="sos-new-inline-error" role="alert">{msg}</div>}
            <button type="button" className="sos-new-save-btn" onClick={savePins}>Save PINs</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sos-new-page">
      {background}
      <div className="sos-new-content">
        {ph === 'idle' && (
          <>
            {/* 1: the red ladybug starts the SOS countdown */}
            <button
              type="button"
              className="sos-new-overlay-btn sos-new-ladybug-zone"
              onClick={begin}
              aria-label="Send SOS alert"
            />
            {/* 2: the pink pill shares your location with your Ladybugs */}
            <button
              type="button"
              className="sos-new-overlay-btn sos-new-pink-zone"
              onClick={onShare}
              aria-label="Share location with Ladybugs"
            />
            {/* 3: the red pill calls 112 */}
            <button
              type="button"
              className="sos-new-overlay-btn sos-new-red-zone"
              onClick={call112}
              aria-label="Call 112"
            />
          </>
        )}

        {ph === 'count' && (
          <div className="sos-new-modal">
            <div className="sos-new-countdown">{n}</div>
            <p className="sos-new-text">The alert is sent at 0. Enter your PIN to cancel.</p>
            <input
              className="sos-new-input"
              type="password" inputMode="numeric"
              value={pin} onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
            />
            {msg && <div className="sos-new-inline-error" role="alert">{msg}</div>}
            <button type="button" className="sos-new-cancel-btn" onClick={check}>Cancel alert</button>
          </div>
        )}

        {ph === 'sent' && (
          <div className="sos-new-modal">
            <h2 className="sos-new-title">Alert registered</h2>
            <p className="sos-new-text">If you are in danger, call 112 now.</p>
            <button type="button" className="sos-new-action-btn sos-new-red-action" onClick={call112}>
              Call 112
            </button>
            <button type="button" className="sos-new-back-btn" onClick={() => setPh('idle')}>Back</button>
          </div>
        )}

        {ph === 'fail' && (
          <div className="sos-new-modal">
            <h2 className="sos-new-title sos-new-error">The alert could not be sent</h2>
            <p className="sos-new-text">Call 112 right away.</p>
            {msg && <div className="sos-new-inline-error" role="alert">{msg}</div>}
            <button type="button" className="sos-new-action-btn sos-new-red-action" onClick={call112}>
              Call 112
            </button>
            <button type="button" className="sos-new-retry-btn" onClick={begin}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}