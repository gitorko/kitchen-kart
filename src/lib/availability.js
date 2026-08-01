// A dish's availability is one of three modes, independent of the live
// inStock toggle (which is the "on the spot" on/off switch either way):
//   'spot'   — no schedule, kitchen just flips inStock as they go
//   'day'    — available on one specific date
//   'weekly' — available every week on the chosen weekdays
export const WEEKDAYS = [
  { key: 'sun', label: 'Sun' },
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
];

function todayKey() {
  return WEEKDAYS[new Date().getDay()].key;
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Whether the dish's schedule (ignoring inStock) matches today.
export function isScheduledToday(dish) {
  const mode = dish.availabilityMode || 'spot';
  if (mode === 'day') return dish.availableDate === todayYMD();
  if (mode === 'weekly') return (dish.availableDays || []).includes(todayKey());
  return true;
}

// Whether the dish can actually be ordered right now. `visible` (default true)
// is the kitchen's "Available / Currently Not Available" listing toggle — when
// off, the dish is hidden from customers entirely. `inStock` (default true) is
// the separate "sold out" toggle — the dish stays listed, just not orderable.
export function isDishAvailable(dish) {
  return dish.visible !== false && !!dish.inStock && isScheduledToday(dish);
}

// Short human label describing the schedule, for dish cards.
export function describeAvailability(dish) {
  const mode = dish.availabilityMode || 'spot';
  if (mode === 'day' && dish.availableDate) {
    const label = new Date(dish.availableDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    return `Available ${label}`;
  }
  if (mode === 'weekly' && dish.availableDays?.length) {
    const labels = WEEKDAYS.filter(w => dish.availableDays.includes(w.key)).map(w => w.label);
    return `Every ${labels.join(', ')}`;
  }
  return null;
}
