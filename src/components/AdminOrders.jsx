import { useState } from 'react';
import { T, SECTION_LABEL } from '../theme.js';
import Badge from './Badge.jsx';
import { formatCurrency, formatDateTime } from '../lib/format.js';

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPeriodRange(mode, offset) {
  const now = new Date();
  if (mode === 'day') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return { start: d, end, label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) };
  }
  if (mode === 'week') {
    const start = getMonday(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset * 7));
    const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
    const label = `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    return { start, end, label };
  }
  if (mode === 'year') {
    const y = now.getFullYear() + offset;
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59), label: String(y) };
  }
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return { start: d, end, label };
}

export default function AdminOrders({ orders }) {
  const [mode, setMode] = useState('day'); // 'day' | 'week' | 'month' | 'year'
  const [offset, setOffset] = useState(0);

  const { start, end, label } = getPeriodRange(mode, offset);
  const periodOrders = orders
    .filter(o => { const t = new Date(o.createdAt); return t >= start && t <= end; })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalAmount = periodOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}`, marginBottom: 12, overflowX: 'auto' }}>
        {[{ key: 'day', label: 'Day' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }].map(({ key, label: l }) => (
          <button
            key={key} onClick={() => { setMode(key); setOffset(0); }}
            style={{
              flex: 1, padding: '8px 6px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: mode === key ? T.bg : 'transparent',
              color: mode === key ? T.text : T.textMuted,
              fontWeight: mode === key ? 700 : 500, fontFamily: 'inherit', fontSize: 13,
              boxShadow: mode === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.surface, borderRadius: 12, padding: '10px 14px', border: `1px solid ${T.border}`, marginBottom: 14 }}>
        <button onClick={() => setOffset(o => o - 1)} style={{ background: 'transparent', border: 'none', color: T.textSub, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>‹</button>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.text, textAlign: 'center' }}>{label}</div>
        <button onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} style={{ background: 'transparent', border: 'none', color: offset >= 0 ? T.border : T.textSub, cursor: offset >= 0 ? 'default' : 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>›</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ color: T.textMuted, fontSize: 10.5, marginBottom: 4, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Orders</div>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 18 }}>{periodOrders.length}</div>
        </div>
        <div style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ color: T.textMuted, fontSize: 10.5, marginBottom: 4, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Total Value</div>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 18 }}>{formatCurrency(totalAmount)}</div>
        </div>
      </div>

      <div style={SECTION_LABEL}>Orders</div>
      {periodOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '52px 0', border: `1.5px dashed ${T.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.textSub }}>No orders in this period</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {periodOrders.map(order => (
            <div key={order.id} style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{order.kitchenName}</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
                    {order.userName}{order.apartment ? ` · Apt ${order.apartment}` : ''}{order.userPhone ? ` · ${order.userPhone}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{formatDateTime(order.createdAt)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Badge status={order.status} />
                  <Badge status={order.paymentStatus} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 0', borderTop: `1px solid ${T.border}` }}>
                {order.items.map(item => (
                  <div key={item.dishId} style={{ fontSize: 13, color: T.text }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.qty} × {item.name}</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.qty)}</span>
                    </div>
                    {item.comment && <div style={{ fontSize: 11.5, color: T.textMuted }}>“{item.comment}”</div>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ fontSize: 13, color: T.textSub }}>Total</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{formatCurrency(order.totalAmount)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
