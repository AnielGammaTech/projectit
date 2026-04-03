import entityService from '../../services/entityService.js';
import crypto from 'crypto';

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  try {
    const configuredSecret = process.env.INCOMING_WEBHOOK_SECRET;

    if (!configuredSecret) {
      console.error('[Webhook] INCOMING_WEBHOOK_SECRET not configured — rejecting request');
      return res.status(503).json({ error: 'Webhook endpoint not configured' });
    }

    // Verify HMAC signature
    const signature = req.headers['x-projectit-signature'];
    const timestamp = req.headers['x-projectit-timestamp'];

    if (!signature || !timestamp) {
      // Fall back to simple secret comparison for backwards compatibility
      const providedSecret = req.headers['x-projectit-webhook-secret'];
      if (!providedSecret) {
        return res.status(401).json({ error: 'Missing authentication headers' });
      }

      const expected = Buffer.from(configuredSecret);
      const received = Buffer.from(String(providedSecret));
      if (expected.length !== received.length || !crypto.timingSafeEqual(received, expected)) {
        return res.status(401).json({ error: 'Invalid webhook secret' });
      }
    } else {
      // HMAC signature verification with replay protection
      const tsNum = parseInt(timestamp, 10);
      if (isNaN(tsNum) || Math.abs(Date.now() - tsNum) > REPLAY_WINDOW_MS) {
        return res.status(401).json({ error: 'Request timestamp expired or invalid' });
      }

      const body = JSON.stringify(req.body || {});
      const expectedSig = crypto
        .createHmac('sha256', configuredSecret)
        .update(`${timestamp}.${body}`)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSig);
      const receivedBuf = Buffer.from(String(signature));
      if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const source = req.query?.source;
    if (!source) {
      return res.status(400).json({ error: 'Missing required query parameter: source' });
    }

    const body = req.body || {};
    const details = JSON.stringify(body);
    const truncated = details.length > 10000 ? details.slice(0, 10000) + '...[truncated]' : details;

    await entityService.create('AuditLog', {
      action: 'incoming_webhook',
      actor_name: source,
      actor_email: 'system',
      details: truncated,
      ip_address: req.headers['x-forwarded-for'] || 'unknown',
    });

    return res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
