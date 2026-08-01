import { useState } from 'react';
import { T, INPUT, LABEL } from '../theme.js';
import { login } from '../lib/authApi.js';

export default function LoginPage({ onLogin, onGoSignup, onBack }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // { code }
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setPending(null);
    setLoading(true);
    try {
      const session = await login({ phone: phone.trim(), pin: pin.trim() });
      onLogin(session);
    } catch (err) {
      if (err.status === 'pending') setPending({ code: err.code });
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
        {onBack && (
          <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 14 }}>
            ← Continue browsing
          </button>
        )}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🍲</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Kitchen Kart</div>
          <div style={{ fontSize: 13, color: T.textSub, marginTop: 4 }}>Home-cooked food from your neighbours</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LABEL}>Phone Number</label>
            <input
              type="tel" inputMode="numeric" autoFocus autoComplete="tel" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              style={INPUT}
            />
          </div>
          <div>
            <label style={LABEL}>6-digit PIN</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPin ? 'text' : 'password'} inputMode="numeric" autoComplete="current-password"
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                style={{ ...INPUT, padding: '10px 44px 10px 14px', letterSpacing: 3 }}
              />
              <button type="button" onClick={() => setShowPin(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: T.textMuted, padding: 2 }}>
                {showPin ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ fontSize: 13, color: T.red, background: T.redBg, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>
              {error}
              {pending?.code && (
                <div style={{ marginTop: 6, fontWeight: 700, color: T.text }}>Your code: {pending.code}</div>
              )}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ background: loading ? '#fdba74' : T.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13.5, color: T.textSub }}>
          New here?{' '}
          <button type="button" onClick={onGoSignup} style={{ background: 'none', border: 'none', color: T.primary, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, padding: 0 }}>
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}
