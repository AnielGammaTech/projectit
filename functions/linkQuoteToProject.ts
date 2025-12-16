import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quote_id, project_id, project_number } = await req.json();

    if (!quote_id || !project_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get settings
    const settings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const config = settings[0];

    if (!config?.quoteit_enabled || !config?.quoteit_api_url || !config?.quoteit_api_key) {
      return Response.json({ success: false, error: 'QuoteIT integration not configured' });
    }

    // Clean URL and construct endpoint
    const baseUrl = config.quoteit_api_url.replace(/\/$/, '');
    // Use generic updateQuote function to add the tag
    const url = `${baseUrl}/api/functions/updateQuote`;

    console.log(`Linking project to quote at: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-gammastack-key': config.quoteit_api_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        quote_id, 
        tags: [`Project #${project_number}`],
        project_id
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return Response.json({ 
        success: false, 
        error: `Failed to link project on QuoteIT (${response.status}): ${text}` 
      });
    }

    const data = await response.json();
    return Response.json(data);

  } catch (error) {
    console.error('Link project error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});