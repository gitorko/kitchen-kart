import { neon } from '@neondatabase/serverless';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  const requester = requireAuth(req, res, ['admin', 'kitchen']);
  if (!requester) return;

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS approvals (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;

  if (req.method === 'GET') {
    const pendingRows = await sql`SELECT data FROM users WHERE data->>'status' = 'pending' ORDER BY data->>'createdAt' ASC`;
    const historyRows = await sql`SELECT data FROM approvals ORDER BY data->>'createdAt' DESC`;
    const pending = pendingRows.map(r => {
      const { pinHash, ...rest } = r.data;
      return rest;
    });
    return res.json({ pending, history: historyRows.map(r => r.data) });
  }

  if (req.method === 'POST') {
    const { userId, action } = req.body || {};
    if (!userId || !['approve', 'reject'].includes(action))
      return res.status(400).json({ error: 'Invalid request' });

    const rows = await sql`SELECT data FROM users WHERE id = ${userId}`;
    const user = rows[0]?.data;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = { ...user, status: action === 'approve' ? 'approved' : 'rejected' };
    await sql`UPDATE users SET data = ${JSON.stringify(updated)} WHERE id = ${userId}`;

    const logId = Date.now();
    const log = {
      id: logId,
      userId,
      userName: user.name,
      userPhone: user.phone,
      approvedByUserId: requester.userId,
      approvedByName: requester.name,
      action,
      code: user.code,
      createdAt: new Date().toISOString(),
    };
    await sql`INSERT INTO approvals (id, data) VALUES (${logId}, ${JSON.stringify(log)})`;
    return res.status(201).json(log);
  }

  res.status(405).end();
}
