import { T } from '../theme.js';
import Badge from './Badge.jsx';

export default function KitchenCard({ kitchen, dishCount, onClick, favorited, onToggleFavorite }) {
  const favoriteCount = kitchen.favoritedBy?.length || 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
        overflow: 'hidden', cursor: 'pointer', textAlign: 'left',
        display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
      }}
    >
      <div style={{
        aspectRatio: '4 / 3', background: T.primaryBg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        {kitchen.photo ? (
          <img src={kitchen.photo} alt={kitchen.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 40 }}>👩‍🍳</span>
        )}
        {onToggleFavorite && (
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            style={{
              position: 'absolute', top: 8, right: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '4px 9px',
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: 14 }}>{favorited ? '⭐' : '☆'}</span>
            {favoriteCount > 0 && <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>{favoriteCount}</span>}
          </button>
        )}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{kitchen.name}</div>
          {kitchen.onVacation && <Badge status="vacation" />}
        </div>
        {kitchen.description && (
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, lineHeight: 1.4 }}>{kitchen.description}</div>
        )}
        <div style={{ fontSize: 12, color: T.textSub, marginTop: 6 }}>
          {dishCount} dish{dishCount !== 1 ? 'es' : ''}
        </div>
      </div>
    </div>
  );
}
