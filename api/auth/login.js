import { neon } from '@neondatabase/serverless';
import { verifyPin, createToken } from '../_auth.js';
import { withErrorHandling } from '../_util.js';
import { log } from '../_log.js';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { apartment, pin } = req.body || {};
  if (!apartment || !pin) return res.status(400).json({ error: 'Apartment number and PIN are required' });

  // The bootstrap admin isn't a resident, so it keeps its own env-configured
  // identifier (ADMIN_APARTMENT) rather than a real apartment number.
  const adminApartment = process.env.ADMIN_APARTMENT;
  const adminPin = process.env.ADMIN_PIN;
  if (adminApartment && adminPin && apartment === adminApartment && pin === adminPin) {
    const user = { userId: 'admin', role: 'admin', name: 'Admin' };
    log('admin_login', {});
    return res.json({ token: createToken(user), user });
  }

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
  const rows = await sql`SELECT data FROM users WHERE data->>'apartment' = ${apartment}`;
  const record = rows[0]?.data;

  if (!record || !verifyPin(apartment, pin, record.pinHash)) {
    log('login_failed', { apartment, reason: !record ? 'no_account' : 'bad_pin' });
    return res.status(401).json({ error: 'Invalid apartment number or PIN' });
  }
  if (record.status !== 'approved') {
    log('login_blocked', { apartment, status: record.status });
    return res.status(403).json({
      error: record.status === 'rejected'
        ? 'Your signup was rejected. Contact admin.'
        : 'Your account is pending approval. Share your code with admin.',
      status: record.status,
      code: record.code,
    });
  }

  const user = { userId: record.id, phone: record.phone, role: record.role, name: record.name, apartment: record.apartment };
  log('login_success', { apartment, role: record.role });
  return res.json({ token: createToken(user), user });
}

export default withErrorHandling('auth', handler);
