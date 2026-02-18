import entityService from '../../services/entityService.js';
import { getHaloPSAConfig, getHaloPSAToken } from '../../services/halopsaService.js';

/**
 * Fetch HaloPSA clients and return them alongside local customers
 * for the customer mapping UI in Adminland.
 */
export default async function handler(req, res) {
  try {
    const config = await getHaloPSAConfig();
    const { apiBaseUrl } = config;
    const accessToken = await getHaloPSAToken(config);

    // Fetch clients from HaloPSA
    const clientsResponse = await fetch(`${apiBaseUrl}/Client?count=500`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!clientsResponse.ok) {
      const errorText = await clientsResponse.text();
      return res.status(502).json({
        error: `Failed to fetch HaloPSA clients (${clientsResponse.status})`,
        details: errorText,
      });
    }

    const clientsData = await clientsResponse.json();
    let haloClients = clientsData.clients || [];

    // Filter out excluded IDs
    const excludedIdsStr = config.settings?.halopsa_excluded_ids || '';
    if (excludedIdsStr) {
      const excludedIds = excludedIdsStr.split(',').map(id => id.trim()).filter(Boolean);
      if (excludedIds.length > 0) {
        haloClients = haloClients.filter(c => !excludedIds.includes(String(c.id)));
      }
    }

    // Fetch local customers
    const localCustomers = await entityService.list('Customer');

    // Build lookup maps for auto-matching
    const localByExternalId = {};
    const localByName = {};
    localCustomers.forEach(c => {
      if (c.external_id) localByExternalId[c.external_id] = c;
      if (c.name) localByName[c.name.toLowerCase().trim()] = c;
    });

    // Build the response: each halo client with its mapping status
    const mappedClients = haloClients.map(hc => {
      const externalId = `halo_${hc.id}`;
      const mappedByExternal = localByExternalId[externalId];
      const haloName = hc.name || hc.client_name || '';
      const mappedByName = !mappedByExternal && haloName
        ? localByName[haloName.toLowerCase().trim()]
        : null;
      const mapped = mappedByExternal || mappedByName || null;

      return {
        halo_id: hc.id,
        halo_name: haloName,
        halo_email: hc.email || hc.main_email || '',
        halo_phone: hc.main_phone || hc.phonenumber || '',
        mapped_customer_id: mapped?.id || null,
        mapped_customer_name: mapped?.name || null,
        is_synced: !!mappedByExternal,
        is_name_matched: !!mappedByName && !mappedByExternal,
      };
    });

    // Also return the local customer list for the dropdown
    const customerOptions = localCustomers
      .filter(c => c.is_company !== false)
      .map(c => ({ id: c.id, name: c.name, email: c.email }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return res.json({
      success: true,
      halo_clients: mappedClients,
      local_customers: customerOptions,
      total_halo: mappedClients.length,
      total_mapped: mappedClients.filter(c => c.mapped_customer_id).length,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message,
      details: error.details || null,
    });
  }
}
