import { useState, useEffect, useCallback, useMemo } from 'react';
import { T } from './theme.js';
import { getSession, isImpersonating, stopImpersonation } from './lib/auth.js';
import { logout, fetchApprovals, submitApproval, impersonateUser } from './lib/authApi.js';
import { kitchensApi, dishesApi, ordersApi, toggleDishHeart, toggleKitchenFavorite } from './lib/api.js';
import LoginPage from './components/LoginPage.jsx';
import SignupPage from './components/SignupPage.jsx';
import ForgotPinPage from './components/ForgotPinPage.jsx';
import HomePage from './components/HomePage.jsx';
import OrdersPage from './components/OrdersPage.jsx';
import KitchenDashboard from './components/KitchenDashboard.jsx';
import AdminApprovals from './components/AdminApprovals.jsx';
import AdminUsers from './components/AdminUsers.jsx';
import AdminKitchens from './components/AdminKitchens.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import UserMenu from './components/UserMenu.jsx';

const IS_DEV = !import.meta.env.PROD;
const CART_KEY = 'kk_cart';

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); } catch { return {}; }
}

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const [authView, setAuthView] = useState(null); // null | 'login' | 'signup' | 'forgot-pin'

  if (authView === 'login') {
    return (
      <LoginPage
        onLogin={s => { setSession(s); setAuthView(null); }}
        onGoSignup={() => setAuthView('signup')}
        onGoForgotPin={() => setAuthView('forgot-pin')}
        onBack={() => setAuthView(null)}
      />
    );
  }
  if (authView === 'signup') {
    return <SignupPage onGoLogin={() => setAuthView('login')} onBack={() => setAuthView(null)} />;
  }
  if (authView === 'forgot-pin') {
    return <ForgotPinPage onGoLogin={() => setAuthView('login')} />;
  }

  return (
    <AppShell
      session={session}
      onRequireAuth={() => setAuthView('login')}
      onLogout={() => { logout(); setSession(null); }}
    />
  );
}

