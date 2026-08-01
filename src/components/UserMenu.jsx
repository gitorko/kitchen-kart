import { useEffect, useState } from 'react';
import { T } from '../theme.js';

export default function UserMenu({ name, onLogout }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button
        type="button" onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
          color: open ? T.text : T.textSub, padding: '6px 4px',
        }}
      >
        {name || 'Account'} <span style={{ fontSize: 9, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 150,
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 30,
        }}>
          <button
            type="button" onClick={() => { setOpen(false); onLogout(); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600, color: T.text,
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
