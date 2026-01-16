import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // 1. Setup Base44 client
    const base44 = createClientFromRequest(req);

    // 2. Validate Method
    if (req.method !== 'GET' && req.method !== 'POST') { // Allow POST just in case, but usually GET for fetching
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    // 3. Get API Key from headers
    const apiKey = req.headers.get('x-projectit-api-key') || req.headers.get('x-api-key');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Verify API Key against IntegrationSettings
    // Use service role to read settings securely
    const settings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const config = settings[0];

    if (!config || !config.projectit_api_key || config.projectit_api_key !== apiKey) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Fetch Data (Customers, Inventory, and Projects)
    // We use service role to ensure we get all data regardless of the invoking user context (which is anonymous here anyway)
    const [customers, inventory, projectsRaw] = await Promise.all([
      base44.asServiceRole.entities.Customer.list(),
      base44.asServiceRole.entities.InventoryItem.list(),
      base44.asServiceRole.entities.Project.list()
    ]);

    // Map projects to the expected format
    const projects = projectsRaw.map(p => {
      const customer = customers.find(c => c.id === p.customer_id);
      return {
        id: p.id,
        project_number: p.project_number,
        customer_id: p.customer_id || null,
        customer_name: customer?.name || p.client || null,
        name: p.name,
        description: p.description || '',
        status: p.status || 'planning',
        start_date: p.start_date || null,
        due_date: p.due_date || null,
        quoteit_quote_id: p.quoteit_quote_id || null
      };
    });

    // 6. Return Data
    return new Response(JSON.stringify({
      success: true,
      data: {
        customers,
        inventory,
        projects
      },
      meta: {
        customer_count: customers.length,
        inventory_count: inventory.length,
        project_count: projects.length,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in getProjectITData:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});