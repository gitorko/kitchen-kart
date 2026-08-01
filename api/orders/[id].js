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
    const rows = await sql`SELECT data FROM orders WHERE id = ${id}`;
    const existing = rows[0]?.data;
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const isOwner = existing.userId === requester.userId;
    let isKitchenOwner = false;
    if (requester.role === 'kitchen') {
      await sql`CREATE TABLE IF NOT EXISTS kitchens (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
      const kRows = await sql`SELECT data FROM kitchens WHERE data->>'ownerUserId' = ${requester.userId}`;
      isKitchenOwner = kRows[0]?.data?.id === existing.kitchenId;
    }
    if (!isOwner && !isKitchenOwner && requester.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const item = { ...existing, ...req.body, id, userId: existing.userId, kitchenId: existing.kitchenId };
    await sql`UPDATE orders SET data = ${JSON.stringify(item)} WHERE id = ${id}`;
    if (req.body?.status) log('order_status_changed', { orderId: id, status: req.body.status, by: requester.phone });
    if (req.body?.paymentStatus) log('order_payment_marked', { orderId: id, paymentStatus: req.body.paymentStatus, by: requester.phone });
    return res.json(item);
  }

  res.status(405).end();
}

export default withErrorHandling('orders', handler);
