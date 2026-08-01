import { getSession, setSession, clearSession, authFetch, parseJson, startImpersonation } from './auth.js';

const IS_DEV = !import.meta.env.PROD;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easy to read aloud/type

function generateCode(len = 6) {
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const USERS_KEY = 'kk_users';
const APPROVALS_KEY = 'kk_approvals';

function adminCreds() {
  return { phone: import.meta.env.ADMIN_PHONE, pin: import.meta.env.ADMIN_PIN };
}

export async function signup({ name, phone, apartment, pin, role }) {
  if (IS_DEV) {
    const users = lsGet(USERS_KEY, []);
    const { phone: adminPhone } = adminCreds();
    if (phone === adminPhone || users.some(u => u.phone === phone))
      throw new Error('An account with this phone number already exists');
    const id = Date.now();
    const code = generateCode();
    users.push({ id, name, phone, apartment, pin, role, status: 'pending', code, createdAt: new Date().toISOString() });
    lsSet(USERS_KEY, users);
    return { code, userId: id };
  }
  const res = await fetch('/api/auth/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, apartment, pin, role }),
  });
  return parseJson(res);
}

export async function login({ phone, pin }) {
  if (IS_DEV) {
    const admin = adminCreds();
    if (admin.phone && admin.pin && phone === admin.phone && pin === admin.pin) {
      const session = { token: 'dev', userId: 'admin', phone, role: 'admin', name: 'Admin' };
      setSession(session);
      return session;
    }
    const users = lsGet(USERS_KEY, []);
    const user = users.find(u => u.phone === phone);
    if (!user || user.pin !== pin) throw new Error('Invalid phone number or PIN');
    if (user.status !== 'approved') {
      const err = new Error(
        user.status === 'rejected'
          ? 'Your signup was rejected. Contact admin.'
          : 'Your account is pending approval. Share your code with admin.'
      );
      err.status = user.status; err.code = user.code;
      throw err;
    }
    const session = { token: 'dev', userId: user.id, phone: user.phone, role: user.role, name: user.name, apartment: user.apartment };
    setSession(session);
    return session;
  }
  const res = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, pin }),
  });
  const data = await parseJson(res);
  const session = { token: data.token, ...data.user };
  setSession(session);
  return session;
}

export function logout() { clearSession(); }

export async function fetchApprovals() {
  if (IS_DEV) {
    const users = lsGet(USERS_KEY, []);
    return {
      pending: users.filter(u => u.status === 'pending').map(({ pin, ...rest }) => rest),
      history: lsGet(APPROVALS_KEY, []),
    };
  }
  return parseJson(await authFetch('/api/approvals'));
}

export async function submitApproval({ userId, action }) {
  const session = getSession();
  if (IS_DEV) {
    const users = lsGet(USERS_KEY, []);
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    user.status = action === 'approve' ? 'approved' : 'rejected';
    lsSet(USERS_KEY, users);
    const log = {
      id: Date.now(), userId, userName: user.name, userPhone: user.phone,
      approvedByUserId: session.userId, approvedByName: session.name,
      action, code: user.code, createdAt: new Date().toISOString(),
    };
    const history = lsGet(APPROVALS_KEY, []);
    history.unshift(log);
    lsSet(APPROVALS_KEY, history);
    return log;
  }
  const res = await authFetch('/api/approvals', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, action }),
  });
  return parseJson(res);
}

// Admin-only: list every user (for the impersonation picker).
export async function fetchAllUsers() {
  if (IS_DEV) {
    return lsGet(USERS_KEY, []).map(({ pin, ...rest }) => rest);
  }
  return parseJson(await authFetch('/api/users'));
}

// Admin-only: sign in as another approved user without knowing their PIN, to see
// the app exactly as they would. The admin's own session is parked so "Stop
// Impersonation" can restore it.
export async function impersonateUser(userId) {
  if (IS_DEV) {
    const user = lsGet(USERS_KEY, []).find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    if (user.status !== 'approved') throw new Error('Can only impersonate an approved user');
    startImpersonation({ token: 'dev', userId: user.id, phone: user.phone, role: user.role, name: user.name, apartment: user.apartment });
    return;
  }
  const res = await authFetch('/api/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await parseJson(res);
  startImpersonation({ token: data.token, ...data.user });
}
