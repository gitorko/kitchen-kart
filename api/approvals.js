import { neon } from '@neondatabase/serverless';
import { requireAuth } from './_auth.js';
import { withErrorHandling } from './_util.js';
import { log as logEvent } from './_log.js';

async function handler(req, res) {
  const requester = requireAuth(req, res, ['admin', 'kitchen']);
  if (!requester) return;

  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS approvals (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;

  if (req.method === 'GET') {
    const pendingRows = await sql`SELECT data FROM users WHERE data->>'status' = 'pending' ORDER BY data->>'createdAt' ASC`;
    const pinResetRows = await sql`SELECT data FROM users WHERE data->'pinResetRequest' IS NOT NULL ORDER BY data->'pinResetRequest'->>'requestedAt' ASC`;
    const historyRows = await sql`SELECT data FROM approvals ORDER BY data->>'createdAt' DESC`;
    const pending = pendingRows.map(r => {
      const { pinHash, ...rest } = r.data;
      return rest;
    });
    const pinResets = pinResetRows.map(r => ({
      id: r.data.id,
      name: r.data.name,
      phone: r.data.phone,
      apartment: r.data.apartment,
      role: r.data.role,
      code: r.data.pinResetRequest.code,
      requestedAt: r.data.pinResetRequest.requestedAt,
    }));
    return res.json({ pending, pinResets, history: historyRows.map(r => r.data) });
  }

  if (req.method === 'POST') {
    const { userId, action, reason, type } = req.body || {};
    if (!userId || !['approve', 'reject'].includes(action))
      return res.status(400).json({ error: 'Invalid request' });

    const rows = await sql`SELECT data FROM users WHERE id = ${userId}`;
    const user = rows[0]?.data;
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Forgot-PIN request: doesn't touch the account's approval status, just
    // applies (or discards) the staged new PIN.
    if (type === 'pin_reset') {
      if (!user.pinResetRequest) return res.status(404).json({ error: 'No pending PIN reset for this user' });
      const updated = { ...user };
      if (action === 'approve') updated.pinHash = user.pinResetRequest.newPinHash;
      delete updated.pinResetRequest;
      await sql`UPDATE users SET data = ${JSON.stringify(updated)} WHERE id = ${userId}`;

      const logId = Date.now();
      const log = {
        id: logId, userId, userName: user.name, userPhone: user.phone,
        approvedByUserId: requester.userId, approvedByName: requester.name,
        action, type: 'pin_reset', reason: action === 'reject' ? (reason || '') : undefined,
        createdAt: new Date().toISOString(),
      };
      await sql`INSERT INTO approvals (id, data) VALUES (${logId}, ${JSON.stringify(log)})`;
      logEvent('pin_reset_decided', { userId, action, by: requester.phone });
      return res.status(201).json(log);
    }

    // Approving a signup that's replacing whoever currently holds the flat
    // (a new owner/tenant moved in) — remove the old resident's account and,
    // if they ran a kitchen, that kitchen and its dishes too. Order history
    // is left alone.
    if (action === 'approve' && user.replacesUserId) {
      await sql`DELETE FROM users WHERE id = ${user.replacesUserId}`;

      await sql`CREATE TABLE IF NOT EXISTS kitchens (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
      const oldKitchenRows = await sql`SELECT data FROM kitchens WHERE data->>'ownerUserId' = ${String(user.replacesUserId)}`;
      const oldKitchen = oldKitchenRows[0]?.data;
      if (oldKitchen) {
        await sql`CREATE TABLE IF NOT EXISTS dishes (id BIGINT PRIMARY KEY, data JSONB NOT NULL)`;
        await sql`DELETE FROM dishes WHERE data->>'kitchenId' = ${String(oldKitchen.id)}`;
        await sql`DELETE FROM kitchens WHERE id = ${oldKitchen.id}`;
      }
      logEvent('tenant_replaced', { apartment: user.apartment, oldUserId: user.replacesUserId, newUserId: userId, by: requester.phone });
    }

    const updated = { ...user, status: action === 'approve' ? 'approved' : 'rejected' };
    if (action === 'reject' && reason) updated.rejectionReason = reason;
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
      reason: action === 'reject' ? (reason || '') : undefined,
      code: user.code,
      createdAt: new Date().toISOString(),
    };
    await sql`INSERT INTO approvals (id, data) VALUES (${logId}, ${JSON.stringify(log)})`;
    logEvent('approval_decided', { userId, action, by: requester.phone });
    return res.status(201).json(log);
  }

  res.status(405).end();
}

export default withErrorHandling('approvals', handler);
