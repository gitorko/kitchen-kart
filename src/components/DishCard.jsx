import { T } from '../theme.js';
import { formatCurrency, formatDate, formatTime12h, buildWhatsAppShareLink } from '../lib/format.js';

export default function DishCard({ dish, kitchenName, qty, hearted, onAdd, onIncrement, onDecrement, onOpenPhoto, onToggleHeart }) {
  const outOfStock = !dish.inStock;
  const heartCount = dish.heartedBy?.length || 0;
  const shareLink = `${window.location.origin}/?dish=${dish.id}`;
  const shareText = `${dish.name}${kitchenName ? ` from ${kitchenName}` : ''} on Kitchen Kart — ${formatCurrency(dish.price)}\n${shareLink}`;

  return (
    <div style={{
      background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      opacity: outOfStock ? 0.72 : 1,
    }}>
      <div
        onClick={() => dish.photo && onOpenPhoto?.(dish.photo)}
        style={{
          aspectRatio: '4 / 3', background: T.bg, position: 'relative',
          cursor: dish.photo ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {dish.photo ? (
          <img src={dish.photo} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 40 }}>🍽️</span>
        )}
        {outOfStock && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ background: '#fff', color: T.red, fontWeight: 800, fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>
              Out of stock
            </span>
          </div>
        )}
        <a
          href={buildWhatsAppShareLink(shareText)} target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 8, left: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.9)', borderRadius: 20, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)', textDecoration: 'none', fontSize: 13,
          }}
          title="Share on WhatsApp"
        >
          💬
        </a>
        {onToggleHeart && (
          <button
            onClick={e => { e.stopPropagation(); onToggleHeart(); }}
            style={{
              position: 'absolute', top: 8, right: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '4px 9px',
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: 14 }}>{hearted ? '❤️' : '🤍'}</span>
            {heartCount > 0 && <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>{heartCount}</span>}
          </button>
        )}
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.text, lineHeight: 1.25 }}>{dish.name}</div>
        {kitchenName && (
          <div style={{ fontSize: 12, color: T.textSub, display: 'flex', alignItems: 'center', gap: 4 }}>
            👩‍🍳 {kitchenName}
          </div>
        )}
        {dish.description && (
          <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.4 }}>{dish.description}</div>
        )}
        {(dish.availableDate || dish.availableTime) && (
          <div style={{ fontSize: 11.5, color: T.primaryDark, background: T.primaryBg, borderRadius: 8, padding: '3px 8px', width: 'fit-content' }}>
            {dish.availableDate ? formatDate(dish.availableDate) : ''}{dish.availableDate && dish.availableTime ? ' · ' : ''}{formatTime12h(dish.availableTime)}
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{formatCurrency(dish.price)}</div>

          {outOfStock ? (
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>Unavailable</span>
          ) : qty > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.primaryBg, borderRadius: 20, padding: '2px 4px' }}>
              <button onClick={onDecrement} style={stepperBtn}>−</button>
              <span style={{ minWidth: 16, textAlign: 'center', fontWeight: 700, color: T.primaryDark, fontSize: 13 }}>{qty}</span>
              <button onClick={onIncrement} style={stepperBtn}>+</button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              style={{
                padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: T.primary, color: '#fff', fontWeight: 700, fontSize: 12.5, fontFamily: 'inherit',
              }}
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const stepperBtn = {
  width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
  background: T.primary, color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
};
