import entityService from '../../services/entityService.js';

/**
 * POST /api/functions/receiveProposal
 * Public endpoint — alternative to proposalWebhook for direct quote submission.
 * Validates via x-projectit-api-key or x-gammastack-key header.
 */
export default async function handler(req, res) {
  try {
    const apiKey = req.headers['x-projectit-api-key'] || req.headers['x-gammastack-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key header' });
    }

    // Validate key
    const envKey = process.env.QUOTEIT_API_KEY;
    let isValid = false;

    if (envKey && apiKey === envKey) {
      isValid = true;
    }

    if (!isValid) {
      const settings = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
      const config = settings[0];
      if (config?.quoteit_api_key && apiKey === config.quoteit_api_key) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const {
      quote_id, title, customer_name, customer_email,
      customer_id, amount, items, accepted_at
    } = req.body;

    if (!quote_id || !title) {
      return res.status(400).json({
        error: 'Missing required fields: quote_id, title',
      });
    }

    // Check for duplicate
    const existing = await entityService.filter('IncomingQuote', { quoteit_id: String(quote_id) });
    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Quote already exists',
        incoming_quote_id: existing[0].id,
        status: existing[0].status,
      });
    }

    const incomingQuote = await entityService.create('IncomingQuote', {
      quoteit_id: String(quote_id),
      title,
      customer_name: customer_name || '',
      customer_email: customer_email || '',
      customer_id: customer_id || '',
      amount: amount || 0,
      items: items || [],
      received_date: new Date().toISOString(),
      accepted_at: accepted_at || new Date().toISOString(),
      status: 'pending',
      raw_data: req.body,
    });

    await entityService.create('AuditLog', {
      action: 'proposal_received',
      entity_type: 'IncomingQuote',
      entity_id: incomingQuote.id,
      details: `Proposal "${title}" received for ${customer_name || 'unknown customer'}`,
      user_email: 'api@quoteit',
      user_name: 'QuoteIT',
    });

    return res.status(201).json({
      success: true,
      incoming_quote_id: incomingQuote.id,
      status: 'pending',
    });
  } catch (error) {
    console.error('Receive proposal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
