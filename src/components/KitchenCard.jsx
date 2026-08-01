import { T } from '../theme.js';

export default function KitchenCard({ kitchen, dishCount, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
        overflow: 'hidden', cursor: 'pointer', textAlign: 'left', padding: 0,
        display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
      }}
    >
      <div style={{
        aspectRatio: '4 / 3', background: T.primaryBg, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {kitchen.photo ? (
          <img src={kitchen.photo} alt={kitchen.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 40 }}>👩‍🍳</span>
        )}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{kitchen.name}</div>
        {kitchen.description && (
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, lineHeight: 1.4 }}>{kitchen.description}</div>
        )}
        <div style={{ fontSize: 12, color: T.textSub, marginTop: 6 }}>
          {dishCount} dish{dishCount !== 1 ? 'es' : ''}
        </div>
      </div>
    </button>
  );
}
