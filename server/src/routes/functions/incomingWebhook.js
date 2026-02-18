import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';

export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const source = req.query?.source || 'unknown';

    await entityService.create('AuditLog', {
      action: 'incoming_webhook',
      actor_name: source,
      actor_email: 'system',
      details: JSON.stringify(body),
      ip_address: req.headers['x-forwarded-for'] || 'unknown',
    });

    return res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
