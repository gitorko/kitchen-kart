import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../_auth.js';

async function ownsDish(sql, requester, dish) {
  if (requester.role === 'admin') return true;
  if (requester.role !== 'kitchen') return false;
  await sql`CREATE TABLE IF NOT EXISTS kitchens (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
  const kRows = await sql`SELECT data FROM kitchens WHERE data->>'ownerUserId' = ${requester.userId}`;
  return kRows[0]?.data?.id === dish.kitchenId;
}

export default async function handler(req, res) {
  const requester = requireAuth(req, res);
  if (!requester) return;

  const sql = neon(process.env.DATABASE_URL);
  const { id } = req.query;

  const rows = await sql`SELECT data FROM dishes WHERE id = ${id}`;
  const existing = rows[0]?.data;
  if (!existing) return res.status(404).json({ error: 'Dish not found' });

  if (req.method === 'PUT') {
    // Hearting is open to any signed-in user — the toggle only ever adds/removes
    // the requester's own id, computed server-side so no one can touch anyone else's heart.
    if (req.body && typeof req.body.heart === 'boolean' && Object.keys(req.body).length === 1) {
      const heartedBy = new Set(existing.heartedBy || []);
      if (req.body.heart) heartedBy.add(requester.userId);
      else heartedBy.delete(requester.userId);
      const item = { ...existing, heartedBy: [...heartedBy] };
      await sql`UPDATE dishes SET data = ${JSON.stringify(item)} WHERE id = ${id}`;
      return res.json(item);
    }

    if (!(await ownsDish(sql, requester, existing))) return res.status(403).json({ error: 'Forbidden' });
    const item = { ...existing, ...req.body, id, kitchenId: existing.kitchenId };
    await sql`UPDATE dishes SET data = ${JSON.stringify(item)} WHERE id = ${id}`;
    return res.json(item);
  }

  if (req.method === 'DELETE') {
    if (!(await ownsDish(sql, requester, existing))) return res.status(403).json({ error: 'Forbidden' });
    await sql`DELETE FROM dishes WHERE id = ${id}`;
    return res.status(204).end();
  }

  res.status(405).end();
}
