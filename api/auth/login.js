import { neon } from '@neondatabase/serverless';
import { verifyPin, createToken } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { phone, pin } = req.body || {};
  if (!phone || !pin) return res.status(400).json({ error: 'Phone and PIN are required' });

  const adminPhone = process.env.ADMIN_PHONE;
  const adminPin = process.env.ADMIN_PIN;
  if (adminPhone && adminPin && phone === adminPhone && pin === adminPin) {
    const user = { userId: 'admin', phone, role: 'admin', name: 'Admin' };
    return res.json({ token: createToken(user), user });
  }

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
  const rows = await sql`SELECT data FROM users WHERE data->>'phone' = ${phone}`;
  const record = rows[0]?.data;

  if (!record || !verifyPin(phone, pin, record.pinHash)) {
    return res.status(401).json({ error: 'Invalid phone number or PIN' });
  }
  if (record.status !== 'approved') {
    return res.status(403).json({
      error: record.status === 'rejected'
        ? 'Your signup was rejected. Contact admin.'
        : 'Your account is pending approval. Share your code with admin.',
      status: record.status,
      code: record.code,
    });
  }

  const user = { userId: record.id, phone: record.phone, role: record.role, name: record.name, apartment: record.apartment };
  return res.json({ token: createToken(user), user });
}
