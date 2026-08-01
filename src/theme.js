export const T = {
  bg:        '#fff8f0',
  surface:   '#ffffff',
  border:    '#f0dfc9',
  text:      '#2a1c10',
  textSub:   '#8a6d55',
  textMuted: '#c2a68d',

  primary:   '#ff4500',
  primaryBg: '#ffe4d6',
  primaryDark: '#c23600',

  amber:   '#b45309',
  amberBg: '#fef3c7',
  green:   '#16a34a',
  greenBg: '#dcfce7',
  red:     '#dc2626',
  redBg:   '#fee2e2',
  blue:    '#2563eb',
  blueBg:  '#dbeafe',
  teal:    '#0d9488',
  tealBg:  '#ccfbf1',
};

export const INPUT = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: `1.5px solid ${T.border}`, background: T.surface,
  color: T.text, fontSize: 15, fontFamily: 'inherit', outline: 'none',
};

export const LABEL = {
  display: 'block', color: T.textSub, fontSize: 13, marginBottom: 5, fontWeight: 600,
};

export const SECTION_LABEL = {
  color: T.textMuted, fontSize: 11, fontWeight: 700,
  letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
};

export const CARD = {
  background: T.surface, borderRadius: 16,
  border: `1px solid ${T.border}`,
};

export const STATUS_COLOR = {
  pending:  { color: T.amber, bg: T.amberBg, label: 'Pending' },
  approved: { color: T.green, bg: T.greenBg, label: 'Approved' },
  rejected: { color: T.red,   bg: T.redBg,   label: 'Rejected' },
  placed:   { color: T.amber, bg: T.amberBg, label: 'Placed' },
  accepted: { color: T.blue,  bg: T.blueBg,  label: 'Accepted' },
  delivered:{ color: T.green, bg: T.greenBg, label: 'Delivered' },
  paid:     { color: T.teal,  bg: T.tealBg,  label: 'Paid' },
  unpaid:   { color: T.red,   bg: T.redBg,   label: 'Unpaid' },
  vacation: { color: T.amber, bg: T.amberBg, label: 'On Vacation' },
};
