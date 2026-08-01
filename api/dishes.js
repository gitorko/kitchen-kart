import { neon } from '@neondatabase/serverless';
import { requireAuth } from './_auth.js';
import { withErrorHandling } from './_util.js';
import { log } from './_log.js';

async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS dishes (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;

  // Browsing dishes is public — no account needed. Only creating one requires login.
  if (req.method === 'GET') {
    const rows = await sql`SELECT data FROM dishes ORDER BY data->>'createdAt' DESC`;
    return res.json(rows.map(r => r.data));
  }

  const requester = requireAuth(req, res);
  if (!requester) return;

  if (req.method === 'POST') {
    if (requester.role !== 'kitchen')
      return res.status(403).json({ error: 'Only kitchen accounts can add dishes' });

    await sql`CREATE TABLE IF NOT EXISTS kitchens (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
    const kRows = await sql`SELECT data FROM kitchens WHERE data->>'ownerUserId' = ${requester.userId}`;
    const kitchen = kRows[0]?.data;
    if (!kitchen) return res.status(400).json({ error: 'Set up your kitchen first' });

    const item = { ...req.body, kitchenId: kitchen.id };
    await sql`INSERT INTO dishes (id, data) VALUES (${item.id}, ${JSON.stringify(item)})`;
    log('dish_created', { dishId: item.id, kitchenId: kitchen.id, name: item.name, by: requester.phone });
    return res.status(201).json(item);
  }

  res.status(405).end();
}

export default withErrorHandling('dishes', handler);
