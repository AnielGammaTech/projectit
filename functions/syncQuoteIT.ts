import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get settings
    const settings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const config = settings[0];

    if (!config?.quoteit_enabled || !config?.quoteit_api_url || !config?.quoteit_api_key) {
      return Response.json({ success: false, error: 'QuoteIT integration not configured' });
    }

    // Clean URL and construct endpoint
    const baseUrl = config.quoteit_api_url.replace(/\/$/, '');
    const url = `${baseUrl}/api/functions/getAcceptedQuotes`;

    console.log(`Fetching quotes from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-gammastack-key': config.quoteit_api_key,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return Response.json({ 
        success: false, 
        error: `Failed to fetch from QuoteIT (${response.status}): ${text}` 
      });
    }

    const data = await response.json();
    console.log('QuoteIT Response:', JSON.stringify(data, null, 2));
    const quotes = data.quotes || data.accepted_quotes || data.data || [];
    let createdCount = 0;
    const errors = [];

    // Get the next project number start
    const projects = await base44.asServiceRole.entities.Project.list('-project_number', 1);
    let nextNumber = (projects[0]?.project_number || 1000) + 1;

    for (const quote of quotes) {
      try {
        // Check if IncomingQuote already exists
        const existing = await base44.asServiceRole.entities.IncomingQuote.filter({ quoteit_id: quote.id });
        const existingProject = await base44.asServiceRole.entities.Project.filter({ quoteit_quote_id: quote.id });
        
        if (existing.length === 0 && existingProject.length === 0) {
          // Create new IncomingQuote instead of Project directly
          await base44.asServiceRole.entities.IncomingQuote.create({
            quoteit_id: quote.id,
            title: quote.title || `Quote #${quote.number || 'Unknown'}`,
            customer_name: quote.customer_name || 'Unknown Client',
            amount: quote.total_amount || 0,
            received_date: new Date().toISOString(),
            status: 'pending',
            raw_data: quote
          });
          createdCount++;
        }
      } catch (e) {
        console.error(`Error processing quote ${quote.id}:`, e);
        errors.push(`Error with quote ${quote.id}: ${e.message}`);
      }
    }

    return Response.json({ 
      success: true, 
      message: `Sync complete. Created ${createdCount} new projects.`,
      details: {
        fetched: quotes.length,
        created: createdCount,
        errors: errors.length > 0 ? errors : null
      }
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});