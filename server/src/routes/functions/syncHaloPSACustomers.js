import entityService from '../../services/entityService.js';
import { getHaloPSAConfig, getHaloPSAToken } from '../../services/halopsaService.js';

export default async function handler(req, res) {
  try {
    // Parse request body for options
    const options = req.body || {};

    const testOnly = options.testOnly || false;
    const fieldMapping = options.fieldMapping || {
      name: 'name',
      email: 'email',
      phone: 'main_phone',
      address: 'address',
      city: 'city',
      state: 'county',
      zip: 'postcode',
    };

    // Get HaloPSA config from DB (falls back to env vars)
    const config = await getHaloPSAConfig();
    const { apiBaseUrl } = config;
    const accessToken = await getHaloPSAToken(config);

    // Fetch clients from HaloPSA
    const clientsUrl = `${apiBaseUrl}/Client?count=500`;

    let clientsResponse;
    try {
      clientsResponse = await fetch(clientsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (fetchError) {
      return res.status(500).json({
        error: `Cannot fetch clients: ${fetchError.message}`,
        details: `URL attempted: ${clientsUrl}`,
      });
    }

    if (!clientsResponse.ok) {
      const errorText = await clientsResponse.text();
      return res.status(500).json({
        error: `Failed to fetch clients (${clientsResponse.status})`,
        details: errorText,
        debug: {
          clientsUrl,
          apiBaseUrl: config.apiBaseUrl,
          apiUrl: config.apiUrl,
          authUrl: config.authUrl,
          hint: 'Make sure Resource Server URL is correct. For hosted HaloPSA, both Auth and Resource URLs are usually the same (e.g., https://yourcompany.halopsa.com)',
        },
      });
    }

    const clientsData = await clientsResponse.json();
    let haloClients = clientsData.clients || [];

    // Filter out excluded IDs
    const excludedIdsStr = config.settings?.halopsa_excluded_ids || '';
    if (excludedIdsStr) {
      const excludedIds = excludedIdsStr.split(',').map(id => id.trim()).filter(Boolean);
      if (excludedIds.length > 0) {
        haloClients = haloClients.filter(client => !excludedIds.includes(String(client.id)));
      }
    }

    // If test mode, fetch a sample site to show structure
    if (testOnly) {
      const sampleFields = haloClients[0] ? Object.keys(haloClients[0]).slice(0, 20) : [];

      let sampleSite = null;
      let sampleSiteDetail = null;
      let sampleClientDetail = null;
      try {
        const sitesUrl = `${apiBaseUrl}/Site?count=5`;
        const sitesResp = await fetch(sitesUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        if (sitesResp.ok) {
          const sitesData = await sitesResp.json();
          const sites = sitesData.sites || sitesData.Sites || (Array.isArray(sitesData) ? sitesData : []);
          if (sites.length > 0) {
            sampleSite = sites[0];
            const detailResp = await fetch(`${apiBaseUrl}/Site/${sites[0].id}`, {
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            });
            if (detailResp.ok) {
              sampleSiteDetail = await detailResp.json();
            }

            if (sites[0].client_id) {
              const clientDetailResp = await fetch(`${apiBaseUrl}/Client/${sites[0].client_id}`, {
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              });
              if (clientDetailResp.ok) {
                sampleClientDetail = await clientDetailResp.json();
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch sample site', e);
      }

      return res.json({
        success: true,
        message: `Connection successful! Found ${haloClients.length} clients.`,
        total: haloClients.length,
        sampleFields: sampleFields,
        sampleClient: haloClients[0] ? {
          id: haloClients[0].id,
          name: haloClients[0].name,
          client_name: haloClients[0].client_name,
          email: haloClients[0].email,
          main_email: haloClients[0].main_email,
        } : null,
        sampleSite: sampleSite,
        sampleSiteDetail: sampleSiteDetail,
        sampleSiteDetailKeys: sampleSiteDetail ? Object.keys(sampleSiteDetail) : [],
        sampleSiteDetailAll: sampleSiteDetail,
        sampleClientDetail: sampleClientDetail,
        sampleClientDetailKeys: sampleClientDetail ? Object.keys(sampleClientDetail) : [],
      });
    }

    if (haloClients.length === 0) {
      return res.json({
        success: true,
        message: 'No clients found in HaloPSA',
        created: 0,
        updated: 0,
        total: 0,
      });
    }

    // Get existing customers to check for duplicates
    const existingCustomers = await entityService.list('Customer');

    const existingByExternalId = {};
    const existingByEmail = {};
    const existingByName = {};

    existingCustomers.forEach(c => {
      if (c.external_id) existingByExternalId[c.external_id] = c;
      if (c.email) existingByEmail[c.email.toLowerCase().trim()] = c;
      if (c.name) existingByName[c.name.toLowerCase().trim()] = c;
    });

    let created = 0;
    let updated = 0;
    let matched = 0;
    const haloIdToProjectId = {};

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

    const customersToCreate = [];
    const customersToUpdate = [];
    const haloClientMap = {};

    for (const haloClient of haloClients) {
      const externalId = `halo_${haloClient.id}`;
      haloClientMap[externalId] = haloClient.id;

      const customerName = getField(haloClient, fieldMapping.name) || haloClient.name || haloClient.client_name || 'Unknown';
      const customerEmail = getField(haloClient, fieldMapping.email) || haloClient.email || haloClient.main_email || '';

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
        source: 'halo_psa',
      };

      let existingCustomer = existingByExternalId[externalId];

      if (!existingCustomer && customerEmail) {
        existingCustomer = existingByEmail[customerEmail.toLowerCase().trim()];
        if (existingCustomer) matched++;
      }

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

    // Process Updates sequentially to avoid rate limits
    if (customersToUpdate.length > 0) {
      for (const item of customersToUpdate) {
        try {
          await entityService.update('Customer', item.id, item.data);
          haloIdToProjectId[item.haloId] = { id: item.id, name: item.data.name };
          updated++;
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          console.error(`Failed to update customer ${item.id}`, e);
        }
      }
    }

    // Process Creates in batches
    if (customersToCreate.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < customersToCreate.length; i += chunkSize) {
        const batchData = customersToCreate.slice(i, i + chunkSize).map(c => c.data);
        try {
          const createdEntities = await entityService.bulkCreate('Customer', batchData);
          created += createdEntities.length;

          for (const c of createdEntities) {
            const haloId = haloClientMap[c.external_id];
            if (haloId) {
              haloIdToProjectId[haloId] = { id: c.id, name: c.name };
            }
          }
        } catch (e) {
          console.error('Bulk create failed', e);
        }
      }
    }

    // --- SYNC USERS (Contacts) ---
    let usersCreated = 0;
    let usersUpdated = 0;

    try {
      const usersUrl = `${apiBaseUrl}/Users?count=1000`;
      const usersResponse = await fetch(usersUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const haloUsers = usersData.users || [];

        const existingContacts = await entityService.filter('Customer', { is_company: false, source: 'halo_psa' });
        const existingContactMap = {};
        existingContacts.forEach(c => {
          if (c.external_id) existingContactMap[c.external_id] = c;
        });

        const usersToCreate = [];

        for (const user of haloUsers) {
          if (!user.client_id || !haloIdToProjectId[user.client_id]) continue;

          const userExternalId = `halo_user_${user.id}`;
          if (existingContactMap[userExternalId]) continue;

          const parentInfo = haloIdToProjectId[user.client_id];
          const userName = user.name || user.username || 'Unknown User';

          usersToCreate.push({
            name: userName,
            email: user.emailaddress || user.email || '',
            phone: user.phonenumber || user.phone || user.mobile_number || '',
            company_id: parentInfo.id,
            company: parentInfo.name,
            is_company: false,
            source: 'halo_psa',
            external_id: userExternalId,
            notes: user.notes || '',
          });
        }

        if (usersToCreate.length > 0) {
          const chunkSize = 50;
          for (let i = 0; i < usersToCreate.length; i += chunkSize) {
            const batch = usersToCreate.slice(i, i + chunkSize);
            try {
              const createdUsers = await entityService.bulkCreate('Customer', batch);
              usersCreated += createdUsers.length;
            } catch (e) {
              console.error('Bulk create users failed', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error syncing users:', err);
    }

    // --- SYNC SITES ---
    let sitesCreated = 0;
    let sitesUpdated = 0;

    try {
      const sitesUrl = `${apiBaseUrl}/Site?count=1000`;
      console.log('Fetching sites from:', sitesUrl);
      const sitesResponse = await fetch(sitesUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Sites response status:', sitesResponse.status);

      if (sitesResponse.ok) {
        const sitesData = await sitesResponse.json();
        console.log('Sites data keys:', Object.keys(sitesData));

        let haloSites = [];
        if (Array.isArray(sitesData)) {
          haloSites = sitesData;
        } else if (sitesData.sites) {
          haloSites = sitesData.sites;
        } else if (sitesData.Sites) {
          haloSites = sitesData.Sites;
        }

        console.log(`Found ${haloSites.length} sites from HaloPSA`);
        if (haloSites.length > 0) {
          console.log('Sample site FULL:', JSON.stringify(haloSites[0]));
        }

        if (haloSites.length > 0) {
          const existingSites = await entityService.list('Site');
          const existingSiteMap = {};
          existingSites.forEach(s => {
            if (s.external_id) existingSiteMap[s.external_id] = s;
          });

          const sitesToCreate = [];
          const sitesToUpdate = [];

          for (const site of haloSites) {
            if (!site.client_id) continue;
            if (!haloIdToProjectId[site.client_id]) continue;

            const parentInfo = haloIdToProjectId[site.client_id];
            const siteExternalId = `halo_site_${site.id}`;
            const existingSite = existingSiteMap[siteExternalId];

            if (existingSite && existingSite.address) continue;

            // Fetch individual site details to get address
            let siteDetail = site;
            try {
              const siteDetailUrl = `${apiBaseUrl}/Site/${site.id}`;
              const siteDetailResp = await fetch(siteDetailUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              });
              if (siteDetailResp.ok) {
                siteDetail = await siteDetailResp.json();
              }
              await new Promise(r => setTimeout(r, 100));
            } catch (e) {
              console.error(`Failed to fetch site ${site.id} details`, e);
            }

            const siteName = siteDetail.name || site.name || 'Main Site';

            const clientAddr = siteDetail.client || {};
            const deliveryAddr = siteDetail.delivery_address || {};
            const invoiceAddr = siteDetail.invoice_address || {};

            const siteAddress = clientAddr.line1 || deliveryAddr.line1 || invoiceAddr.line1 || siteDetail.line1 || '';
            const siteCity = clientAddr.city || deliveryAddr.city || invoiceAddr.city || siteDetail.city || '';
            const siteState = clientAddr.county || clientAddr.state || deliveryAddr.state || deliveryAddr.county || invoiceAddr.state || invoiceAddr.county || siteDetail.state || siteDetail.county || '';
            const siteZip = clientAddr.postcode || deliveryAddr.postcode || invoiceAddr.postcode || siteDetail.postcode || '';

            const siteData = {
              name: siteName,
              address: siteAddress,
              city: siteCity,
              state: siteState,
              zip: siteZip,
              customer_id: parentInfo.id,
              external_id: siteExternalId,
              notes: siteDetail.notes || '',
              is_default: siteDetail.is_default === true,
            };

            if (existingSite) {
              sitesToUpdate.push({ id: existingSite.id, data: siteData });
            } else {
              sitesToCreate.push(siteData);
            }
          }

          console.log(`Sites to create: ${sitesToCreate.length}, to update: ${sitesToUpdate.length}`);

          for (const item of sitesToUpdate) {
            try {
              await entityService.update('Site', item.id, item.data);
              sitesUpdated++;
              await new Promise(r => setTimeout(r, 100));
            } catch (e) {
              console.error('Update site failed', e);
            }
          }

          if (sitesToCreate.length > 0) {
            const chunkSize = 25;
            for (let i = 0; i < sitesToCreate.length; i += chunkSize) {
              const batch = sitesToCreate.slice(i, i + chunkSize);
              try {
                const createdSites = await entityService.bulkCreate('Site', batch);
                sitesCreated += createdSites.length;
                await new Promise(r => setTimeout(r, 500));
              } catch (e) {
                console.error('Bulk create sites failed', e);
                await new Promise(r => setTimeout(r, 2000));
              }
            }
          }
        }
      } else {
        console.error('Sites fetch failed:', sitesResponse.status);
      }
    } catch (err) {
      console.error('Error syncing sites:', err);
    }

    // Update last sync time
    try {
      if (config.settings?.id) {
        await entityService.update('IntegrationSettings', config.settings.id, {
          halopsa_last_sync: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Failed to update last sync time:', e);
    }

    return res.json({
      success: true,
      message: `Synced ${created} new customers, updated ${updated} existing. Synced ${usersCreated} new users, updated ${usersUpdated} existing. Synced ${sitesCreated} new sites, updated ${sitesUpdated} existing.`,
      created,
      updated,
      usersCreated,
      usersUpdated,
      sitesCreated,
      sitesUpdated,
      matched,
      total: haloClients.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
