import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../_auth.js';
import { withErrorHandling } from '../_util.js';
import { log } from '../_log.js';

async function handler(req, res) {
  const requester = requireAuth(req, res);
  if (!requester) return;

  const sql = neon(process.env.DATABASE_URL);
  const { id } = req.query;

  if (req.method === 'PUT') {
    const rows = await sql`SELECT data FROM kitchens WHERE id = ${id}`;
    const existing = rows[0]?.data;
    if (!existing) return res.status(404).json({ error: 'Kitchen not found' });

    // Favoriting is open to any signed-in user — the toggle only ever adds/removes
    // the requester's own id, computed server-side so no one can touch anyone else's.
    if (req.body && typeof req.body.favorite === 'boolean' && Object.keys(req.body).length === 1) {
      const favoritedBy = new Set(existing.favoritedBy || []);
      if (req.body.favorite) favoritedBy.add(requester.userId);
      else favoritedBy.delete(requester.userId);
      const item = { ...existing, favoritedBy: [...favoritedBy] };
      await sql`UPDATE kitchens SET data = ${JSON.stringify(item)} WHERE id = ${id}`;
      return res.json(item);
    }

    if (existing.ownerUserId !== requester.userId && requester.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const item = { ...existing, ...req.body, id, ownerUserId: existing.ownerUserId };
    await sql`UPDATE kitchens SET data = ${JSON.stringify(item)} WHERE id = ${id}`;
    log('kitchen_updated', { kitchenId: id, by: requester.phone });
    return res.json(item);
  }

  if (req.method === 'DELETE') {
    if (requester.role !== 'admin') return res.status(403).json({ error: 'Only admin can delete a kitchen' });
    const rows = await sql`SELECT data FROM kitchens WHERE id = ${id}`;
    const existing = rows[0]?.data;
    if (!existing) return res.status(404).json({ error: 'Kitchen not found' });

    await sql`CREATE TABLE IF NOT EXISTS dishes (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
    await sql`DELETE FROM dishes WHERE data->>'kitchenId' = ${id}`;
    await sql`DELETE FROM kitchens WHERE id = ${id}`;
    log('kitchen_deleted', { kitchenId: id, name: existing.name, by: requester.phone });
    return res.status(204).end();
  }

  res.status(405).end();
}

export default withErrorHandling('kitchens', handler);
