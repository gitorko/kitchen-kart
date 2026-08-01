import { authFetch, getSession, parseJson } from './auth.js';

const IS_DEV = !import.meta.env.PROD;

function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function makeLocalCrud(key) {
  return {
    getAll: () => Promise.resolve(lsGet(key, [])),
    create: (item) => {
      const all = lsGet(key, []);
      all.push(item);
      lsSet(key, all);
      return Promise.resolve(item);
    },
    update: (item) => {
      const all = lsGet(key, []).map(x => (x.id === item.id ? { ...x, ...item } : x));
      lsSet(key, all);
      return Promise.resolve(all.find(x => x.id === item.id));
    },
    remove: (id) => {
      lsSet(key, lsGet(key, []).filter(x => x.id !== id));
      return Promise.resolve();
    },
  };
}

function makeRemoteCrud(path) {
  return {
    getAll: () => authFetch(`/api/${path}`).then(parseJson),
    create: (item) => authFetch(`/api/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).then(parseJson),
    update: (item) => authFetch(`/api/${path}/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).then(parseJson),
    remove: (id) => authFetch(`/api/${path}/${id}`, { method: 'DELETE' }).then(parseJson),
  };
}

export const kitchensApi = IS_DEV ? makeLocalCrud('kk_kitchens') : makeRemoteCrud('kitchens');
export const dishesApi   = IS_DEV ? makeLocalCrud('kk_dishes')   : makeRemoteCrud('dishes');
export const ordersApi   = IS_DEV ? makeLocalCrud('kk_orders')   : makeRemoteCrud('orders');

// Toggle a heart on a dish for the current user. The server computes membership
// from the requester's own id — dev mode mirrors that locally for parity.
export async function toggleDishHeart(dish, heart) {
  if (IS_DEV) {
    const session = getSession();
    const heartedBy = new Set(dish.heartedBy || []);
    if (heart) heartedBy.add(session?.userId); else heartedBy.delete(session?.userId);
    return dishesApi.update({ id: dish.id, heartedBy: [...heartedBy] });
  }
  const res = await authFetch(`/api/dishes/${dish.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ heart }),
  });
  return parseJson(res);
}
