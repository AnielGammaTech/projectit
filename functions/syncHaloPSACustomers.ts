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

    // Clean up URL - remove trailing slash
    haloUrl = haloUrl.replace(/\/$/, '');

    // HaloPSA auth endpoint - try different common paths
    let accessToken = null;
    let authError = null;

    // Try the standard HaloPSA auth endpoint
    const authEndpoints = [
      `${haloUrl}/auth/token`,
      `${haloUrl}/api/authtoken`
    ];

    for (const tokenUrl of authEndpoints) {
      try {
        const tokenBody = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'all'
        });

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

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;
          break;
        } else {
          authError = await tokenResponse.text();
        }
      } catch (e) {
        authError = e.message;
      }
    }

    if (!accessToken) {
      return Response.json({ 
        error: `Failed to authenticate with HaloPSA. Check your credentials and URL. Details: ${authError}`,
        debug: { haloUrl, clientIdLength: clientId?.length, hasTenant: !!tenant }
      }, { status: 401 });
    }

    // Fetch clients from HaloPSA
    const clientsUrl = `${haloUrl}/api/Client?count=500`;
    const clientsResponse = await fetch(clientsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!clientsResponse.ok) {
      const errorText = await clientsResponse.text();
      return Response.json({ error: `Failed to fetch clients from HaloPSA: ${errorText}` }, { status: 500 });
    }

    const clientsData = await clientsResponse.json();
    // HaloPSA returns clients in different formats depending on version
    const haloClients = clientsData.clients || clientsData.records || clientsData || [];

    // Get existing customers to check for duplicates
    const existingCustomers = await base44.entities.Customer.list();
    const existingExternalIds = new Set(existingCustomers.map(c => c.external_id).filter(Boolean));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const haloClient of haloClients) {
      const externalId = `halo_${haloClient.id}`;
      
      const customerData = {
        name: haloClient.name || 'Unknown',
        email: haloClient.email || '',
        phone: haloClient.phone_number || haloClient.main_phonenumber || '',
        address: [haloClient.address_line1, haloClient.address_line2].filter(Boolean).join(', '),
        city: haloClient.city || '',
        state: haloClient.state || '',
        zip: haloClient.postcode || '',
        external_id: externalId,
        is_company: true,
        source: 'halo_psa'
      };

      // Check if customer already exists
      const existingCustomer = existingCustomers.find(c => c.external_id === externalId);
      
      if (existingCustomer) {
        // Update existing customer
        await base44.entities.Customer.update(existingCustomer.id, customerData);
        updated++;
      } else {
        // Create new customer
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});