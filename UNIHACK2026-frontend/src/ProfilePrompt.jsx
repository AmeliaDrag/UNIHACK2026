/**
 * ProfilePrompt.jsx — optional profile completion screen shown once after
 * first login when phoneNumber is null and prompt hasn't been seen before.
 *
 * Props:
 *   user            — Auth0 user object (has .name, .email, .sub)
 *   backendProfile  — { name, email, phoneNumber }
 *   onSave(profile) — called with updated backendProfile after PUT /users/me 200
 *   onSkip()        — called when user dismisses without saving
 */
import { useState } from 'react';
import { backendApi } from './api';

const PHONE_RE = /^\+?\d{9,15}$/;

export default function ProfilePrompt({ user, backendProfile, onSave, onSkip }) {
  const [name,    setName]    = useState(backendProfile?.name  || user?.name || '');
  const [phone,   setPhone]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const handleSave = async () => {
    setError(null);

    // Validate phone if entered
    if (phone.trim() && !PHONE_RE.test(phone.trim())) {
      setError('Phone format: optional +, then 9–15 digits (e.g. +40712345678).');
      return;
    }
    if (!name.trim()) {
      setError('Name cannot be blank.');
      return;
    }

    setSaving(true);
    try {
      const dto = { name: name.trim() };
      if (phone.trim()) dto.phoneNumber = phone.trim();

      const updated = await backendApi.updateMe(dto);
      onSave(updated);
    } catch (err) {
      setError(err.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'var(--bg, #1a1a2e)',
        borderRadius: '16px',
        padding: '28px 24px',
        width: '100%',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '4px' }}>🐞</div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Complete your profile</h2>
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem', opacity: 0.65 }}>
            Optional — you can skip and do this later.
          </p>
        </div>

        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Display name</label>
          <input
            className="lb-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{ margin: 0 }}
          />
        </div>

        {/* Email — read only */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Email (read-only)</label>
          <input
            className="lb-input"
            type="email"
            value={backendProfile?.email || user?.email || ''}
            readOnly
            style={{ margin: 0, opacity: 0.6, cursor: 'default' }}
          />
        </div>

        {/* Phone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Phone number (optional)</label>
          <input
            className="lb-input"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+40712345678"
            style={{ margin: 0 }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(198,40,40,0.15)',
            border: '1px solid #c62828',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.83rem',
            color: '#ff6b6b',
          }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <button
          className="lb-btn"
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop: '4px' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          className="lb-btn outline"
          onClick={onSkip}
          disabled={saving}
          style={{ marginTop: 0 }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
