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
  return { apartment: import.meta.env.ADMIN_APARTMENT, pin: import.meta.env.ADMIN_PIN };
}

export async function signup({ name, phone, apartment, pin, role, replacingExisting }) {
  if (IS_DEV) {
    const users = lsGet(USERS_KEY, []);
    const { apartment: adminApartment } = adminCreds();
    if (apartment === adminApartment) throw new Error('An account with this apartment number already exists');
    const existingUser = users.find(u => u.apartment === apartment);
    if (existingUser && !replacingExisting) {
      const err = new Error('An account with this apartment number already exists.');
      err.apartmentTaken = true;
      throw err;
    }
    const id = Date.now();
    const code = generateCode();
    users.push({
      id, name, phone, apartment, pin, role, status: 'pending', code,
      replacesUserId: existingUser ? existingUser.id : undefined,
      createdAt: new Date().toISOString(),
    });
    lsSet(USERS_KEY, users);
    return { code, userId: id };
  }
  const res = await fetch('/api/auth/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, apartment, pin, role, replacingExisting }),
  });
  return parseJson(res);
}

export async function login({ apartment, pin }) {
  if (IS_DEV) {
    const admin = adminCreds();
    if (admin.apartment && admin.pin && apartment === admin.apartment && pin === admin.pin) {
      const session = { token: 'dev', userId: 'admin', role: 'admin', name: 'Admin' };
      setSession(session);
      return session;
    }
    const users = lsGet(USERS_KEY, []);
    const user = users.find(u => u.apartment === apartment);
    if (!user || user.pin !== pin) throw new Error('Invalid apartment number or PIN');
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
    body: JSON.stringify({ apartment, pin }),
  });
  const data = await parseJson(res);
  const session = { token: data.token, ...data.user };
  setSession(session);
  return session;
}

export function logout() { clearSession(); }

// Forgot-PIN flow: stages a new PIN and issues a code to share with an
// admin/kitchen for approval — the old PIN keeps working until then.
export async function requestPinReset({ apartment, newPin }) {
  if (IS_DEV) {
    const users = lsGet(USERS_KEY, []);
    const user = users.find(u => u.apartment === apartment);
    if (!user || user.status !== 'approved') throw new Error('No approved account found for that apartment number');
    const code = generateCode();
    user.pinResetRequest = { newPin, code, requestedAt: new Date().toISOString() };
    lsSet(USERS_KEY, users);
    return { code };
  }
  const res = await fetch('/api/auth/reset-pin', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apartment, newPin }),
  });
  return parseJson(res);
}

export async function fetchApprovals() {
  if (IS_DEV) {
    const users = lsGet(USERS_KEY, []);
    return {
      pending: users.filter(u => u.status === 'pending').map(({ pin, ...rest }) => rest),
      pinResets: users.filter(u => u.pinResetRequest).map(u => ({
        id: u.id, name: u.name, phone: u.phone, apartment: u.apartment, role: u.role,
        code: u.pinResetRequest.code, requestedAt: u.pinResetRequest.requestedAt,
      })),
      history: lsGet(APPROVALS_KEY, []),
    };
  }
  return parseJson(await authFetch('/api/approvals'));
}

export async function submitApproval({ userId, action, reason, type }) {
  const session = getSession();
  if (IS_DEV) {
    const users = lsGet(USERS_KEY, []);
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    if (type === 'pin_reset') {
      if (!user.pinResetRequest) throw new Error('No pending PIN reset for this user');
      if (action === 'approve') user.pin = user.pinResetRequest.newPin;
      delete user.pinResetRequest;
      lsSet(USERS_KEY, users);
      const log = {
        id: Date.now(), userId, userName: user.name, userPhone: user.phone,
        approvedByUserId: session.userId, approvedByName: session.name,
        action, type: 'pin_reset', reason: action === 'reject' ? (reason || '') : undefined,
        createdAt: new Date().toISOString(),
      };
      const history = lsGet(APPROVALS_KEY, []);
      history.unshift(log);
      lsSet(APPROVALS_KEY, history);
      return log;
    }

    user.status = action === 'approve' ? 'approved' : 'rejected';
    if (action === 'reject' && reason) user.rejectionReason = reason;
    lsSet(USERS_KEY, users);
    const log = {
      id: Date.now(), userId, userName: user.name, userPhone: user.phone,
      approvedByUserId: session.userId, approvedByName: session.name,
      action, reason: action === 'reject' ? (reason || '') : undefined,
      code: user.code, createdAt: new Date().toISOString(),
    };
    const history = lsGet(APPROVALS_KEY, []);
    history.unshift(log);
    lsSet(APPROVALS_KEY, history);
    return log;
  }
  const res = await authFetch('/api/approvals', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, action, reason, type }),
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

// Admin-only: delete a user outright. Only removes the user record — if they
// ran a kitchen, the caller is responsible for also removing that kitchen and
// its dishes (dev mode has no server to cascade automatically).
export async function deleteUser(userId) {
  if (IS_DEV) {
    lsSet(USERS_KEY, lsGet(USERS_KEY, []).filter(u => u.id !== userId));
    return;
  }
  const res = await authFetch(`/api/users?userId=${userId}`, { method: 'DELETE' });
  return parseJson(res);
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
