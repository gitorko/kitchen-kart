import { neon } from '@neondatabase/serverless';
import { requireAuth } from './_auth.js';
import { withErrorHandling } from './_util.js';
import { log } from './_log.js';

async function handler(req, res) {
  const requester = requireAuth(req, res);
  if (!requester) return;

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS orders (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;

  if (req.method === 'GET') {
    let rows;
    if (requester.role === 'admin') {
      rows = await sql`SELECT data FROM orders ORDER BY data->>'createdAt' DESC`;
    } else if (requester.role === 'kitchen') {
      await sql`CREATE TABLE IF NOT EXISTS kitchens (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
      const kRows = await sql`SELECT data FROM kitchens WHERE data->>'ownerUserId' = ${requester.userId}`;
      const kitchen = kRows[0]?.data;
      rows = kitchen
        ? await sql`SELECT data FROM orders WHERE data->>'kitchenId' = ${kitchen.id} ORDER BY data->>'createdAt' DESC`
        : [];
    } else {
      rows = await sql`SELECT data FROM orders WHERE data->>'userId' = ${requester.userId} ORDER BY data->>'createdAt' DESC`;
    }
    return res.json(rows.map(r => r.data));
  }

  if (req.method === 'POST') {
    await sql`CREATE TABLE IF NOT EXISTS kitchens (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
    const kRows = await sql`SELECT data FROM kitchens WHERE id = ${req.body?.kitchenId}`;
    const kitchen = kRows[0]?.data;
    if (!kitchen) return res.status(404).json({ error: 'Kitchen not found' });
    if (kitchen.onVacation) return res.status(400).json({ error: `${kitchen.name} is on vacation and not taking orders right now.` });

    const item = { ...req.body, userId: requester.userId, userName: requester.name };
    await sql`INSERT INTO orders (id, data) VALUES (${item.id}, ${JSON.stringify(item)})`;
    log('order_placed', { orderId: item.id, kitchenId: item.kitchenId, userId: requester.userId, totalAmount: item.totalAmount });
    return res.status(201).json(item);
  }

  res.status(405).end();
}

export default withErrorHandling('orders', handler);
