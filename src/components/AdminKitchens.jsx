import { T, SECTION_LABEL } from '../theme.js';
import Badge from './Badge.jsx';

export default function AdminKitchens({ kitchens, dishes, onDelete }) {
  return (
    <div>
      <div style={SECTION_LABEL}>All Kitchens ({kitchens.length})</div>
      {kitchens.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textMuted }}>No kitchens yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {kitchens.map(k => (
            <div key={k.id} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: T.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {k.photo ? <img src={k.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>👩‍🍳</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{k.name}</div>
                  {k.onVacation && <Badge status="vacation" />}
                </div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
                  {k.phone} · {k.upiId} · {dishes.filter(d => d.kitchenId === k.id).length} dishes
                </div>
              </div>
              <button
                onClick={() => { if (confirm(`Delete "${k.name}" and all its dishes? This cannot be undone.`)) onDelete(k.id); }}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #fecaca', background: 'transparent', color: T.red, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
