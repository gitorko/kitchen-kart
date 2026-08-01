import { useState } from 'react';
import { T, SECTION_LABEL } from '../theme.js';
import { formatCurrency } from '../lib/format.js';

function getPeriodRange(mode, offset) {
  const now = new Date();
  if (mode === 'year') {
    const y = now.getFullYear() + offset;
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59), label: String(y) };
  }
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return { start: d, end, label };
}

function StatBox({ label, value }) {
  return (
    <div style={{ flex: 1, background: T.bg, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ color: T.textMuted, fontSize: 10.5, marginBottom: 4, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: T.text, fontWeight: 800, fontSize: 18 }}>{value}</div>
    </div>
  );
}

export default function KitchenReports({ orders }) {
  const [mode, setMode] = useState('month'); // 'month' | 'year'
  const [offset, setOffset] = useState(0);

  const { start, end, label } = getPeriodRange(mode, offset);
  const periodOrders = orders.filter(o => {
    if (o.status === 'rejected') return false;
    const t = new Date(o.createdAt);
    return t >= start && t <= end;
  });

  const totalEarnings = periodOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const paidEarnings = periodOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0);

  const dishStats = {};
  periodOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const s = (dishStats[item.name] ??= { name: item.name, qty: 0, revenue: 0 });
      s.qty += item.qty;
      s.revenue += item.price * item.qty;
    });
  });
  const dishList = Object.values(dishStats).sort((a, b) => b.revenue - a.revenue);
  const mostPopular = [...dishList].sort((a, b) => b.qty - a.qty)[0];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}`, marginBottom: 12 }}>
        {[{ key: 'month', label: 'Monthly' }, { key: 'year', label: 'Yearly' }].map(({ key, label: l }) => (
          <button
            key={key} onClick={() => { setMode(key); setOffset(0); }}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
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
        <div style={{ fontWeight: 700, fontSize: 14.5, color: T.text }}>{label}</div>
        <button onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} style={{ background: 'transparent', border: 'none', color: offset >= 0 ? T.border : T.textSub, cursor: offset >= 0 ? 'default' : 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>›</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <StatBox label="Total Earnings" value={formatCurrency(totalEarnings)} />
        <StatBox label="Paid So Far" value={formatCurrency(paidEarnings)} />
        <StatBox label="Orders" value={periodOrders.length} />
      </div>

      <div style={SECTION_LABEL}>Earnings by Dish{mostPopular ? ` · 🔥 ${mostPopular.name} is most popular` : ''}</div>
      {dishList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 0', border: `1.5px dashed ${T.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.textSub }}>No orders in this period</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg }}>
                <th style={th}>Dish</th>
                <th style={{ ...th, textAlign: 'right' }}>Qty Sold</th>
                <th style={{ ...th, textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {dishList.map(d => (
                <tr key={d.name} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{d.name}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{d.qty}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 13, color: T.text, whiteSpace: 'nowrap' };
