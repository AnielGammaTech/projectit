import entityService from '../../services/entityService.js';

export default async function handler(req, res) {
  try {
    const source = req.query?.source;

    // Require a source identifier to prevent anonymous spam
    if (!source) {
      return res.status(400).json({ error: 'Missing required query parameter: source' });
    }

    const body = req.body || {};

    // Truncate details to prevent oversized audit log entries
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
    return res.status(500).json({ error: error.message });
  }
}
