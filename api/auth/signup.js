import { neon } from '@neondatabase/serverless';
import { hashPin, generateCode } from '../_auth.js';
import { withErrorHandling } from '../_util.js';
import { log } from '../_log.js';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, phone, apartment, pin, role, replacingExisting } = req.body || {};

  if (!name?.trim() || !phone?.trim() || !apartment?.trim() || !pin?.trim())
    return res.status(400).json({ error: 'All fields are required' });
  if (!/^\d{4}$/.test(pin))
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
  if (!['customer', 'kitchen'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });

  if (process.env.ADMIN_APARTMENT && apartment.trim() === process.env.ADMIN_APARTMENT)
    return res.status(409).json({ error: 'An account with this apartment number already exists' });

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;

  const existing = await sql`SELECT data FROM users WHERE data->>'apartment' = ${apartment.trim()}`;
  const existingUser = existing[0]?.data;
  if (existingUser && !replacingExisting) {
    return res.status(409).json({
      error: 'An account with this apartment number already exists.',
      apartmentTaken: true,
    });
  }

  const id = Date.now();
  const code = generateCode();
  const user = {
    id,
    name: name.trim(),
    phone: phone.trim(),
    apartment: apartment.trim(),
    pinHash: hashPin(apartment.trim(), pin),
    role,
    status: 'pending',
    code,
    // Set only when replacing whoever currently holds this apartment — the old
    // account is deleted when this signup is approved, not before.
    replacesUserId: existingUser ? existingUser.id : undefined,
    createdAt: new Date().toISOString(),
  };
  await sql`INSERT INTO users (id, data) VALUES (${id}, ${JSON.stringify(user)})`;
  log('signup', { apartment: user.apartment, role, replacesUserId: user.replacesUserId });
  return res.status(201).json({ code, userId: id });
}

export default withErrorHandling('auth', handler);
