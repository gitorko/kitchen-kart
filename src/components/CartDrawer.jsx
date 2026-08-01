import { useState } from 'react';
import { T, SECTION_LABEL } from '../theme.js';
import { formatCurrency } from '../lib/format.js';

export default function CartDrawer({ cart, session, onIncrement, onDecrement, onComment, onPlaceOrder, onClose }) {
  const kitchenCarts = Object.values(cart).filter(kc => kc.items.length > 0);
  const [placing, setPlacing] = useState(null);
  const [error, setError] = useState('');

  async function handlePlace(kitchenId) {
    setError('');
    setPlacing(kitchenId);
    try {
      await onPlaceOrder(kitchenId);
    } catch (err) {
      setError(err.message || 'Failed to place order');
    }
    setPlacing(null);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: T.bg, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520,
        maxHeight: '85vh', overflowY: 'auto', padding: '20px 16px 28px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>🛒 Your Cart</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: T.textMuted, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ fontSize: 13, color: T.red, background: T.redBg, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{error}</div>
        )}

        {kitchenCarts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: T.textMuted }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🛒</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Your cart is empty</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {kitchenCarts.map(kc => {
              const total = kc.items.reduce((sum, i) => sum + i.price * i.qty, 0);
              return (
                <div key={kc.kitchenId} style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: 14 }}>
                  <div style={SECTION_LABEL}>{kc.kitchenName}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                    {kc.items.map(item => (
                      <div key={item.dishId}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{item.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.primaryBg, borderRadius: 20, padding: '2px 4px' }}>
                              <button onClick={() => onDecrement(kc.kitchenId, item.dishId)} style={stepperBtn}>−</button>
                              <span style={{ minWidth: 14, textAlign: 'center', fontWeight: 700, color: T.primaryDark, fontSize: 12.5 }}>{item.qty}</span>
                              <button onClick={() => onIncrement(kc.kitchenId, item.dishId)} style={stepperBtn}>+</button>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text, minWidth: 54, textAlign: 'right' }}>
                              {formatCurrency(item.price * item.qty)}
                            </div>
                          </div>
                        </div>
                        <input
                          value={item.comment || ''}
                          onChange={e => onComment(kc.kitchenId, item.dishId, e.target.value)}
                          placeholder="Note for the chef (e.g. less salt)"
                          style={{
                            width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '7px 10px',
                            borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.bg,
                            color: T.text, fontSize: 12.5, fontFamily: 'inherit', outline: 'none',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.textSub }}>Total</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{formatCurrency(total)}</div>
                  </div>
                  <button
                    onClick={() => handlePlace(kc.kitchenId)}
                    disabled={placing === kc.kitchenId}
                    style={{
                      width: '100%', marginTop: 10, padding: '12px 0', borderRadius: 10, border: 'none',
                      background: placing === kc.kitchenId ? '#fdba74' : T.primary, color: '#fff',
                      fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                      cursor: placing === kc.kitchenId ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {placing === kc.kitchenId
                      ? 'Placing order…'
                      : session ? `Place Order with ${kc.kitchenName}` : 'Sign in to place order'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const stepperBtn = {
  width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer',
  background: T.primary, color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
};
