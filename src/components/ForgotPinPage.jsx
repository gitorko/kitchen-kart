import { useState } from 'react';
import { T, INPUT, LABEL } from '../theme.js';
import { requestPinReset } from '../lib/authApi.js';
import { buildWhatsAppShareLink } from '../lib/format.js';

export default function ForgotPinPage({ onGoLogin }) {
  const [apartment, setApartment] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { code }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!apartment.trim()) return setError('Flat number is required.');
    if (!/^\d{4}$/.test(newPin)) return setError('New PIN must be exactly 4 digits.');
    if (newPin !== confirmPin) return setError('PINs do not match.');

    setLoading(true);
    try {
      const { code } = await requestPinReset({ apartment: apartment.trim(), newPin });
      setResult({ code });
    } catch (err) {
      setError(err.message || 'Could not request a PIN reset');
    }
    setLoading(false);
  }

  if (result) {
    const link = `${window.location.origin}/?approve=${result.code}`;
    const shareText = `Hi! I forgot my Kitchen Kart PIN and requested a reset. Can you approve it?\nCode: ${result.code}\n${link}`;
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🔑</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: T.text, marginBottom: 6 }}>PIN reset requested</div>
          <p style={{ fontSize: 13.5, color: T.textSub, marginBottom: 18 }}>
            Your old PIN still works until an admin approves this. Share the code below to get it approved.
          </p>
          <div style={{ background: T.primaryBg, borderRadius: 12, padding: '16px', fontSize: 26, fontWeight: 800, letterSpacing: 4, color: T.primaryDark, marginBottom: 18 }}>
            {result.code}
          </div>
          <a
            href={buildWhatsAppShareLink(shareText)} target="_blank" rel="noreferrer"
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box', padding: '13px', borderRadius: 10,
              background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', marginBottom: 10,
            }}
          >
            💬 Share on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(link)}
            style={{ width: '100%', padding: '11px', borderRadius: 10, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSub, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', marginBottom: 14 }}
          >
            Copy link instead
          </button>
          <button type="button" onClick={onGoLogin} style={{ background: 'none', border: 'none', color: T.primary, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5 }}>
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
        <button type="button" onClick={onGoLogin} style={{ background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 14 }}>
          ← Back to sign in
        </button>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🔑</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Reset your PIN</div>
          <div style={{ fontSize: 13, color: T.textSub, marginTop: 4 }}>Pick a new PIN — an admin will need to approve it.</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LABEL}>Flat Number</label>
            <input autoFocus style={INPUT} value={apartment} onChange={e => setApartment(e.target.value)} placeholder="e.g. B-204" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>New PIN</label>
              <input type="password" inputMode="numeric" style={{ ...INPUT, letterSpacing: 3 }} value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Confirm New PIN</label>
              <input type="password" inputMode="numeric" style={{ ...INPUT, letterSpacing: 3 }} value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" />
            </div>
          </div>
          {error && (
            <div style={{ fontSize: 13, color: T.red, background: T.redBg, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>{error}</div>
          )}
          <button type="submit" disabled={loading}
            style={{ background: loading ? '#fdba74' : T.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            {loading ? 'Requesting…' : 'Request PIN Reset'}
          </button>
        </form>
      </div>
    </div>
  );
}
