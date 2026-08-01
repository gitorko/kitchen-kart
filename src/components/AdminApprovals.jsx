import { useState } from 'react';
import { T, SECTION_LABEL } from '../theme.js';
import Badge from './Badge.jsx';
import { formatDateTime } from '../lib/format.js';

const ROLE_LABEL = { customer: '🛒 Customer', kitchen: '👩‍🍳 Kitchen' };

export default function AdminApprovals({ pending, history, highlightCode, onApprove, onReject }) {
  const [busyId, setBusyId] = useState(null);

  async function run(userId, action) {
    setBusyId(userId);
    try { await (action === 'approve' ? onApprove(userId) : onReject(userId)); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div style={SECTION_LABEL}>Pending Approvals {pending.length > 0 && `(${pending.length})`}</div>
      {pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 0', border: `1.5px dashed ${T.border}`, borderRadius: 16, marginBottom: 26 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.textSub }}>Nothing waiting on approval</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
          {pending.map(user => {
            const highlighted = highlightCode && user.code === highlightCode;
            return (
              <div
                key={user.id}
                style={{
                  background: T.surface, borderRadius: 14, padding: 14,
                  border: highlighted ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
                  boxShadow: highlighted ? '0 0 0 4px ' + T.primaryBg : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: T.text }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: T.textSub, marginTop: 1 }}>
                      {user.phone} · Apt {user.apartment}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: T.textSub }}>{ROLE_LABEL[user.role] || user.role}</div>
                </div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 10 }}>
                  Code: <span style={{ fontWeight: 700, color: T.text, letterSpacing: 1 }}>{user.code}</span> · {formatDateTime(user.createdAt)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={busyId === user.id} onClick={() => run(user.id, 'approve')}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${T.green}`, background: T.greenBg, color: T.green, fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    disabled={busyId === user.id} onClick={() => run(user.id, 'reject')}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${T.red}`, background: T.redBg, color: T.red, fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={SECTION_LABEL}>Approval History</div>
      {history.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textMuted }}>No approvals recorded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map(log => (
            <div key={log.id} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{log.userName}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                  by {log.approvedByName} · {formatDateTime(log.createdAt)}
                </div>
              </div>
              <Badge status={log.action === 'approve' ? 'approved' : 'rejected'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
