import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';

export default async function handler(req, res) {
  try {
    const QUOTEIT_API_KEY = process.env.QUOTEIT_API_KEY;
    const QUOTEIT_ENDPOINT = 'https://quoteit.gtools.io/api/functions/getActiveAcceptedQuotes';

    if (!QUOTEIT_API_KEY) {
      return res.status(500).json({ error: 'QuoteIT API Key not configured' });
    }

    // Fetch accepted quotes from QuoteIT
    const response = await fetch(QUOTEIT_ENDPOINT, {
      method: 'GET',
      headers: {
        'x-gammastack-key': QUOTEIT_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QuoteIT API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to fetch quotes from QuoteIT',
        details: errorText,
      });
    }

    const quotes = await response.json();
    console.log(`Fetched ${Array.isArray(quotes) ? quotes.length : 0} quotes from QuoteIT`);

    // Get existing incoming quotes to avoid duplicates
    const existingQuotes = await entityService.list('IncomingQuote');
    const existingQuoteIds = new Set(existingQuotes.map(q => q.quoteit_id));

    // Get existing projects to check if quote was already converted
    const existingProjects = await entityService.list('Project');
    const projectQuoteIds = new Set(existingProjects.filter(p => p.quoteit_quote_id).map(p => p.quoteit_quote_id));

    let created = 0;
    let skipped = 0;

    for (const quote of (Array.isArray(quotes) ? quotes : [])) {
      const quoteId = quote.id || quote.quote_id;

      if (existingQuoteIds.has(quoteId) || projectQuoteIds.has(quoteId)) {
        skipped++;
        continue;
      }

      await entityService.create('IncomingQuote', {
        quoteit_id: quoteId,
        title: quote.title || quote.name || `Quote ${quoteId}`,
        customer_name: quote.customer_name || quote.customer?.name || '',
        customer_email: quote.customer_email || quote.customer?.email || '',
        amount: quote.total || quote.amount || 0,
        received_date: new Date().toISOString(),
        status: 'pending',
        raw_data: quote,
      });
      created++;
    }

    return res.json({
      success: true,
      message: 'Synced quotes from QuoteIT',
      created,
      skipped,
      total_fetched: Array.isArray(quotes) ? quotes.length : 0,
    });
  } catch (error) {
    console.error('Error pulling QuoteIT quotes:', error);
    return res.status(500).json({ error: error.message });
  }
}
