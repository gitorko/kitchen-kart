import { neon } from '@neondatabase/serverless';
import { hashPin, generateCode } from '../_auth.js';
import { withErrorHandling } from '../_util.js';
import { log } from '../_log.js';

// Forgot-PIN flow: the resident picks a new PIN and, like signup, gets a CODE
// to share with an admin/kitchen for approval. The old PIN keeps working until
// someone approves the request — this only stages the new one.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { apartment, newPin } = req.body || {};
  if (!apartment?.trim() || !newPin?.trim())
    return res.status(400).json({ error: 'Flat number and new PIN are required' });
  if (!/^\d{4}$/.test(newPin))
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
  const rows = await sql`SELECT data FROM users WHERE data->>'apartment' = ${apartment.trim()}`;
  const user = rows[0]?.data;
  if (!user || user.status !== 'approved')
    return res.status(404).json({ error: 'No approved account found for that flat number' });

  const code = generateCode();
  const updated = {
    ...user,
    pinResetRequest: {
      newPinHash: hashPin(apartment.trim(), newPin),
      code,
      requestedAt: new Date().toISOString(),
    },
  };
  await sql`UPDATE users SET data = ${JSON.stringify(updated)} WHERE id = ${user.id}`;
  log('pin_reset_requested', { apartment: user.apartment });
  return res.status(201).json({ code });
}

export default withErrorHandling('auth', handler);
