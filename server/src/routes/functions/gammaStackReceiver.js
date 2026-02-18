import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';

export default async function handler(req, res) {
  try {
    // Check API Key
    const apiKey = req.headers['x-gammastack-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API Key' });
    }

    const settings = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
    const config = settings[0];

    if (!config || config.gammastack_api_key !== apiKey) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    const body = req.body;
    const { type, data } = body;

    // Handle different types of incoming data
    if (type === 'accepted_quote') {
      const existing = await entityService.filter('IncomingQuote', { quoteit_id: data.id || data.quote_id });

      if (existing.length === 0) {
        await entityService.create('IncomingQuote', {
          quoteit_id: data.id || data.quote_id,
          title: data.title,
          customer_name: data.customer_name || data.client_name,
          amount: data.total_amount || data.total || 0,
          received_date: new Date().toISOString(),
          status: 'pending',
          raw_data: data,
        });
      }
      return res.json({ success: true, message: 'Quote received and staged' });
    }

    if (type === 'create_ticket') {
      await entityService.create('Task', {
        title: data.subject,
        description: data.description,
        status: 'todo',
        priority: 'medium',
        project_id: data.project_id || 'unassigned',
      });
      return res.json({ success: true, message: 'Ticket created as Task' });
    }

    if (type === 'sync_customer') {
      return res.json({ success: true, message: 'Customer synced' });
    }

    // Log the event if no specific handler
    await entityService.create('AuditLog', {
      action: 'api_received',
      entity_type: 'api',
      entity_id: 'gammastack',
      details: `Received ${type} event from GammaStack API`,
      user_email: 'system@gammastack',
      user_name: 'GammaStack API',
    });

    return res.json({ success: true, message: 'Event received' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
