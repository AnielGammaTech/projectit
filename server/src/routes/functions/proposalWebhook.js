import entityService from '../../services/entityService.js';

/**
 * POST /api/functions/proposalWebhook
 * Public webhook endpoint for QuoteIT to push accepted proposals.
 * Validates via x-projectit-api-key or x-gammastack-key header.
 */
export default async function handler(req, res) {
  try {
    // Validate API key from headers
    const apiKey = req.headers['x-projectit-api-key'] || req.headers['x-gammastack-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key header' });
    }

    // Check against stored integration settings or QUOTEIT_API_KEY env
    const envKey = process.env.QUOTEIT_API_KEY;
    let isValid = false;

    if (envKey && apiKey === envKey) {
      isValid = true;
    }

    if (!isValid) {
      // Check IntegrationSettings
      const settings = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
      const config = settings[0];
      if (config?.quoteit_api_key && apiKey === config.quoteit_api_key) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({ error: 'Missing event or data in request body' });
    }

    // Handle different event types
    if (event === 'quote.accepted' || event === 'proposal.accepted') {
      const quoteId = data.quote_id || data.id;
      if (!quoteId) {
        return res.status(400).json({ error: 'Missing quote_id in data' });
      }

      // Check for duplicate
      const existing = await entityService.filter('IncomingQuote', { quoteit_id: String(quoteId) });
      if (existing.length > 0) {
        return res.json({
          success: true,
          message: 'Quote already received',
          incoming_quote_id: existing[0].id,
        });
      }

      // Create incoming quote
      const incomingQuote = await entityService.create('IncomingQuote', {
        quoteit_id: String(quoteId),
        title: data.title || data.name || `Quote ${quoteId}`,
        customer_name: data.customer_name || data.customer?.name || '',
        customer_email: data.customer_email || data.customer?.email || '',
        customer_id: data.customer_id || '',
        amount: data.total || data.amount || 0,
        items: data.items || data.line_items || [],
        received_date: new Date().toISOString(),
        accepted_at: data.accepted_at || new Date().toISOString(),
        status: 'pending',
        raw_data: data,
      });

      // Log the event
      await entityService.create('AuditLog', {
        action: 'webhook_quote_received',
        entity_type: 'IncomingQuote',
        entity_id: incomingQuote.id,
        details: `Accepted quote "${data.title || quoteId}" received via webhook`,
        user_email: 'webhook@quoteit',
        user_name: 'QuoteIT Webhook',
      });

      return res.json({
        success: true,
        message: 'Quote received',
        incoming_quote_id: incomingQuote.id,
      });
    }

    if (event === 'quote.status_changed' || event === 'proposal.status_changed') {
      const quoteId = data.quote_id || data.id;
      const quotes = await entityService.filter('IncomingQuote', { quoteit_id: String(quoteId) });
      if (quotes.length > 0) {
        await entityService.update('IncomingQuote', quotes[0].id, {
          status: data.new_status || data.status || quotes[0].status,
        });
      }
      return res.json({ success: true, message: 'Status updated' });
    }

    // Unknown event — accept but log
    await entityService.create('AuditLog', {
      action: 'webhook_unknown_event',
      entity_type: 'Webhook',
      entity_id: 'quoteit',
      details: `Unknown webhook event: ${event}`,
      user_email: 'webhook@quoteit',
      user_name: 'QuoteIT Webhook',
    });

    return res.json({ success: true, message: `Event "${event}" acknowledged` });
  } catch (error) {
    console.error('Proposal webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
