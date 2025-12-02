import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const testOnly = body.testOnly || false;

    // Get integration settings
    const settings = await base44.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const config = settings[0];

    if (!config?.hudu_enabled) {
      return Response.json({ error: 'Hudu integration is not enabled' }, { status: 400 });
    }

    const huduBaseUrl = config.hudu_base_url;
    const huduApiKey = config.hudu_api_key;

    if (!huduBaseUrl || !huduApiKey) {
      return Response.json({ 
        error: 'Missing Hudu configuration', 
        details: 'Please configure Hudu Base URL and API Key in Adminland > Integrations' 
      }, { status: 400 });
    }

    // Clean up the base URL
    const baseUrl = huduBaseUrl.replace(/\/$/, '');

    // Fetch companies from Hudu
    const companiesResponse = await fetch(`${baseUrl}/api/v1/companies`, {
      headers: {
        'x-api-key': huduApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!companiesResponse.ok) {
      const errorText = await companiesResponse.text();
      return Response.json({ 
        success: false, 
        error: 'Failed to connect to Hudu API',
        details: `Status: ${companiesResponse.status} - ${errorText}`
      }, { status: 400 });
    }

    const companiesData = await companiesResponse.json();
    const companies = companiesData.companies || [];

    if (testOnly) {
      return Response.json({ 
        success: true, 
        message: `Connection successful! Found ${companies.length} companies in Hudu.`,
        total: companies.length
      });
    }

    // Get existing customers
    const existingCustomers = await base44.entities.Customer.list();
    const existingByExternalId = {};
    existingCustomers.forEach(c => {
      if (c.external_id && c.source === 'hudu') {
        existingByExternalId[c.external_id] = c;
      }
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const company of companies) {
      const externalId = `hudu_${company.id}`;
      const existing = existingByExternalId[externalId];

      const customerData = {
        name: company.name || 'Unknown Company',
        email: company.email || '',
        phone: company.phone_number || '',
        company: company.name || '',
        address: company.address_line_1 || '',
        city: company.city || '',
        state: company.state || '',
        zip: company.zip || '',
        is_company: true,
        source: 'hudu',
        external_id: externalId,
        notes: company.notes || ''
      };

      if (existing) {
        await base44.entities.Customer.update(existing.id, customerData);
        updated++;
      } else {
        await base44.entities.Customer.create(customerData);
        created++;
      }
    }

    // Update last sync time
    await base44.entities.IntegrationSettings.update(config.id, {
      hudu_last_sync: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: `Sync completed! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`,
      created,
      updated,
      skipped,
      total: companies.length
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});