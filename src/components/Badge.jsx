import { STATUS_COLOR } from '../theme.js';

export default function Badge({ status, children }) {
  const s = STATUS_COLOR[status] || { color: '#666', bg: '#eee', label: status };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11.5, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {children || s.label}
    </span>
  );
}
