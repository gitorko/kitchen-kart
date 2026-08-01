export function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function formatDate(ymd) {
  if (!ymd) return '—';
  return new Date(ymd + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export function isToday(iso) {
  if (!iso) return false;
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

export function formatTime12h(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function buildUpiLink({ upiId, payeeName, amount, note }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: String(amount),
    cu: 'INR',
    tn: note || 'Kitchen Kart order',
  });
  return `upi://pay?${params.toString()}`;
}

export function buildWhatsAppShareLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
