import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get HaloPSA credentials from environment
    const clientId = Deno.env.get("HALOPSA_CLIENT_ID");
    const clientSecret = Deno.env.get("HALOPSA_CLIENT_SECRET");
    const tenant = Deno.env.get("HALOPSA_TENANT");

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'HaloPSA credentials not configured. Please set HALOPSA_CLIENT_ID and HALOPSA_CLIENT_SECRET in your environment variables.' }, { status: 400 });
    }

    // Get integration settings for the URL
    const settings = await base44.entities.IntegrationSettings.filter({ setting_key: 'main' });
    let haloUrl = settings[0]?.halopsa_url;

    if (!haloUrl) {
      return Response.json({ error: 'HaloPSA URL not configured in Adminland settings' }, { status: 400 });
    }

    // Clean up URL - remove trailing slash and any /api suffix
    haloUrl = haloUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');

    // HaloPSA OAuth token endpoint - per documentation it's /auth/token
    const tokenUrl = `${haloUrl}/auth/token`;
    
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'all'
    });

    // For hosted solutions, tenant is required
    if (tenant) {
      tokenBody.append('tenant', tenant);
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenBody
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return Response.json({ 
        error: `Failed to authenticate with HaloPSA. Status: ${tokenResponse.status}`,
        details: errorText,
        debug: { tokenUrl, hasTenant: !!tenant }
      }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return Response.json({ 
        error: 'No access token received from HaloPSA',
        tokenResponse: tokenData
      }, { status: 401 });
    }

    // Fetch clients from HaloPSA - endpoint is /api/Client
    const clientsUrl = `${haloUrl}/api/Client?count=500&includeactive=true`;
    const clientsResponse = await fetch(clientsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!clientsResponse.ok) {
      const errorText = await clientsResponse.text();
      return Response.json({ 
        error: `Failed to fetch clients from HaloPSA. Status: ${clientsResponse.status}`,
        details: errorText
      }, { status: 500 });
    }

    const clientsData = await clientsResponse.json();
    
    // HaloPSA returns { record_count: X, clients: [...] }
    const haloClients = clientsData.clients || [];

    if (haloClients.length === 0) {
      return Response.json({
        success: true,
        message: 'No clients found in HaloPSA',
        created: 0,
        updated: 0,
        total: 0
      });
    }

    // Get existing customers to check for duplicates
    const existingCustomers = await base44.entities.Customer.list();

    let created = 0;
    let updated = 0;

    for (const haloClient of haloClients) {
      const externalId = `halo_${haloClient.id}`;
      
      const customerData = {
        name: haloClient.name || haloClient.client_name || 'Unknown',
        email: haloClient.email || haloClient.main_email || '',
        phone: haloClient.phone_number || haloClient.main_phone || haloClient.phonenumber || '',
        address: haloClient.address || '',
        city: haloClient.city || '',
        state: haloClient.state || haloClient.county || '',
        zip: haloClient.postcode || '',
        external_id: externalId,
        is_company: true,
        source: 'halo_psa'
      };

      // Check if customer already exists
      const existingCustomer = existingCustomers.find(c => c.external_id === externalId);
      
      if (existingCustomer) {
        await base44.entities.Customer.update(existingCustomer.id, customerData);
        updated++;
      } else {
        await base44.entities.Customer.create(customerData);
        created++;
      }
    }

    // Update last sync time
    if (settings[0]?.id) {
      await base44.asServiceRole.entities.IntegrationSettings.update(settings[0].id, {
        halopsa_last_sync: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      message: `Synced ${created} new customers, updated ${updated} existing`,
      created,
      updated,
      total: haloClients.length
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});