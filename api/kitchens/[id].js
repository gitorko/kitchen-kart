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
    if (existing.ownerUserId !== requester.userId && requester.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const item = { ...existing, ...req.body, id, ownerUserId: existing.ownerUserId };
    await sql`UPDATE kitchens SET data = ${JSON.stringify(item)} WHERE id = ${id}`;
    log('kitchen_updated', { kitchenId: id, by: requester.phone });
    return res.json(item);
  }

  res.status(405).end();
}

export default withErrorHandling('kitchens', handler);
