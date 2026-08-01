import { neon } from '@neondatabase/serverless';
import { requireAuth, createToken } from './_auth.js';
import { log } from './_log.js';
import { withErrorHandling } from './_util.js';

const IMPERSONATION_TTL_MS = 60 * 60 * 1000; // 1 hour

async function handler(req, res) {
  const admin = requireAuth(req, res, ['admin']);
  if (!admin) return;

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;

  if (req.method === 'GET') {
    const rows = await sql`SELECT data FROM users ORDER BY data->>'createdAt' DESC`;
    return res.json(rows.map(r => {
      const { pinHash, ...rest } = r.data;
      return rest;
    }));
  }

  // Impersonate: mint a short-lived token for another approved user so the
  // admin can see the app exactly as that person (browse, order, etc).
  if (req.method === 'POST') {
    const { userId } = req.body || {};
    const rows = await sql`SELECT data FROM users WHERE id = ${userId}`;
    const target = rows[0]?.data;
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.status !== 'approved') return res.status(400).json({ error: 'Can only impersonate an approved user' });

    const user = { userId: target.id, phone: target.phone, role: target.role, name: target.name, apartment: target.apartment };
    log('admin_impersonation', { target: target.phone, by: admin.phone });
    return res.json({ token: createToken(user, IMPERSONATION_TTL_MS), user });
  }

  // Delete a user outright — if they ran a kitchen, that kitchen and its
  // dishes go too. Order history is left alone.
  if (req.method === 'DELETE') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const rows = await sql`SELECT data FROM users WHERE id = ${userId}`;
    const target = rows[0]?.data;
    if (!target) return res.status(404).json({ error: 'User not found' });

    await sql`CREATE TABLE IF NOT EXISTS kitchens (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
    const kRows = await sql`SELECT data FROM kitchens WHERE data->>'ownerUserId' = ${userId}`;
    const kitchen = kRows[0]?.data;
    if (kitchen) {
      await sql`CREATE TABLE IF NOT EXISTS dishes (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
      await sql`DELETE FROM dishes WHERE data->>'kitchenId' = ${String(kitchen.id)}`;
      await sql`DELETE FROM kitchens WHERE id = ${kitchen.id}`;
    }
    await sql`DELETE FROM users WHERE id = ${userId}`;
    log('user_deleted', { userId, apartment: target.apartment, by: admin.phone });
    return res.status(204).end();
  }

  res.status(405).end();
}

export default withErrorHandling('users', handler);
