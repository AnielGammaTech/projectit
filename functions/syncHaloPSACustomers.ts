import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body for options
    let options = {};
    try {
      options = await req.json();
    } catch {
      // No body or invalid JSON, use defaults
    }
    
    const testOnly = options.testOnly || false;
    const fieldMapping = options.fieldMapping || {
      name: 'name',
      email: 'email',
      phone: 'main_phone',
      address: 'address',
      city: 'city',
      state: 'county',
      zip: 'postcode'
    };

    // Get HaloPSA credentials from environment
    const clientId = Deno.env.get("HALOPSA_CLIENT_ID");
    const clientSecret = Deno.env.get("HALOPSA_CLIENT_SECRET");
    const tenant = Deno.env.get("HALOPSA_TENANT");

    if (!clientId || !clientSecret) {
      return Response.json({ 
        error: 'HaloPSA credentials not configured.',
        details: 'Please set HALOPSA_CLIENT_ID and HALOPSA_CLIENT_SECRET in your app environment variables (Dashboard > Settings > Environment Variables)'
      }, { status: 400 });
    }

    // Get integration settings for the URLs
    const settings = await base44.entities.IntegrationSettings.filter({ setting_key: 'main' });
    let haloUrl = settings[0]?.halopsa_url;
    let authUrl = settings[0]?.halopsa_auth_url;
    let apiUrl = settings[0]?.halopsa_api_url;

    // If separate auth/api URLs are provided, use them. Otherwise fall back to base URL
    if (!authUrl && !apiUrl && !haloUrl) {
      return Response.json({ error: 'HaloPSA URLs not configured in Adminland settings' }, { status: 400 });
    }

    // Clean up URLs
    if (haloUrl) haloUrl = haloUrl.replace(/\/+$/, '');
    if (authUrl) authUrl = authUrl.replace(/\/+$/, '');
    if (apiUrl) apiUrl = apiUrl.replace(/\/+$/, '');

    // Determine the token URL - prefer explicit auth URL
    let tokenUrl;
    if (authUrl) {
      // If auth URL ends with /auth, add /token, otherwise add /auth/token
      tokenUrl = authUrl.endsWith('/auth') ? `${authUrl}/token` : `${authUrl}/auth/token`;
      // But if it already looks like a full token endpoint, use as-is
      if (authUrl.includes('/token')) {
        tokenUrl = authUrl;
      } else if (!authUrl.includes('/auth')) {
        tokenUrl = `${authUrl}/token`;
      }
    } else {
      tokenUrl = `${haloUrl}/auth/token`;
    }

    // Determine the API base URL
    let apiBaseUrl;
    if (apiUrl) {
      // If API URL ends with /api, use as-is, otherwise append /api
      apiBaseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
      // But if it already contains /api/, use as-is
      if (apiUrl.includes('/api')) {
        apiBaseUrl = apiUrl.replace(/\/api.*$/, '/api');
      }
    } else {
      apiBaseUrl = `${haloUrl}/api`;
    }
    
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

    let tokenResponse;
    try {
      tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenBody
      });
    } catch (fetchError) {
      return Response.json({ 
        error: `Cannot reach HaloPSA server: ${fetchError.message}`,
        details: `URL attempted: ${tokenUrl}`
      }, { status: 500 });
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return Response.json({ 
        error: `HaloPSA authentication failed (${tokenResponse.status})`,
        details: errorText || 'Check your Client ID, Client Secret, and Tenant settings',
        debug: { tokenUrl, authUrl, apiUrl, haloUrl }
      }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return Response.json({ 
        error: 'No access token received from HaloPSA',
        details: JSON.stringify(tokenData)
      }, { status: 401 });
    }

    // Fetch clients from HaloPSA
    const clientsUrl = `${apiBaseUrl}/Client?count=500&includeactive=true`;
    
    let clientsResponse;
    try {
      clientsResponse = await fetch(clientsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (fetchError) {
      return Response.json({ 
        error: `Cannot fetch clients: ${fetchError.message}`,
        details: `URL attempted: ${clientsUrl}`
      }, { status: 500 });
    }

    if (!clientsResponse.ok) {
      const errorText = await clientsResponse.text();
      return Response.json({ 
        error: `Failed to fetch clients (${clientsResponse.status})`,
        details: errorText
      }, { status: 500 });
    }

    const clientsData = await clientsResponse.json();
    
    // HaloPSA returns { record_count: X, clients: [...] }
    const haloClients = clientsData.clients || [];

    // If test mode, just return success with count
    if (testOnly) {
      // Return sample of first client's fields for mapping help
      const sampleFields = haloClients[0] ? Object.keys(haloClients[0]).slice(0, 20) : [];
      return Response.json({
        success: true,
        message: `Connection successful! Found ${haloClients.length} clients.`,
        total: haloClients.length,
        sampleFields: sampleFields,
        sampleClient: haloClients[0] ? {
          id: haloClients[0].id,
          name: haloClients[0].name,
          client_name: haloClients[0].client_name,
          email: haloClients[0].email,
          main_email: haloClients[0].main_email
        } : null
      });
    }

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

    // Helper to get nested field value
    const getField = (obj, fieldPath) => {
      if (!fieldPath) return '';
      const parts = fieldPath.split('.');
      let value = obj;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) return '';
      }
      return value || '';
    };

    for (const haloClient of haloClients) {
      const externalId = `halo_${haloClient.id}`;
      
      const customerData = {
        name: getField(haloClient, fieldMapping.name) || haloClient.name || haloClient.client_name || 'Unknown',
        email: getField(haloClient, fieldMapping.email) || haloClient.email || haloClient.main_email || '',
        phone: getField(haloClient, fieldMapping.phone) || haloClient.main_phone || haloClient.phone_number || '',
        address: getField(haloClient, fieldMapping.address) || haloClient.address || '',
        city: getField(haloClient, fieldMapping.city) || haloClient.city || '',
        state: getField(haloClient, fieldMapping.state) || haloClient.county || haloClient.state || '',
        zip: getField(haloClient, fieldMapping.zip) || haloClient.postcode || '',
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