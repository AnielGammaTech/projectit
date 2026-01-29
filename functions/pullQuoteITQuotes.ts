import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const QUOTEIT_API_KEY = Deno.env.get("QUOTEIT_API_KEY");
        // Only fetch active/accepted quotes that haven't been archived or deleted
        const QUOTEIT_ENDPOINT = "https://quoteit.gtools.io/api/functions/getActiveAcceptedQuotes";

        if (!QUOTEIT_API_KEY) {
            return Response.json({ error: 'QuoteIT API Key not configured' }, { status: 500 });
        }

        // Fetch accepted quotes from QuoteIT
        const response = await fetch(QUOTEIT_ENDPOINT, {
            method: 'GET',
            headers: {
                'x-gammastack-key': QUOTEIT_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('QuoteIT API error:', response.status, errorText);
            return Response.json({ 
                error: 'Failed to fetch quotes from QuoteIT', 
                details: errorText 
            }, { status: response.status });
        }

        const quotes = await response.json();
        console.log(`Fetched ${Array.isArray(quotes) ? quotes.length : 0} quotes from QuoteIT`);

        // Get existing incoming quotes to avoid duplicates
        const existingQuotes = await base44.asServiceRole.entities.IncomingQuote.list();
        const existingQuoteIds = new Set(existingQuotes.map(q => q.quoteit_id));

        // Get existing projects to check if quote was already converted
        const existingProjects = await base44.asServiceRole.entities.Project.list();
        const projectQuoteIds = new Set(existingProjects.filter(p => p.quoteit_quote_id).map(p => p.quoteit_quote_id));

        let created = 0;
        let skipped = 0;

        // Process each quote
        for (const quote of (Array.isArray(quotes) ? quotes : [])) {
            const quoteId = quote.id || quote.quote_id;
            
            // Skip if already exists as IncomingQuote OR if a project was already created from it
            if (existingQuoteIds.has(quoteId) || projectQuoteIds.has(quoteId)) {
                skipped++;
                continue;
            }

            // Create IncomingQuote record
            await base44.asServiceRole.entities.IncomingQuote.create({
                quoteit_id: quoteId,
                title: quote.title || quote.name || `Quote ${quoteId}`,
                customer_name: quote.customer_name || quote.customer?.name || '',
                customer_email: quote.customer_email || quote.customer?.email || '',
                amount: quote.total || quote.amount || 0,
                received_date: new Date().toISOString(),
                status: 'pending',
                raw_data: quote
            });
            created++;
        }

        return Response.json({ 
            success: true, 
            message: `Synced quotes from QuoteIT`,
            created,
            skipped,
            total_fetched: Array.isArray(quotes) ? quotes.length : 0
        });

    } catch (error) {
        console.error('Error pulling QuoteIT quotes:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});