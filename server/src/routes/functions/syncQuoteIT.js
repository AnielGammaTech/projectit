import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';

export default async function handler(req, res) {
  try {
    const payload = req.body || {};
    const testOnly = payload.testOnly === true;

    // Get settings
    const settings = await entityService.filter('IntegrationSettings', { setting_key: 'main' });
    const config = settings[0];

    if (!config?.quoteit_enabled || !config?.quoteit_api_url || !config?.quoteit_api_key) {
      return res.json({ success: false, error: 'QuoteIT integration not configured' });
    }

    // Clean URL and construct endpoint
    const baseUrl = config.quoteit_api_url.replace(/\/$/, '');
    const url = `${baseUrl}/api/functions/getAcceptedQuotes`;

    console.log(`Fetching quotes from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-gammastack-key': config.quoteit_api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.json({
        success: false,
        error: `Failed to fetch from QuoteIT (${response.status}): ${text}`,
      });
    }

    // If test only, just verify we got a valid response
    if (testOnly) {
      const data = await response.json();
      const quotes = data.quotes || data.accepted_quotes || data.data || [];
      return res.json({
        success: true,
        message: `Connection successful! Found ${quotes.length} accepted quote(s) in QuoteIT.`,
      });
    }

    const data = await response.json();
    console.log('QuoteIT Response:', JSON.stringify(data, null, 2));

    let rawQuotes = data.quotes || data.accepted_quotes || data.data || [];

    // Normalize quotes array (handle wrapper objects)
    const quotes = rawQuotes.map(q => {
      if (q.data && (q.type === 'accepted_quote' || !q.id)) {
        return q.data;
      }
      return q;
    });

    let createdCount = 0;
    const errors = [];

    // Get the next project number start
    const projects = await entityService.list('Project', '-project_number', 1);
    let nextNumber = (projects[0]?.project_number || 1000) + 1;

    // Fetch all customers for matching
    const allCustomers = await entityService.list('Customer');
    const customerMap = new Map();
    for (const c of allCustomers) {
      if (c.email) customerMap.set(c.email.toLowerCase(), c.id);
      if (c.name) customerMap.set(c.name.toLowerCase(), c.id);
      if (c.company) customerMap.set(c.company.toLowerCase(), c.id);
    }

    for (const quote of quotes) {
      const quoteId = quote.id || quote.quote_id;
      if (!quoteId) {
        console.warn('Skipping quote with no ID:', quote);
        continue;
      }

      try {
        // Check if IncomingQuote already exists
        const existing = await entityService.filter('IncomingQuote', { quoteit_id: quoteId });
        const existingProject = await entityService.filter('Project', { quoteit_quote_id: quoteId });

        if (existing.length === 0 && existingProject.length === 0) {
          // Try to match customer
          const customerName = quote.customer_name || 'Unknown Client';
          const customerEmail = quote.customer_email || quote.email || quote.raw_data?.customer_email || '';

          let matchedCustomerId = null;
          if (customerEmail && customerMap.has(customerEmail.toLowerCase())) {
            matchedCustomerId = customerMap.get(customerEmail.toLowerCase());
          } else if (customerName && customerMap.has(customerName.toLowerCase())) {
            matchedCustomerId = customerMap.get(customerName.toLowerCase());
          }

          // Create new IncomingQuote
          await entityService.create('IncomingQuote', {
            quoteit_id: quoteId,
            title: quote.title || `Quote #${quote.quote_number || quote.number || 'Unknown'}`,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_id: matchedCustomerId,
            amount: quote.total_amount || 0,
            received_date: quote.date_accepted || new Date().toISOString(),
            status: 'pending',
            raw_data: quote,
          });
          createdCount++;
        }
      } catch (e) {
        console.error(`Error processing quote ${quoteId}:`, e);
        errors.push(`Error with quote ${quoteId}: ${e.message}`);
      }
    }

    return res.json({
      success: true,
      message: `Sync complete. Created ${createdCount} new projects.`,
      details: {
        fetched: quotes.length,
        created: createdCount,
        errors: errors.length > 0 ? errors : null,
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}
