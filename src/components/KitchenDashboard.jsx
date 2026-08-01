import { useState } from 'react';
import { T, INPUT, LABEL, SECTION_LABEL } from '../theme.js';
import Badge from './Badge.jsx';
import PhotoUploadField from './PhotoUploadField.jsx';
import KitchenReports from './KitchenReports.jsx';
import { formatCurrency, formatDateTime } from '../lib/format.js';
import { WEEKDAYS, describeAvailability } from '../lib/availability.js';

function KitchenForm({ initial, onSave, onSaved, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [upiId, setUpiId] = useState(initial?.upiId || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) return setError('Kitchen name is required.');
    if (!upiId.trim()) return setError('UPI ID is required so customers can pay you.');
    setError('');
    setSaving(true);
    try {
      await onSave({ ...(initial || {}), name: name.trim(), upiId: upiId.trim(), description: description.trim(), photo });
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PhotoUploadField label="Kitchen Photo" value={photo} onChange={setPhoto} />
      <div>
        <label style={LABEL}>Kitchen Name</label>
        <input autoFocus style={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Anjali's Kitchen" />
      </div>
      <div>
        <label style={LABEL}>UPI ID</label>
        <input style={INPUT} value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" />
      </div>
      <div>
        <label style={LABEL}>Description (optional)</label>
        <input style={INPUT} value={description} onChange={e => setDescription(e.target.value)} placeholder="What you specialize in…" />
      </div>
      {error && <div style={{ fontSize: 13, color: T.red, background: T.redBg, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSub, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: T.primary, color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save Kitchen'}
        </button>
      </div>
    </form>
  );
}

function ToggleRow({ active, activeLabel, inactiveLabel, activeColor, inactiveColor, onClick }) {
  const color = active ? activeColor : inactiveColor;
  return (
    <button
      type="button" onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
        border: `1.5px solid ${color}`, background: `${color}18`,
        color, fontWeight: 700, fontSize: 13.5,
      }}
    >
      <span>{active ? activeLabel : inactiveLabel}</span>
      <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>Tap to toggle</span>
    </button>
  );
}

function DishFormModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '');
  const [availabilityMode, setAvailabilityMode] = useState(initial?.availabilityMode || 'spot');
  const [availableDate, setAvailableDate] = useState(initial?.availableDate || '');
  const [availableTime, setAvailableTime] = useState(initial?.availableTime || '');
  const [availableDays, setAvailableDays] = useState(initial?.availableDays || []);
  const [inStock, setInStock] = useState(initial?.inStock ?? true);
  const [visible, setVisible] = useState(initial?.visible ?? true);
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function toggleDay(key) {
    setAvailableDays(prev => (prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) return setError('Dish name is required.');
    if (!price || isNaN(price) || Number(price) <= 0) return setError('Enter a valid price.');
    if (availabilityMode === 'day' && !availableDate) return setError('Pick a date, or switch to a different availability mode.');
    if (availabilityMode === 'weekly' && availableDays.length === 0) return setError('Pick at least one day, or switch to a different availability mode.');
    setError('');
    setSaving(true);
    try {
      await onSave({
        ...(initial || {}),
        name: name.trim(), description: description.trim(), price: Number(price),
        availabilityMode, availableDate, availableTime, availableDays, inStock, visible, photo,
      });
    } catch (err) {
      setError(err.message || 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: T.surface, borderRadius: 18, padding: 24, width: '100%', maxWidth: 440, border: `1px solid ${T.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ color: T.text, marginBottom: 18, fontSize: 18, fontWeight: 700 }}>{isEdit ? 'Edit Dish' : 'Add Dish'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PhotoUploadField label="Dish Photo" value={photo} onChange={setPhoto} />
          <div>
            <label style={LABEL}>Dish Name</label>
            <input autoFocus style={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken Biryani" />
          </div>
          <div>
            <label style={LABEL}>Description (optional)</label>
            <input style={INPUT} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ingredients, spice level…" />
          </div>
          <div>
            <label style={LABEL}>Price (₹)</label>
            <input type="number" min="0" style={INPUT} value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 150" />
          </div>

          <div>
            <label style={LABEL}>When is this dish made?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'spot', label: '⚡ On the Spot' },
                { key: 'day', label: '📅 One Day' },
                { key: 'weekly', label: '🔁 Weekly' },
              ].map(({ key, label }) => (
                <button
                  key={key} type="button" onClick={() => setAvailabilityMode(key)}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    border: availabilityMode === key ? `2px solid ${T.primary}` : `1.5px solid ${T.border}`,
                    background: availabilityMode === key ? T.primaryBg : T.surface,
                    color: availabilityMode === key ? T.primaryDark : T.textSub,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {availabilityMode === 'spot' && (
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>
                Always listed — flip "In Stock" below whenever you run out.
              </div>
            )}
            {availabilityMode === 'day' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={LABEL}>Date</label>
                  <input type="date" style={INPUT} value={availableDate} onChange={e => setAvailableDate(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={LABEL}>Time (optional)</label>
                  <input type="time" style={INPUT} value={availableTime} onChange={e => setAvailableTime(e.target.value)} />
                </div>
              </div>
            )}
            {availabilityMode === 'weekly' && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {WEEKDAYS.map(({ key, label }) => (
                  <button
                    key={key} type="button" onClick={() => toggleDay(key)}
                    style={{
                      padding: '7px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 12.5, fontWeight: 700,
                      border: availableDays.includes(key) ? `1.5px solid ${T.primary}` : `1.5px solid ${T.border}`,
                      background: availableDays.includes(key) ? T.primaryBg : T.surface,
                      color: availableDays.includes(key) ? T.primaryDark : T.textSub,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ToggleRow
            active={inStock} onClick={() => setInStock(v => !v)}
            activeLabel="✓ In Stock" inactiveLabel="✕ Out of Stock"
            activeColor={T.green} inactiveColor={T.red}
          />
          <ToggleRow
            active={visible} onClick={() => setVisible(v => !v)}
            activeLabel="👁 Available" inactiveLabel="🙈 Currently Not Available"
            activeColor={T.blue} inactiveColor={T.textMuted}
          />

          {error && <div style={{ fontSize: 13, color: T.red, background: T.redBg, border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSub, fontFamily: 'inherit', fontSize: 15, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: T.primary, color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Dish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DishRow({ dish, onEdit, onToggleStock, onToggleVisible, onDelete }) {
  const schedule = describeAvailability(dish);
  return (
    <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ width: 56, height: 42, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {dish.photo ? <img src={dish.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>🍽️</span>}
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{dish.name}</div>
        <div style={{ fontSize: 12.5, color: T.textSub, marginTop: 1 }}>
          {formatCurrency(dish.price)}{schedule ? ` · ${schedule}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => onToggleVisible(dish)}
          style={{
            padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
            border: `1.5px solid ${dish.visible === false ? T.textMuted : T.blue}`,
            background: dish.visible === false ? T.bg : T.blueBg,
            color: dish.visible === false ? T.textMuted : T.blue,
          }}
        >
          {dish.visible === false ? 'Hidden' : 'Available'}
        </button>
        <button
          onClick={() => onToggleStock(dish)}
          style={{
            padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
            border: `1.5px solid ${dish.inStock ? T.green : T.red}`,
            background: dish.inStock ? T.greenBg : T.redBg,
            color: dish.inStock ? T.green : T.red,
          }}
        >
          {dish.inStock ? 'In Stock' : 'Out of Stock'}
        </button>
        <button onClick={() => onEdit(dish)} style={{ padding: '6px 8px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSub, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
          Edit
        </button>
        <button onClick={() => onDelete(dish)} title="Delete dish" style={{ padding: '6px 7px', borderRadius: 8, border: '1.5px solid #fecaca', background: 'transparent', color: T.red, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>
          ✕
        </button>
      </div>
    </div>
  );
}

function OrderRow({ order, onAccept, onReject, onDeliver, onMarkPaid }) {
  const [busy, setBusy] = useState(false);
  async function run(fn) { setBusy(true); try { await fn(); } finally { setBusy(false); } }

  return (
    <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{order.userName}</div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
            {order.apartment ? `Apt ${order.apartment} · ` : ''}{order.userPhone} · {formatDateTime(order.createdAt)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Badge status={order.status} />
          <Badge status={order.paymentStatus} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 0', borderTop: `1px solid ${T.border}` }}>
        {order.items.map(item => (
          <div key={item.dishId} style={{ fontSize: 13, color: T.text }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{item.qty} × {item.name}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.qty)}</span>
            </div>
            {item.comment && <div style={{ fontSize: 11.5, color: T.textMuted }}>“{item.comment}”</div>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 10px' }}>
        <div style={{ fontSize: 13, color: T.textSub }}>Total</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{formatCurrency(order.totalAmount)}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {order.status === 'placed' && (
          <>
            <button disabled={busy} onClick={() => run(onAccept)} style={actionBtn(T.green, T.greenBg)}>Accept</button>
            <button disabled={busy} onClick={() => run(onReject)} style={actionBtn(T.red, T.redBg)}>Reject</button>
          </>
        )}
        {order.status === 'accepted' && (
          <button disabled={busy} onClick={() => run(onDeliver)} style={actionBtn(T.blue, T.blueBg)}>Mark Delivered</button>
        )}
        {onMarkPaid && order.paymentStatus === 'unpaid' && order.status !== 'rejected' && (
          <button disabled={busy} onClick={() => run(onMarkPaid)} style={actionBtn(T.teal, T.tealBg)}>Mark Payment Received</button>
        )}
      </div>
    </div>
  );
}

function actionBtn(color, bg) {
  return { padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${color}`, background: bg, color, fontWeight: 700, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer' };
}

export default function KitchenDashboard({ kitchen, dishes, orders, onSaveKitchen, onSaveDish, onDeleteDish, onToggleStock, onToggleVisible, onToggleVacation, onUpdateOrder }) {
  const [tab, setTab] = useState('dishes'); // 'dishes' | 'orders' | 'preparing' | 'reports' | 'settings'
  const [dishModal, setDishModal] = useState(null); // {} for new, dish for edit, null closed

  if (!kitchen) {
    return (
      <div style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👩‍🍳</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: T.text }}>Set up your kitchen</div>
          <div style={{ fontSize: 13, color: T.textSub, marginTop: 4 }}>Neighbours will see this before ordering from you.</div>
        </div>
        <KitchenForm onSave={onSaveKitchen} />
      </div>
    );
  }

  const placedCount = orders.filter(o => o.status === 'placed').length;
  const preparingCount = orders.filter(o => o.status === 'accepted').length;

  // Orders tab: what's coming in, waiting on an accept/reject decision.
  const needsAction = orders.filter(o => o.status === 'placed').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // Preparing tab: accepted orders, in the exact order they were accepted — a
  // rejected order never lands here, so there's no ambiguity about what's actually cooking.
  const preparing = orders
    .filter(o => o.status === 'accepted')
    .sort((a, b) => (a.acceptedAt || a.createdAt).localeCompare(b.acceptedAt || b.createdAt));
  const preparingIds = new Set([...needsAction, ...preparing].map(o => o.id));
  const history = orders.filter(o => !preparingIds.has(o.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: 12, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: T.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {kitchen.photo ? <img src={kitchen.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>👩‍🍳</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{kitchen.name}</div>
            {kitchen.onVacation && <Badge status="vacation" />}
          </div>
          <div style={{ fontSize: 12, color: T.textSub }}>{kitchen.phone} · {kitchen.upiId}</div>
        </div>
        <button onClick={() => setTab('settings')} style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.textSub, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600 }}>
          Edit
        </button>
      </div>

      {kitchen.onVacation ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: T.amberBg, border: `1.5px solid ${T.amber}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: T.amber, fontWeight: 600 }}>🌴 You're on vacation — customers can't place new orders.</div>
          <button onClick={() => onToggleVacation(kitchen)} style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${T.amber}`, background: T.surface, color: T.amber, fontWeight: 700, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
            Kitchen Open
          </button>
        </div>
      ) : (
        <button
          onClick={() => onToggleVacation(kitchen)}
          style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.textSub, fontWeight: 600, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', marginBottom: 14 }}
        >
          🌴 Go On Vacation
        </button>
      )}

      <div style={{ display: 'flex', gap: 6, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}`, marginBottom: 14, overflowX: 'auto' }}>
        {[
          { key: 'dishes', label: 'My Dishes' },
          { key: 'orders', label: `Orders${placedCount ? ` (${placedCount})` : ''}` },
          { key: 'preparing', label: `Preparing${preparingCount ? ` (${preparingCount})` : ''}` },
          { key: 'reports', label: 'Earnings' },
          { key: 'settings', label: 'Settings' },
        ].map(({ key, label }) => (
          <button
            key={key} onClick={() => setTab(key)}
            style={{
              flex: 1, padding: '9px 6px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: tab === key ? T.bg : 'transparent',
              color: tab === key ? T.text : T.textMuted,
              fontWeight: tab === key ? 700 : 500, fontFamily: 'inherit', fontSize: 13,
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, padding: 18 }}>
          <KitchenForm initial={kitchen} onSave={onSaveKitchen} onSaved={() => setTab('dishes')} onCancel={() => setTab('dishes')} />
        </div>
      )}

      {tab === 'reports' && <KitchenReports orders={orders} />}

      {tab === 'dishes' && (
        <div>
          <button
            onClick={() => setDishModal({})}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: T.primary, color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', marginBottom: 14 }}
          >
            + Add Dish
          </button>
          {dishes.length === 0 ? (
            <EmptyState text="No dishes yet — add your first one." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dishes.map(dish => (
                <DishRow
                  key={dish.id} dish={dish}
                  onEdit={setDishModal}
                  onToggleStock={onToggleStock}
                  onToggleVisible={onToggleVisible}
                  onDelete={d => { if (confirm(`Delete "${d.name}"? This cannot be undone.`)) onDeleteDish(d.id); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        needsAction.length === 0 ? (
          <EmptyState text="No new orders — you're all caught up." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {needsAction.map(order => (
              <OrderRow
                key={order.id} order={order}
                onAccept={() => onUpdateOrder(order.id, { status: 'accepted', acceptedAt: new Date().toISOString() })}
                onReject={() => onUpdateOrder(order.id, { status: 'rejected', rejectedAt: new Date().toISOString() })}
              />
            ))}
          </div>
        )
      )}

      {tab === 'preparing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <section>
            {preparing.length === 0 ? (
              <EmptyState text="Nothing being prepared right now." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {preparing.map((order, i) => (
                  <div key={order.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: T.primaryBg, color: T.primaryDark, fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <OrderRow
                        order={order}
                        onDeliver={() => onUpdateOrder(order.id, { status: 'delivered', deliveredAt: new Date().toISOString() })}
                        onMarkPaid={() => onUpdateOrder(order.id, { paymentStatus: 'paid', paidAt: new Date().toISOString() })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {history.length > 0 && (
            <section>
              <div style={SECTION_LABEL}>History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(order => (
                  <OrderRow
                    key={order.id} order={order}
                    onDeliver={() => onUpdateOrder(order.id, { status: 'delivered', deliveredAt: new Date().toISOString() })}
                    onMarkPaid={() => onUpdateOrder(order.id, { paymentStatus: 'paid', paidAt: new Date().toISOString() })}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {dishModal && (
        <DishFormModal
          initial={dishModal.id ? dishModal : null}
          onClose={() => setDishModal(null)}
          onSave={async data => { await onSaveDish(data); setDishModal(null); }}
        />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0', border: `1.5px dashed ${T.border}`, borderRadius: 16 }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.textSub }}>{text}</div>
    </div>
  );
}
