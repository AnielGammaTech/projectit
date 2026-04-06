import { Router } from 'express';
import crypto from 'crypto';
import pool from '../config/database.js';

const router = Router();

// Rate limit for signing endpoint
const signAttempts = new Map();
const SIGN_RATE_LIMIT = 10; // max attempts per token per hour
const SIGN_RATE_WINDOW = 60 * 60 * 1000;

function checkSignRateLimit(token) {
  const now = Date.now();
  const key = token.slice(0, 16); // use prefix as key
  const entry = signAttempts.get(key);
  if (!entry || now - entry.start > SIGN_RATE_WINDOW) {
    signAttempts.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= SIGN_RATE_LIMIT;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// GET /api/accept/:token — fetch acceptance details (public, no auth)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 32) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const tokenHash = hashToken(token);

    const { rows } = await pool.query(
      `SELECT * FROM "AssetAcceptance" WHERE data->>'token_hash' = $1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Acceptance link not found or has expired' });
    }

    const acceptance = rows[0];
    const data = acceptance.data;

    // Check if already signed
    if (data.status === 'signed') {
      return res.status(410).json({ error: 'This acceptance has already been signed' });
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      // Mark as expired
      await pool.query(
        `UPDATE "AssetAcceptance" SET data = data || '{"status":"expired"}'::jsonb, updated_date = NOW() WHERE id = $1`,
        [acceptance.id]
      );
      return res.status(410).json({ error: 'This acceptance link has expired' });
    }

    // Fetch asset details
    const { rows: assetRows } = await pool.query(
      `SELECT * FROM "Asset" WHERE id = $1::uuid`,
      [data.asset_id]
    );

    // Fetch employee details
    const { rows: employeeRows } = await pool.query(
      `SELECT * FROM "Employee" WHERE id = $1::uuid`,
      [data.employee_id]
    );

    // Only expose fields needed for the acceptance page — no internal IDs, network info, or costs
    const assetRaw = assetRows[0]?.data || {};
    const asset = assetRows[0] ? {
      name: assetRaw.name,
      type: assetRaw.type,
      serial_number: assetRaw.serial_number,
      model: assetRaw.model,
      manufacturer: assetRaw.manufacturer,
      condition: assetRaw.condition,
      accessories: assetRaw.accessories,
    } : null;

    const empRaw = employeeRows[0]?.data || {};
    const employee = employeeRows[0] ? {
      first_name: empRaw.first_name,
      last_name: empRaw.last_name,
    } : null;

    res.json({
      id: acceptance.id,
      asset,
      employee,
      terms_text: data.terms_text,
      assigned_date: data.assigned_date,
      condition_at_checkout: data.condition_at_checkout,
      expires_at: data.expires_at,
    });
  } catch (err) {
    console.error('[Acceptance GET] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/accept/:token/sign — sign the acceptance (public, no auth)
router.post('/:token/sign', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 32) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    if (!checkSignRateLimit(token)) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }

    const { signer_name, signature_data } = req.body;
    if (!signer_name || !signature_data) {
      return res.status(400).json({ error: 'Name and signature are required' });
    }

    if (signer_name.length > 200) {
      return res.status(400).json({ error: 'Name is too long' });
    }

    // Validate signature_data is a reasonable base64 PNG (max ~500KB)
    if (signature_data.length > 700000) {
      return res.status(400).json({ error: 'Signature data is too large' });
    }

    const tokenHash = hashToken(token);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `SELECT * FROM "AssetAcceptance" WHERE data->>'token_hash' = $1 FOR UPDATE`,
        [tokenHash]
      );

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Acceptance link not found' });
      }

      const acceptance = rows[0];
      const data = acceptance.data;

      if (data.status === 'signed') {
        await client.query('ROLLBACK');
        return res.status(410).json({ error: 'Already signed' });
      }

      if (new Date(data.expires_at) < new Date()) {
        await client.query('ROLLBACK');
        return res.status(410).json({ error: 'This link has expired' });
      }

      // Capture asset snapshot at signing time
      const { rows: assetRows } = await client.query(
        `SELECT * FROM "Asset" WHERE id = $1::uuid`,
        [data.asset_id]
      );
      const assetSnapshot = assetRows[0] ? { id: assetRows[0].id, ...assetRows[0].data } : null;

      const signerIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
      const signerUa = req.headers['user-agent'] || '';

      const updateData = {
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_data,
        signer_name,
        signer_ip: signerIp,
        signer_ua: signerUa,
        asset_snapshot: assetSnapshot,
      };

      await client.query(
        `UPDATE "AssetAcceptance" SET data = data || $1::jsonb, updated_date = NOW() WHERE id = $2`,
        [JSON.stringify(updateData), acceptance.id]
      );

      // Also update the AssetAssignment to mark as acknowledged
      if (data.assignment_id) {
        await client.query(
          `UPDATE "AssetAssignment" SET data = data || '{"acknowledged":true}'::jsonb, updated_date = NOW() WHERE id = $1::uuid`,
          [data.assignment_id]
        );
      }

      await client.query('COMMIT');

      res.json({ success: true, message: 'Acknowledgment signed successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Acceptance SIGN] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
