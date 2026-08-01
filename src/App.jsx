import { useState, useEffect, useCallback, useMemo } from 'react';
import { T } from './theme.js';
import { getSession } from './lib/auth.js';
import { logout, fetchApprovals, submitApproval } from './lib/authApi.js';
import { kitchensApi, dishesApi, ordersApi, toggleDishHeart } from './lib/api.js';
import LoginPage from './components/LoginPage.jsx';
import SignupPage from './components/SignupPage.jsx';
import HomePage from './components/HomePage.jsx';
import OrdersPage from './components/OrdersPage.jsx';
import KitchenDashboard from './components/KitchenDashboard.jsx';
import AdminApprovals from './components/AdminApprovals.jsx';
import CartDrawer from './components/CartDrawer.jsx';

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
  const [authView, setAuthView] = useState(null); // null | 'login' | 'signup'

  if (authView) {
    return authView === 'login'
      ? <LoginPage onLogin={s => { setSession(s); setAuthView(null); }} onGoSignup={() => setAuthView('signup')} onBack={() => setAuthView(null)} />
      : <SignupPage onGoLogin={() => setAuthView('login')} onBack={() => setAuthView(null)} />;
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
  const [approvals, setApprovals] = useState({ pending: [], history: [] });
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
      session && canApprove ? fetchApprovals() : Promise.resolve({ pending: [], history: [] }),
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

  // ── Kitchen dashboard ──
  async function saveKitchen(data) {
    if (data.id) {
      const updated = await kitchensApi.update(data);
      setKitchens(prev => prev.map(k => (k.id === updated.id ? updated : k)));
    } else {
      const created = await kitchensApi.create({ ...data, id: Date.now(), ownerUserId: session.userId, createdAt: new Date().toISOString() });
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
  async function rejectUser(userId) {
    await submitApproval({ userId, action: 'reject' });
    setApprovals(await fetchApprovals());
    setHighlightCode(null);
  }

  const TABS = [
    { key: 'home', label: '🏠 Home' },
    session?.role === 'customer' && { key: 'orders', label: '🧾 My Orders' },
    session?.role === 'kitchen' && { key: 'kitchen', label: '👩‍🍳 My Kitchen' },
    session && canApprove && { key: 'approvals', label: `✅ Approvals${approvals.pending.length ? ` (${approvals.pending.length})` : ''}` },
  ].filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 90px' }}>

        <div style={{ padding: '16px 0 12px', position: 'sticky', top: 0, background: T.bg, zIndex: 20, borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: T.text, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>🍲 Kitchen Kart</h1>
              <p style={{ color: T.textSub, fontSize: 11, marginTop: 2 }}>{session ? `Hi, ${session.name || 'there'}` : 'Home-cooked food from your neighbours'}</p>
            </div>
            {session ? (
              <button onClick={onLogout} style={{ background: 'none', border: 'none', fontSize: 12, color: T.textMuted, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 2px', fontWeight: 500, flexShrink: 0 }}>Sign out</button>
            ) : (
              <button
                onClick={onRequireAuth}
                style={{ background: T.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >
                Sign In
              </button>
            )}
          </div>

          {TABS.length > 1 && (
            <div style={{ display: 'flex', gap: 6, background: T.surface, borderRadius: 10, padding: 4, border: `1px solid ${T.border}`, overflowX: 'auto' }}>
              {TABS.map(({ key, label }) => (
                <button
                  key={key} onClick={() => setTab(key)}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: tab === key ? T.bg : 'transparent',
                    color: tab === key ? T.text : T.textMuted,
                    fontWeight: tab === key ? 700 : 500, fontFamily: 'inherit', fontSize: 12.5,
                    whiteSpace: 'nowrap',
                    boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
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
            sharedDishId={dismissShared ? null : sharedDishId}
            onClearShared={() => setDismissShared(true)}
          />
        ) : tab === 'orders' ? (
          <OrdersPage orders={myOrders} kitchens={kitchens} onMarkPaid={markPaid} />
        ) : tab === 'kitchen' ? (
          <KitchenDashboard
            kitchen={myKitchen} dishes={myDishes} orders={myOrders}
            onSaveKitchen={saveKitchen} onSaveDish={saveDish} onDeleteDish={deleteDish}
            onToggleStock={toggleStock} onUpdateOrder={updateOrder}
          />
        ) : tab === 'approvals' ? (
          <AdminApprovals
            pending={approvals.pending} history={approvals.history} highlightCode={highlightCode}
            onApprove={approveUser} onReject={rejectUser}
          />
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
