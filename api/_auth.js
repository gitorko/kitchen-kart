import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

// Set AUTH_SECRET env var in Vercel for production security.
// Falls back to a dev secret when running locally.
const SECRET = process.env.AUTH_SECRET || 'kitchen-kart-dev-secret-change-me';
const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easy to read aloud/type

export function hashPin(phone, pin) {
  return createHmac('sha256', SECRET).update(`${phone}:${pin}`).digest('hex');
}

export function verifyPin(phone, pin, hash) {
  if (!hash) return false;
  try {
    const expected = Buffer.from(hashPin(phone, pin), 'hex');
    const actual = Buffer.from(hash, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function generateCode(len = 6) {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return out;
}

export function createToken(payload, ttlMs = TOKEN_TTL_MS) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + ttlMs })
  ).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(expected, 'base64url');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function getAuth(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return verifyToken(token);
}

// Returns the decoded { userId, phone, role, name } on success, or null after
// already writing a 401/403 response — callers should `if (!user) return;`.
export function requireAuth(req, res, roles) {
  const user = getAuth(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return user;
}
