import { useEffect, useState } from 'react';
import { T, SECTION_LABEL } from '../theme.js';
import Badge from './Badge.jsx';
import { fetchAllUsers } from '../lib/authApi.js';

const ROLE_LABEL = { customer: '🛒 Customer', kitchen: '👩‍🍳 Kitchen', admin: '🛡️ Admin' };

export default function AdminUsers({ onImpersonate }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchAllUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  async function handleImpersonate(user) {
    setError('');
    setBusyId(user.id);
    try {
      await onImpersonate(user.id);
    } catch (err) {
      setError(err.message || 'Could not impersonate this user');
      setBusyId(null);
    }
  }

  if (!users) {
    return <div style={{ textAlign: 'center', color: T.textMuted, padding: 40, fontSize: 14 }}>Loading…</div>;
  }

  return (
    <div>
      <div style={SECTION_LABEL}>All Users ({users.length})</div>
      {error && (
        <div style={{ fontSize: 13, color: T.red, background: T.redBg, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{error}</div>
      )}
      {users.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textMuted }}>No users yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(user => (
            <div key={user.id} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{user.name}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
                  {user.phone} · Apt {user.apartment} · {ROLE_LABEL[user.role] || user.role}
                </div>
              </div>
              <Badge status={user.status} />
              <button
                onClick={() => handleImpersonate(user)}
                disabled={user.status !== 'approved' || busyId === user.id}
                style={{
                  padding: '6px 12px', borderRadius: 8, cursor: user.status === 'approved' ? 'pointer' : 'not-allowed',
                  border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSub,
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600, opacity: user.status === 'approved' ? 1 : 0.5,
                  flexShrink: 0,
                }}
              >
                {busyId === user.id ? 'Switching…' : 'Impersonate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
