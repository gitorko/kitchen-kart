import { useState } from 'react';
import { T, INPUT, SECTION_LABEL } from '../theme.js';
import Badge from './Badge.jsx';
import { formatDateTime } from '../lib/format.js';

const ROLE_LABEL = { customer: '🛒 Customer', kitchen: '👩‍🍳 Kitchen' };

function PendingCard({ item, highlighted, subtitle, onApprove, onReject }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  async function handleApprove() {
    setBusy(true);
    try { await onApprove(); } finally { setBusy(false); }
  }
  async function handleConfirmReject() {
    setBusy(true);
    try { await onReject(reason.trim()); setRejecting(false); setReason(''); } finally { setBusy(false); }
  }

  return (
    <div
      style={{
        background: T.surface, borderRadius: 14, padding: 14,
        border: highlighted ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
        boxShadow: highlighted ? '0 0 0 4px ' + T.primaryBg : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: T.text }}>{item.name}</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 1 }}>
            {item.phone} · Apt {item.apartment}
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.textSub }}>{ROLE_LABEL[item.role] || item.role}</div>
      </div>
      <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 10 }}>{subtitle}</div>

      {rejecting ? (
        <div>
          <input
            autoFocus value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason for rejecting (optional)"
            style={{ ...INPUT, fontSize: 13, padding: '8px 12px', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setRejecting(false); setReason(''); }}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSub, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              disabled={busy} onClick={handleConfirmReject}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${T.red}`, background: T.redBg, color: T.red, fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              {busy ? 'Rejecting…' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={busy} onClick={handleApprove}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${T.green}`, background: T.greenBg, color: T.green, fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            ✓ Approve
          </button>
          <button
            disabled={busy} onClick={() => setRejecting(true)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${T.red}`, background: T.redBg, color: T.red, fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminApprovals({ pending, pinResets = [], history, highlightCode, onApprove, onReject, onApprovePinReset, onRejectPinReset }) {
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
          {pending.map(user => (
            <PendingCard
              key={user.id}
              item={user}
              highlighted={highlightCode && user.code === highlightCode}
              subtitle={<>Code: <span style={{ fontWeight: 700, color: T.text, letterSpacing: 1 }}>{user.code}</span> · {formatDateTime(user.createdAt)}</>}
              onApprove={() => onApprove(user.id)}
              onReject={reason => onReject(user.id, reason)}
            />
          ))}
        </div>
      )}

      <div style={SECTION_LABEL}>PIN Reset Requests {pinResets.length > 0 && `(${pinResets.length})`}</div>
      {pinResets.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 26 }}>No pending PIN resets.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
          {pinResets.map(item => (
            <PendingCard
              key={item.id}
              item={item}
              highlighted={highlightCode && item.code === highlightCode}
              subtitle={<>Code: <span style={{ fontWeight: 700, color: T.text, letterSpacing: 1 }}>{item.code}</span> · requested {formatDateTime(item.requestedAt)}</>}
              onApprove={() => onApprovePinReset(item.id)}
              onReject={reason => onRejectPinReset(item.id, reason)}
            />
          ))}
        </div>
      )}

      <div style={SECTION_LABEL}>Approval History</div>
      {history.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textMuted }}>No approvals recorded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map(log => (
            <div key={log.id} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                    {log.userName}{log.type === 'pin_reset' ? ' · PIN reset' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                    by {log.approvedByName} · {formatDateTime(log.createdAt)}
                  </div>
                </div>
                <Badge status={log.action === 'approve' ? 'approved' : 'rejected'} />
              </div>
              {log.reason && (
                <div style={{ fontSize: 11.5, color: T.textSub, marginTop: 6, fontStyle: 'italic' }}>“{log.reason}”</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
