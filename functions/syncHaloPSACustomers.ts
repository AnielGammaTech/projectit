import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Allow both authenticated users and scheduled tasks (service role)
    const user = await base44.auth.me().catch(() => null);

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
    const settings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
    let authUrl = settings[0]?.halopsa_auth_url;
    let apiUrl = settings[0]?.halopsa_api_url;

    // Both URLs are required
    if (!authUrl || !apiUrl) {
      return Response.json({ 
        error: 'HaloPSA URLs not configured', 
        details: 'Please enter both the Authorisation Server URL and Resource Server URL in Adminland → Integrations' 
      }, { status: 400 });
    }

    // Clean up URLs - remove trailing slashes and /api suffix if present
    authUrl = authUrl.replace(/\/+$/, '').replace(/\/auth\/?$/, '').replace(/\/api\/?$/, '');
    apiUrl = apiUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');

    // Build token URL: Auth URL + /auth/token
    let tokenUrl = `${authUrl}/auth/token`;

    // Build API base URL
    let apiBaseUrl = `${apiUrl}/api`;
    
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
        details: errorText || 'Check your Client ID, Client Secret, and Tenant in environment variables',
        debug: { tokenUrl, authUrl, apiUrl }
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
    const clientsUrl = `${apiBaseUrl}/Client?count=500`;
    
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
        details: errorText,
        debug: {
          clientsUrl,
          apiBaseUrl,
          apiUrl,
          authUrl,
          hint: 'Make sure Resource Server URL is correct. For hosted HaloPSA, both Auth and Resource URLs are usually the same (e.g., https://yourcompany.halopsa.com)'
        }
      }, { status: 500 });
    }

    const clientsData = await clientsResponse.json();
    let haloClients = clientsData.clients || [];

    // Filter out excluded IDs
    const excludedIdsStr = settings[0]?.halopsa_excluded_ids || '';
    if (excludedIdsStr) {
      const excludedIds = excludedIdsStr.split(',').map(id => id.trim()).filter(Boolean);
      if (excludedIds.length > 0) {
        // HaloPSA IDs are numbers usually, but let's handle them as strings to be safe
        haloClients = haloClients.filter(client => !excludedIds.includes(String(client.id)));
      }
    }

    // If test mode, just return success with count
    if (testOnly) {
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
    const existingCustomers = await base44.asServiceRole.entities.Customer.list();

    // Build lookup maps for efficient matching
    const existingByExternalId = {};
    const existingByEmail = {};
    const existingByName = {};
    
    existingCustomers.forEach(c => {
      if (c.external_id) {
        existingByExternalId[c.external_id] = c;
      }
      if (c.email) {
        existingByEmail[c.email.toLowerCase().trim()] = c;
      }
      if (c.name) {
        existingByName[c.name.toLowerCase().trim()] = c;
      }
    });

    let created = 0;
    let updated = 0;
    let matched = 0;
    const haloIdToBase44Id = {}; // Map Halo Client ID -> Base44 Customer ID {id, name}

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

    // Batch processing arrays
    const customersToCreate = [];
    const customersToUpdate = [];
    const haloClientMap = {}; // external_id -> halo_id

    for (const haloClient of haloClients) {
      const externalId = `halo_${haloClient.id}`;
      haloClientMap[externalId] = haloClient.id;
      
      const customerName = getField(haloClient, fieldMapping.name) || haloClient.name || haloClient.client_name || 'Unknown';
      const customerEmail = getField(haloClient, fieldMapping.email) || haloClient.email || haloClient.main_email || '';
      
      // Enhanced field mapping fallbacks
      const phone = getField(haloClient, fieldMapping.phone) || haloClient.main_phone || haloClient.phone_number || haloClient.phonenumber || '';
      const address = getField(haloClient, fieldMapping.address) || haloClient.address || haloClient.address_line_1 || haloClient.billing_address_line_1 || '';
      
      const customerData = {
        name: customerName,
        email: customerEmail,
        phone: phone,
        address: address,
        city: getField(haloClient, fieldMapping.city) || haloClient.city || '',
        state: getField(haloClient, fieldMapping.state) || haloClient.county || haloClient.state || '',
        zip: getField(haloClient, fieldMapping.zip) || haloClient.postcode || '',
        external_id: externalId,
        is_company: true,
        source: 'halo_psa'
      };

      // Check if customer already exists by external_id first
      let existingCustomer = existingByExternalId[externalId];
      
      // If not found by external_id, try matching by email
      if (!existingCustomer && customerEmail) {
        existingCustomer = existingByEmail[customerEmail.toLowerCase().trim()];
        if (existingCustomer) matched++;
      }
      
      // If still not found, try matching by name (exact match)
      if (!existingCustomer && customerName) {
        existingCustomer = existingByName[customerName.toLowerCase().trim()];
        if (existingCustomer) matched++;
      }
      
      if (existingCustomer) {
        customersToUpdate.push({ id: existingCustomer.id, data: customerData, haloId: haloClient.id });
      } else {
        customersToCreate.push({ data: customerData, haloId: haloClient.id });
      }
    }

    // Process Updates in batches
    if (customersToUpdate.length > 0) {
        const chunkSize = 10;
        for (let i = 0; i < customersToUpdate.length; i += chunkSize) {
            const batch = customersToUpdate.slice(i, i + chunkSize);
            await Promise.all(batch.map(async (item) => {
                try {
                    await base44.asServiceRole.entities.Customer.update(item.id, item.data);
                    haloIdToBase44Id[item.haloId] = { id: item.id, name: item.data.name };
                    updated++;
                } catch (e) {
                    console.error(`Failed to update customer ${item.id}`, e);
                }
            }));
        }
    }

    // Process Creates in batches
    if (customersToCreate.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < customersToCreate.length; i += chunkSize) {
            const batchData = customersToCreate.slice(i, i + chunkSize).map(c => c.data);
            try {
                const createdEntities = await base44.asServiceRole.entities.Customer.bulkCreate(batchData);
                created += createdEntities.length;
                
                // Map back IDs for haloIdToBase44Id
                for (const c of createdEntities) {
                    const haloId = haloClientMap[c.external_id];
                    if (haloId) {
                        haloIdToBase44Id[haloId] = { id: c.id, name: c.name };
                    }
                }
            } catch (e) {
                console.error("Bulk create failed", e);
            }
        }
    }

    // --- SYNC USERS (Contacts) ---
    let usersCreated = 0;
    let usersUpdated = 0;
    
    try {
        const usersUrl = `${apiBaseUrl}/Users?count=1000`; // Adjust count as needed
        const usersResponse = await fetch(usersUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const haloUsers = usersData.users || [];
            
            const existingContacts = await base44.asServiceRole.entities.Customer.filter({ is_company: false, source: 'halo_psa' });
            const existingContactMap = {}; 
            existingContacts.forEach(c => {
                if (c.external_id) existingContactMap[c.external_id] = c;
            });

            const usersToCreate = [];
            const usersToUpdate = [];

            for (const user of haloUsers) {
                if (!user.client_id || !haloIdToBase44Id[user.client_id]) continue;
                
                const parentInfo = haloIdToBase44Id[user.client_id];
                const userExternalId = `halo_user_${user.id}`;
                const userName = user.name || user.username || 'Unknown User';
                
                const contactData = {
                    name: userName,
                    email: user.emailaddress || user.email || '',
                    phone: user.phonenumber || user.phone || user.mobile_number || '',
                    company_id: parentInfo.id,
                    company: parentInfo.name,
                    is_company: false,
                    source: 'halo_psa',
                    external_id: userExternalId,
                    notes: user.notes || ''
                };

                if (existingContactMap[userExternalId]) {
                    usersToUpdate.push({ id: existingContactMap[userExternalId].id, data: contactData });
                } else {
                    usersToCreate.push(contactData);
                }
            }

            // Batch update users
            if (usersToUpdate.length > 0) {
                const chunkSize = 10;
                for (let i = 0; i < usersToUpdate.length; i += chunkSize) {
                    const batch = usersToUpdate.slice(i, i + chunkSize);
                    await Promise.all(batch.map(async (item) => {
                        try {
                            await base44.asServiceRole.entities.Customer.update(item.id, item.data);
                            usersUpdated++;
                        } catch (e) {
                            console.error(`Failed to update user ${item.id}`, e);
                        }
                    }));
                }
            }

            // Bulk create users
            if (usersToCreate.length > 0) {
                const chunkSize = 50;
                for (let i = 0; i < usersToCreate.length; i += chunkSize) {
                    const batch = usersToCreate.slice(i, i + chunkSize);
                    try {
                        const createdUsers = await base44.asServiceRole.entities.Customer.bulkCreate(batch);
                        usersCreated += createdUsers.length;
                    } catch (e) {
                        console.error("Bulk create users failed", e);
                    }
                }
            }
    } catch (err) {
        console.error("Error syncing users:", err);
    }

    // --- SYNC SITES ---
    let sitesCreated = 0;
    let sitesUpdated = 0;

    try {
        const sitesUrl = `${apiBaseUrl}/Site?count=1000`; // Adjust count as needed
        const sitesResponse = await fetch(sitesUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (sitesResponse.ok) {
            const sitesData = await sitesResponse.json();
            const haloSites = sitesData.sites || [];

            // Get existing sites
            const existingSites = await base44.entities.Site.list();
            const existingSiteMap = {}; // external_id -> Site
            existingSites.forEach(s => {
                if (s.external_id) existingSiteMap[s.external_id] = s;
            });

            const sitesToCreate = [];
            const sitesToUpdate = [];

            for (const site of haloSites) {
                if (!site.client_id || !haloIdToBase44Id[site.client_id]) continue;

                const parentInfo = haloIdToBase44Id[site.client_id];
                const siteExternalId = `halo_site_${site.id}`;
                const siteName = site.name || 'Main Site';

                const siteData = {
                    name: siteName,
                    address: site.address_line_1 || site.address || '',
                    city: site.city || '',
                    state: site.state || site.county || '',
                    zip: site.postcode || site.zip || '',
                    customer_id: parentInfo.id,
                    external_id: siteExternalId,
                    notes: site.notes || '',
                    is_default: site.is_default === true
                };

                if (existingSiteMap[siteExternalId]) {
                    sitesToUpdate.push({ id: existingSiteMap[siteExternalId].id, data: siteData });
                } else {
                    sitesToCreate.push(siteData);
                }
            }

            // Batch update sites
            if (sitesToUpdate.length > 0) {
                const chunkSize = 10;
                for (let i = 0; i < sitesToUpdate.length; i += chunkSize) {
                    const batch = sitesToUpdate.slice(i, i + chunkSize);
                    await Promise.all(batch.map(async (item) => {
                        try {
                            await base44.entities.Site.update(item.id, item.data);
                            sitesUpdated++;
                        } catch (e) {
                            console.error(`Failed to update site ${item.id}`, e);
                        }
                    }));
                }
            }

            // Bulk create sites
            if (sitesToCreate.length > 0) {
                const chunkSize = 50;
                for (let i = 0; i < sitesToCreate.length; i += chunkSize) {
                    const batch = sitesToCreate.slice(i, i + chunkSize);
                    try {
                        const createdSites = await base44.entities.Site.bulkCreate(batch);
                        sitesCreated += createdSites.length;
                    } catch (e) {
                        console.error("Bulk create sites failed", e);
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error syncing sites:", err);
    }

    // Update last sync time
    if (settings[0]?.id) {
      await base44.asServiceRole.entities.IntegrationSettings.update(settings[0].id, {
        halopsa_last_sync: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      message: `Synced ${created} new customers, updated ${updated} existing. Synced ${usersCreated} new users, updated ${usersUpdated} existing. Synced ${sitesCreated} new sites, updated ${sitesUpdated} existing.`,
      created,
      updated,
      usersCreated,
      usersUpdated,
      sitesCreated,
      sitesUpdated,
      matched,
      total: haloClients.length
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});