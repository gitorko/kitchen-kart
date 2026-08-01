import { useState } from 'react';
import { T, INPUT, LABEL } from '../theme.js';
import { signup } from '../lib/authApi.js';
import { buildWhatsAppShareLink } from '../lib/format.js';

function RoleChip({ active, onClick, emoji, label, sub }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        flex: 1, padding: '14px 10px', borderRadius: 12, cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'center',
        border: active ? `2px solid ${T.primary}` : `1.5px solid ${T.border}`,
        background: active ? T.primaryBg : T.surface,
        color: active ? T.primaryDark : T.textSub,
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 11.5, marginTop: 2, opacity: 0.8 }}>{sub}</div>
    </button>
  );
}

export default function SignupPage({ onGoLogin, onBack }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [apartment, setApartment] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { code }
  const [apartmentTaken, setApartmentTaken] = useState(false);

  function handleApartmentChange(value) {
    setApartment(value);
    if (apartmentTaken) setApartmentTaken(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!name.trim()) return setError('Name is required.');
    if (!/^\d{10}$/.test(phone)) return setError('Enter a valid 10-digit phone number.');
    if (!apartment.trim()) return setError('Apartment number is required.');
    if (!/^\d{4}$/.test(pin)) return setError('PIN must be exactly 4 digits.');
    if (pin !== confirmPin) return setError('PINs do not match.');

    setLoading(true);
    try {
      const { code } = await signup({
        name: name.trim(), phone, apartment: apartment.trim(), pin, role,
        replacingExisting: apartmentTaken,
      });
      setResult({ code });
    } catch (err) {
      if (err.apartmentTaken) setApartmentTaken(true);
      else setError(err.message || 'Signup failed');
    }
    setLoading(false);
  }

  if (result) {
    const link = `${window.location.origin}/?approve=${result.code}`;
    const shareText = `Hi! I just signed up on Kitchen Kart. Can you approve my account?\nCode: ${result.code}\n${link}`;
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: T.text, marginBottom: 6 }}>Account created!</div>
          <p style={{ fontSize: 13.5, color: T.textSub, marginBottom: 18 }}>
            An admin needs to approve you before you can sign in. Share this code with them.
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
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
        {onBack && (
          <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 14 }}>
            ← Continue browsing
          </button>
        )}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🍲</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Create your account</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <RoleChip active={role === 'customer'} onClick={() => setRole('customer')} emoji="🛒" label="Order food" sub="I want to buy" />
            <RoleChip active={role === 'kitchen'} onClick={() => setRole('kitchen')} emoji="👩‍🍳" label="Cook & sell" sub="I run a kitchen" />
          </div>
          <div>
            <label style={LABEL}>Name</label>
            <input autoFocus style={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </div>
          <div>
            <label style={LABEL}>Phone Number</label>
            <input type="tel" inputMode="numeric" style={INPUT} value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" />
          </div>
          <div>
            <label style={LABEL}>Apartment Number</label>
            <input style={INPUT} value={apartment} onChange={e => handleApartmentChange(e.target.value)} placeholder="e.g. B-204" />
          </div>
          {apartmentTaken && (
            <div style={{ background: T.amberBg, border: `1.5px solid ${T.amber}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, color: T.amber, fontWeight: 700, marginBottom: 4 }}>
                Flat {apartment} already has an account
              </div>
              <div style={{ fontSize: 12.5, color: T.textSub }}>
                Are you a new owner or tenant who just moved in? Continuing will replace the previous resident's account once an admin approves you.
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>4-digit PIN</label>
              <input type="password" inputMode="numeric" style={{ ...INPUT, letterSpacing: 3 }} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Confirm PIN</label>
              <input type="password" inputMode="numeric" style={{ ...INPUT, letterSpacing: 3 }} value={confirmPin}
                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" />
            </div>
          </div>
          {error && (
            <div style={{ fontSize: 13, color: T.red, background: T.redBg, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>{error}</div>
          )}
          <button type="submit" disabled={loading}
            style={{ background: loading ? '#fdba74' : T.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            {loading ? 'Creating account…' : apartmentTaken ? "Yes, I'm the new resident — continue" : 'Sign Up'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13.5, color: T.textSub }}>
          Already approved?{' '}
          <button type="button" onClick={onGoLogin} style={{ background: 'none', border: 'none', color: T.primary, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, padding: 0 }}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
