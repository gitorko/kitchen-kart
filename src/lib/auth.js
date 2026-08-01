const SESSION_KEY = 'kk_session';
// While impersonating, the admin's own session is parked here so they can return.
const ADMIN_BACKUP_KEY = 'kk_admin_backup';

function b64urlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.token === 'dev') return session; // dev session — no expiry check needed locally
    const [payload] = session.token.split('.');
    if (!payload) return null;
    const { exp } = JSON.parse(b64urlDecode(payload));
    if (!exp || exp < Date.now()) { localStorage.removeItem(SESSION_KEY); return null; }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ADMIN_BACKUP_KEY);
}

export function isImpersonating() {
  return !!localStorage.getItem(ADMIN_BACKUP_KEY);
}

export function startImpersonation(session) {
  const current = localStorage.getItem(SESSION_KEY);
  if (current) localStorage.setItem(ADMIN_BACKUP_KEY, current);
  setSession(session);
}

export function stopImpersonation() {
  const backup = localStorage.getItem(ADMIN_BACKUP_KEY);
  localStorage.removeItem(ADMIN_BACKUP_KEY);
  if (backup) localStorage.setItem(SESSION_KEY, backup);
  else clearSession();
}

export function authFetch(url, opts = {}) {
  const session = getSession();
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${session?.token || ''}` },
  }).then(r => {
    if (r.status === 401) { clearSession(); window.location.reload(); }
    return r;
  });
}

// Turns a fetch Response into clean data or a clean Error — never lets a raw
// backend crash page (HTML, a stack trace) leak through as a JSON parse error.
export async function parseJson(res) {
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body, e.g. a crash page */ }
  if (!res.ok) {
    const err = new Error(data?.error || 'Something went wrong. Please try again.');
    if (data?.status) err.status = data.status;
    if (data?.code) err.code = data.code;
    if (data?.apartmentTaken) err.apartmentTaken = true;
    throw err;
  }
  return data;
}
