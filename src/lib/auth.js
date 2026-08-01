const SESSION_KEY = 'kk_session';

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
