import { neon } from '@neondatabase/serverless';
import { requireAuth } from './_auth.js';
import { withErrorHandling } from './_util.js';
import { log } from './_log.js';

async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS kitchens (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;

  // Browsing kitchens is public — no account needed. Only creating one requires login.
  if (req.method === 'GET') {
    const rows = await sql`SELECT data FROM kitchens ORDER BY data->>'createdAt' DESC`;
    return res.json(rows.map(r => r.data));
  }

  const requester = requireAuth(req, res);
  if (!requester) return;

  if (req.method === 'POST') {
    if (requester.role !== 'kitchen')
      return res.status(403).json({ error: 'Only kitchen accounts can create a kitchen' });
    const existing = await sql`SELECT id FROM kitchens WHERE data->>'ownerUserId' = ${requester.userId}`;
    if (existing.length > 0) return res.status(409).json({ error: 'You already have a kitchen' });

    const item = { ...req.body, ownerUserId: requester.userId, phone: requester.phone };
    await sql`INSERT INTO kitchens (id, data) VALUES (${item.id}, ${JSON.stringify(item)})`;
    log('kitchen_created', { kitchenId: item.id, name: item.name, by: requester.phone });
    return res.status(201).json(item);
  }

  res.status(405).end();
}

export default withErrorHandling('kitchens', handler);
