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

    // Field mapping with defaults
    const fieldMapping = config.hudu_field_mapping || {
      name: 'name',
      email: 'email',
      phone: 'phone_number',
      address: 'address_line_1',
      city: 'city',
      state: 'state',
      zip: 'zip'
    };

    // Fetch ALL companies from Hudu with pagination
    let allCompanies = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      const companiesResponse = await fetch(`${baseUrl}/api/v1/companies?page=${page}&per_page=${perPage}`, {
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

      if (companies.length > 0) {
        allCompanies = allCompanies.concat(companies);
        page++;
        // Safety limit to prevent infinite loops
        if (page > 50) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    const companies = allCompanies;

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
    const existingByName = {};
    existingCustomers.forEach(c => {
      if (c.external_id && c.source === 'hudu') {
        existingByExternalId[c.external_id] = c;
      }
      // Also index by name for matching existing customers without external_id
      if (c.name && !c.external_id) {
        existingByName[c.name.toLowerCase().trim()] = c;
      }
    });

    let created = 0;
    let updated = 0;
    let matched = 0;

    for (const company of companies) {
      const externalId = `hudu_${company.id}`;
      let existing = existingByExternalId[externalId];
      
      // Try to match by name if no external_id match
      const companyName = company[fieldMapping.name] || company.name || '';
      if (!existing && companyName) {
        const nameKey = companyName.toLowerCase().trim();
        if (existingByName[nameKey]) {
          existing = existingByName[nameKey];
          matched++;
        }
      }

      // Build customer data using field mapping
      const customerData = {
        name: company[fieldMapping.name] || company.name || 'Unknown Company',
        email: company[fieldMapping.email] || '',
        phone: company[fieldMapping.phone] || '',
        company: company[fieldMapping.name] || company.name || '',
        address: company[fieldMapping.address] || '',
        city: company[fieldMapping.city] || '',
        state: company[fieldMapping.state] || '',
        zip: company[fieldMapping.zip] || '',
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
      message: `Sync completed! Created: ${created}, Updated: ${updated}, Matched existing: ${matched}`,
      created,
      updated,
      matched,
      total: companies.length
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});