import { useState } from 'react';
import { T, SECTION_LABEL } from '../theme.js';
import Badge from './Badge.jsx';
import UpiQr from './UpiQr.jsx';
import { formatCurrency, formatDateTime, buildUpiLink } from '../lib/format.js';

export default function OrdersPage({ orders, kitchens, onMarkPaid }) {
  const kitchenById = Object.fromEntries(kitchens.map(k => [k.id, k]));
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '52px 0', border: `1.5px dashed ${T.border}`, borderRadius: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.textSub }}>No orders yet</div>
        <div style={{ fontSize: 13, marginTop: 6, color: T.textMuted }}>Browse the home page to order a dish</div>
      </div>
    );
  }

  return (
    <div>
      <div style={SECTION_LABEL}>My Orders</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sorted.map(order => (
          <OrderCard key={order.id} order={order} kitchen={kitchenById[order.kitchenId]} onMarkPaid={onMarkPaid} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, kitchen, onMarkPaid }) {
  const [showPay, setShowPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const canPay = order.status !== 'rejected' && order.paymentStatus === 'unpaid';

  async function handleMarkPaid() {
    setBusy(true);
    try { await onMarkPaid(order.id); } finally { setBusy(false); }
  }

  const upiLink = kitchen?.upiId
    ? buildUpiLink({ upiId: kitchen.upiId, payeeName: kitchen.name, amount: order.totalAmount, note: `Kitchen Kart order ${order.id}` })
    : null;

  return (
    <div style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{order.kitchenName}</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{formatDateTime(order.createdAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Badge status={order.status} />
          <Badge status={order.paymentStatus} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        {order.items.map(item => (
          <div key={item.dishId} style={{ fontSize: 13, color: T.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{item.qty} × {item.name}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.qty)}</span>
            </div>
            {item.comment && <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>“{item.comment}”</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ fontSize: 13, color: T.textSub }}>Total</div>
        <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{formatCurrency(order.totalAmount)}</div>
      </div>

      {canPay && (
        <>
          <button
            onClick={() => setShowPay(v => !v)}
            style={{
              width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 10,
              border: `1.5px solid ${T.primary}`, background: T.primaryBg, color: T.primaryDark,
              fontWeight: 700, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {showPay ? 'Hide UPI payment' : '💳 Pay via UPI'}
          </button>
          {showPay && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              {upiLink ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                    <UpiQr value={upiLink} />
                  </div>
                  <a
                    href={upiLink}
                    style={{ display: 'block', padding: '10px 0', borderRadius: 10, background: T.primary, color: '#fff', fontWeight: 700, fontSize: 13.5, textDecoration: 'none', marginBottom: 8 }}
                  >
                    Open in UPI app
                  </a>
                  <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 10 }}>
                    Scan the QR, or tap above on your phone — pays {kitchen.name} ({kitchen.upiId})
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 10 }}>This kitchen hasn't set up UPI yet — pay them directly.</div>
              )}
              <button
                onClick={handleMarkPaid} disabled={busy}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 10, border: `1.5px solid ${T.border}`,
                  background: 'transparent', color: T.textSub, fontWeight: 700, fontSize: 13.5,
                  fontFamily: 'inherit', cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? 'Updating…' : "I've paid — mark as paid"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
