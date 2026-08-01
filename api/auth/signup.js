import { neon } from '@neondatabase/serverless';
import { hashPin, generateCode } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, phone, apartment, pin, role } = req.body || {};

  if (!name?.trim() || !phone?.trim() || !apartment?.trim() || !pin?.trim())
    return res.status(400).json({ error: 'All fields are required' });
  if (!/^\d{6}$/.test(pin))
    return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
  if (!['customer', 'kitchen'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });

  if (process.env.ADMIN_PHONE && phone.trim() === process.env.ADMIN_PHONE)
    return res.status(409).json({ error: 'An account with this phone number already exists' });

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;

  const existing = await sql`SELECT id FROM users WHERE data->>'phone' = ${phone.trim()}`;
  if (existing.length > 0)
    return res.status(409).json({ error: 'An account with this phone number already exists' });

  const id = Date.now();
  const code = generateCode();
  const user = {
    id,
    name: name.trim(),
    phone: phone.trim(),
    apartment: apartment.trim(),
    pinHash: hashPin(phone.trim(), pin),
    role,
    status: 'pending',
    code,
    createdAt: new Date().toISOString(),
  };
  await sql`INSERT INTO users (id, data) VALUES (${id}, ${JSON.stringify(user)})`;
  return res.status(201).json({ code, userId: id });
}