function AppShell({ session, onRequireAuth, onLogout }) {
  const canApprove = session?.role === 'admin' || session?.role === 'kitchen';

  const [tab, setTab] = useState('home');
  const [kitchens, setKitchens] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [approvals, setApprovals] = useState({ pending: [], pinResets: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [sharedDishId] = useState(() => {
    const d = getUrlParam('dish');
    return d ? Number(d) : null;
  });
  const [dismissShared, setDismissShared] = useState(false);
  const [highlightCode, setHighlightCode] = useState(() => getUrlParam('approve'));

  useEffect(() => {
    if (getUrlParam('dish') || getUrlParam('approve')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => { if (tab !== 'home' && !session) setTab('home'); }, [session, tab]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      kitchensApi.getAll(),
      dishesApi.getAll(),
      session ? ordersApi.getAll() : Promise.resolve([]),
      session && canApprove ? fetchApprovals() : Promise.resolve({ pending: [], pinResets: [], history: [] }),
    ]).then(([k, d, o, a]) => {
      setKitchens(k);
      setDishes(d);
      setOrders(o);
      setApprovals(a);
      setLoading(false);
    });
  }, [session, canApprove]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (highlightCode && canApprove) setTab('approvals');
  }, [highlightCode, canApprove]);

  const myKitchen = kitchens.find(k => session && k.ownerUserId === session.userId) || null;
  const myDishes = dishes.filter(d => myKitchen && d.kitchenId === myKitchen.id);
  const myOrders = orders.filter(o => (myKitchen ? o.kitchenId === myKitchen.id : session && o.userId === session.userId));

  const kitchenNameById = useMemo(() => Object.fromEntries(kitchens.map(k => [k.id, k.name])), [kitchens]);

  // ── Cart — works without an account; only checkout requires one ──
  function addToCart(dish) {
    setCart(prev => {
      const kc = prev[dish.kitchenId] || { kitchenId: dish.kitchenId, kitchenName: kitchenNameById[dish.kitchenId], items: [] };
      const existing = kc.items.find(i => i.dishId === dish.id);
      const items = existing
        ? kc.items.map(i => (i.dishId === dish.id ? { ...i, qty: i.qty + 1 } : i))
        : [...kc.items, { dishId: dish.id, name: dish.name, price: dish.price, qty: 1, comment: '' }];
      return { ...prev, [dish.kitchenId]: { ...kc, items } };
    });
  }

  function changeQty(kitchenId, dishId, delta) {
    setCart(prev => {
      const kc = prev[kitchenId];
      if (!kc) return prev;
      const items = kc.items
        .map(i => (i.dishId === dishId ? { ...i, qty: i.qty + delta } : i))
        .filter(i => i.qty > 0);
      if (items.length === 0) {
        const next = { ...prev };
        delete next[kitchenId];
        return next;
      }
      return { ...prev, [kitchenId]: { ...kc, items } };
    });
  }

  function setComment(kitchenId, dishId, comment) {
    setCart(prev => {
      const kc = prev[kitchenId];
      if (!kc) return prev;
      return { ...prev, [kitchenId]: { ...kc, items: kc.items.map(i => (i.dishId === dishId ? { ...i, comment } : i)) } };
    });
  }

  async function placeOrder(kitchenId) {
    if (!session) { onRequireAuth(); return; }
    const kc = cart[kitchenId];
    if (!kc || kc.items.length === 0) return;
    const kitchen = kitchens.find(k => k.id === kitchenId);
    if (kitchen?.onVacation) throw new Error(`${kitchen.name} is on vacation and not taking orders right now.`);
    const totalAmount = kc.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const order = {
      id: Date.now(),
      userId: session.userId,
      userName: session.name,
      userPhone: session.phone,
      apartment: session.apartment,
      kitchenId,
      kitchenName: kc.kitchenName,
      items: kc.items,
      totalAmount,
      status: 'placed',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
    };
    const created = await ordersApi.create(order);
    setOrders(prev => [created, ...prev]);
    setCart(prev => {
      const next = { ...prev };
      delete next[kitchenId];
      return next;
    });
  }

  const cartCount = Object.values(cart).reduce((sum, kc) => sum + kc.items.reduce((s, i) => s + i.qty, 0), 0);

  // ── Dishes / hearts (heart button only renders when logged in) ──
  async function toggleHeart(dish) {
    if (!session) return;
    const hearted = (dish.heartedBy || []).includes(session.userId);
    const updated = await toggleDishHeart(dish, !hearted);
    setDishes(prev => prev.map(d => (d.id === dish.id ? updated : d)));
  }

  async function toggleFavorite(kitchen) {
    if (!session) return;
    const favorited = (kitchen.favoritedBy || []).includes(session.userId);
    const updated = await toggleKitchenFavorite(kitchen, !favorited);
    setKitchens(prev => prev.map(k => (k.id === updated.id ? updated : k)));
  }

  // ── Kitchen dashboard ──
  async function saveKitchen(data) {
    if (data.id) {
      const updated = await kitchensApi.update(data);
      setKitchens(prev => prev.map(k => (k.id === updated.id ? updated : k)));
    } else {
      const created = await kitchensApi.create({ ...data, id: Date.now(), ownerUserId: session.userId, phone: session.phone, createdAt: new Date().toISOString() });
      setKitchens(prev => [created, ...prev]);
    }
  }

  async function saveDish(data) {
    if (data.id) {
      const updated = await dishesApi.update(data);
      setDishes(prev => prev.map(d => (d.id === updated.id ? updated : d)));
    } else {
      const created = await dishesApi.create({ ...data, id: Date.now(), kitchenId: myKitchen.id, heartedBy: [], createdAt: new Date().toISOString() });
      setDishes(prev => [created, ...prev]);
    }
  }

  async function deleteDish(dishId) {
    await dishesApi.remove(dishId);
    setDishes(prev => prev.filter(d => d.id !== dishId));
  }

  async function toggleStock(dish) {
    const updated = await dishesApi.update({ id: dish.id, inStock: !dish.inStock });
    setDishes(prev => prev.map(d => (d.id === updated.id ? updated : d)));
  }

  async function toggleVisible(dish) {
    const updated = await dishesApi.update({ id: dish.id, visible: dish.visible === false });
    setDishes(prev => prev.map(d => (d.id === updated.id ? updated : d)));
  }

  async function toggleVacation(kitchen) {
    const updated = await kitchensApi.update({ id: kitchen.id, onVacation: !kitchen.onVacation });
    setKitchens(prev => prev.map(k => (k.id === updated.id ? updated : k)));
  }

  // ── Admin: delete a kitchen (and its dishes — the server cascades this too,
  // but dev mode has no server, so the client cleans up its own dish records) ──
  async function deleteKitchen(kitchenId) {
    const dishIds = dishes.filter(d => d.kitchenId === kitchenId).map(d => d.id);
    await Promise.all(dishIds.map(id => dishesApi.remove(id)));
    await kitchensApi.remove(kitchenId);
    setKitchens(prev => prev.filter(k => k.id !== kitchenId));
    setDishes(prev => prev.filter(d => d.kitchenId !== kitchenId));
  }

  async function updateOrder(orderId, patch) {
    const updated = await ordersApi.update({ id: orderId, ...patch });
    setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
  }

  function markPaid(orderId) {
    return updateOrder(orderId, { paymentStatus: 'paid', paidAt: new Date().toISOString() });
  }

  // ── Approvals ──
  async function approveUser(userId) {
    await submitApproval({ userId, action: 'approve' });
    setApprovals(await fetchApprovals());
    setHighlightCode(null);
  }
  async function rejectUser(userId, reason) {
    await submitApproval({ userId, action: 'reject', reason });
    setApprovals(await fetchApprovals());
    setHighlightCode(null);
  }
  async function approvePinReset(userId) {
    await submitApproval({ userId, action: 'approve', type: 'pin_reset' });
    setApprovals(await fetchApprovals());
  }
  async function rejectPinReset(userId, reason) {
    await submitApproval({ userId, action: 'reject', reason, type: 'pin_reset' });
    setApprovals(await fetchApprovals());
  }

  // ── Admin: impersonate a user ──
  async function handleImpersonate(userId) {
    await impersonateUser(userId);
    window.location.reload();
  }
  function handleStopImpersonation() {
    stopImpersonation();
    window.location.reload();
  }

  const TABS = [
    { key: 'home', label: '🏠 Home' },
    session?.role === 'customer' && { key: 'orders', label: '🧾 My Orders' },
    session?.role === 'kitchen' && { key: 'kitchen', label: '👩‍🍳 My Kitchen' },
    session && canApprove && { key: 'approvals', label: `✅ Approvals${approvals.pending.length ? ` (${approvals.pending.length})` : ''}` },
    session?.role === 'admin' && { key: 'users', label: '👥 Users' },
    session?.role === 'admin' && { key: 'kitchens', label: '🏠 Kitchens' },
  ].filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text }}>
      {isImpersonating() && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap',
          padding: '8px 16px', fontSize: 12.5, background: '#f3ead9', color: '#8a6d3b', borderBottom: '1px solid #e0d3b8',
        }}>
          <span>👁 Viewing as <strong>{session?.name} ({session?.phone})</strong></span>
          <button
            type="button" onClick={handleStopImpersonation}
            style={{ border: '1px solid #8a6d3b', borderRadius: 8, background: 'transparent', color: '#8a6d3b', padding: '3px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Stop Impersonation
          </button>
        </div>
      )}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 90px' }}>

        <div style={{ padding: '14px 0 10px', position: 'sticky', top: 0, background: T.bg, zIndex: 20, borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
              🍲 Kitchen Kart
            </h1>
            {session ? (
              <UserMenu name={session.name} onLogout={onLogout} />
            ) : (
              <button
                onClick={onRequireAuth}
                style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Sign In
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {TABS.map(({ key, label }) => (
              <button
                key={key} onClick={() => setTab(key)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12.5, fontWeight: tab === key ? 700 : 500, whiteSpace: 'nowrap', flexShrink: 0,
                  color: tab === key ? T.text : T.textMuted, padding: '6px 8px',
                  borderBottom: `2px solid ${tab === key ? T.primary : 'transparent'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {IS_DEV && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 14px', marginBottom: 14, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🧪</span>
            <span>Dev mode — data saved to browser localStorage (not Postgres)</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: T.textMuted, padding: 60, fontSize: 15 }}>Loading…</div>
        ) : tab === 'home' ? (
          <HomePage
            kitchens={kitchens} dishes={dishes} cart={cart} session={session}
            onAdd={addToCart}
            onIncrement={dish => changeQty(dish.kitchenId, dish.id, 1)}
            onDecrement={dish => changeQty(dish.kitchenId, dish.id, -1)}
            onToggleHeart={toggleHeart}
            onToggleFavorite={toggleFavorite}
            sharedDishId={dismissShared ? null : sharedDishId}
            onClearShared={() => setDismissShared(true)}
          />
        ) : tab === 'orders' ? (
          <OrdersPage orders={myOrders} kitchens={kitchens} onMarkPaid={markPaid} />
        ) : tab === 'kitchen' ? (
          <KitchenDashboard
            kitchen={myKitchen} dishes={myDishes} orders={myOrders}
            onSaveKitchen={saveKitchen} onSaveDish={saveDish} onDeleteDish={deleteDish}
            onToggleStock={toggleStock} onToggleVisible={toggleVisible}
            onUpdateOrder={updateOrder} onToggleVacation={toggleVacation}
          />
        ) : tab === 'approvals' ? (
          <AdminApprovals
            pending={approvals.pending} pinResets={approvals.pinResets} history={approvals.history} highlightCode={highlightCode}
            onApprove={approveUser} onReject={rejectUser}
            onApprovePinReset={approvePinReset} onRejectPinReset={rejectPinReset}
          />
        ) : tab === 'users' ? (
          <AdminUsers onImpersonate={handleImpersonate} />
        ) : tab === 'kitchens' ? (
          <AdminKitchens kitchens={kitchens} dishes={dishes} onDelete={deleteKitchen} />
        ) : null}
      </div>

      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 90,
            background: T.primary, color: '#fff', border: 'none', borderRadius: 30,
            padding: '13px 20px', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
            cursor: 'pointer', boxShadow: '0 8px 24px rgba(255,69,0,0.35)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          🛒 {cartCount} item{cartCount !== 1 ? 's' : ''}
        </button>
      )}

      {cartOpen && (
        <CartDrawer
          cart={cart}
          session={session}
          kitchens={kitchens}
          onIncrement={(kitchenId, dishId) => changeQty(kitchenId, dishId, 1)}
          onDecrement={(kitchenId, dishId) => changeQty(kitchenId, dishId, -1)}
          onComment={setComment}
          onPlaceOrder={placeOrder}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  );
}
