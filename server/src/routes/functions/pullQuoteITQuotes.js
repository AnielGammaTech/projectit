import entityService from '../../services/entityService.js';

/**
 * Pulls accepted quotes from QuoteIT and creates IncomingQuote records.
 * Matches customers by name/email and products by name for easy project creation.
 */
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

    // Load existing data for dedup and matching
    const [existingQuotes, existingProjects, customers, products] = await Promise.all([
      entityService.list('IncomingQuote'),
      entityService.list('Project'),
      entityService.list('Customer'),
      entityService.list('Product'),
    ]);

    // Track all known quote IDs: existing (pending/accepted), dismissed, and already-projectified
    const existingQuoteIds = new Set(existingQuotes.map(q => q.quoteit_id));
    const dismissedQuoteIds = new Set(
      existingQuotes.filter(q => q.status === 'dismissed').map(q => q.quoteit_id)
    );
    const projectQuoteIds = new Set(
      existingProjects.filter(p => p.quoteit_quote_id).map(p => p.quoteit_quote_id)
    );

    let created = 0;
    let skipped = 0;

    for (const quote of (Array.isArray(quotes) ? quotes : [])) {
      const quoteId = String(quote.id || quote.quote_id);

      if (existingQuoteIds.has(quoteId) || projectQuoteIds.has(quoteId) || dismissedQuoteIds.has(quoteId)) {
        skipped++;
        continue;
      }

      const customerName = quote.customer_name || quote.customer?.name || '';
      const customerEmail = quote.customer_email || quote.customer?.email || '';

      // Match customer by email first, then by name (case-insensitive)
      const matchedCustomer = findCustomerMatch(customers, customerName, customerEmail);

      // Match quote items to existing products
      const items = quote.items || [];
      const matchedItems = items.map(item => ({
        ...item,
        matched_product_id: findProductMatch(products, item.name)?.id || null,
        matched_product_name: findProductMatch(products, item.name)?.name || null,
      }));

      await entityService.create('IncomingQuote', {
        quoteit_id: quoteId,
        title: quote.title || quote.name || `Quote ${quoteId}`,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_id: matchedCustomer?.id || '',
        amount: quote.total || quote.amount || 0,
        received_date: new Date().toISOString(),
        status: 'pending',
        matched_items: matchedItems,
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

/**
 * Find a matching customer by email (exact) or name (fuzzy).
 */
function findCustomerMatch(customers, name, email) {
  if (!name && !email) return null;

  // Exact email match first
  if (email) {
    const emailMatch = customers.find(
      c => c.email?.toLowerCase() === email.toLowerCase()
    );
    if (emailMatch) return emailMatch;
  }

  // Exact name match
  if (name) {
    const nameLower = name.toLowerCase().trim();
    const exactMatch = customers.find(
      c => c.name?.toLowerCase().trim() === nameLower ||
           c.company?.toLowerCase().trim() === nameLower
    );
    if (exactMatch) return exactMatch;

    // Fuzzy: one contains the other
    const fuzzyMatch = customers.find(c => {
      const cName = (c.name || '').toLowerCase().trim();
      const cCompany = (c.company || '').toLowerCase().trim();
      return cName.includes(nameLower) || nameLower.includes(cName) ||
             cCompany.includes(nameLower) || nameLower.includes(cCompany);
    });
    if (fuzzyMatch) return fuzzyMatch;
  }

  return null;
}

/**
 * Find a matching product by name (fuzzy).
 */
function findProductMatch(products, itemName) {
  if (!itemName || !products.length) return null;
  const nameLower = itemName.toLowerCase().trim();

  // Exact match
  const exact = products.find(p => p.name?.toLowerCase().trim() === nameLower);
  if (exact) return exact;

  // Contains match
  const contains = products.find(p => {
    const pName = (p.name || '').toLowerCase().trim();
    return pName.includes(nameLower) || nameLower.includes(pName);
  });
  return contains || null;
}
