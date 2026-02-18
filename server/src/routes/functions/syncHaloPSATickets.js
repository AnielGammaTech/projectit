import entityService from '../../services/entityService.js';
import { getHaloPSAConfig, getHaloPSAToken } from '../../services/halopsaService.js';

export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const { customerId, customerExternalId } = body;

    // Get HaloPSA config from DB (falls back to env vars)
    const haloConfig = await getHaloPSAConfig();

    if (!haloConfig.settings?.halopsa_enabled) {
      return res.status(400).json({ error: 'HaloPSA integration not enabled' });
    }

    const accessToken = await getHaloPSAToken(haloConfig);

    // Build query params - filter by client if specified
    let clientFilter = '';
    let targetCustomer = null;

    if (customerId || customerExternalId) {
      if (customerId) {
        const customers = await entityService.filter('Customer', { id: customerId });
        targetCustomer = customers[0];
        if (targetCustomer?.external_id) {
          const haloClientIdValue = targetCustomer.external_id.replace(/^halo_/, '');
          clientFilter = `&client_id=${haloClientIdValue}`;
        }
      } else if (customerExternalId) {
        const haloClientIdValue = customerExternalId.replace(/^halo_/, '');
        clientFilter = `&client_id=${haloClientIdValue}`;
      }
    }

    // Fetch tickets from HaloPSA - paginated
    // Limit to last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateFilter = `&dateoccurred_start=${ninetyDaysAgo.toISOString().split('T')[0]}`;

    let allTickets = [];
    let page = 1;
    const pageSize = 50;
    const maxPages = clientFilter ? 20 : 10;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const ticketsResponse = await fetch(`${haloConfig.apiBaseUrl}/Tickets?page_no=${page}&page_size=${pageSize}${clientFilter}${dateFilter}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!ticketsResponse.ok) {
        const errorText = await ticketsResponse.text();
        return res.status(500).json({ error: 'Failed to fetch tickets', details: errorText, page });
      }

      const ticketsData = await ticketsResponse.json();
      const pageTickets = ticketsData.tickets || ticketsData || [];

      if (pageTickets.length === 0) {
        hasMore = false;
      } else {
        allTickets = [...allTickets, ...pageTickets];
        page++;
        if (hasMore && page <= maxPages) {
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }

    const haloTickets = allTickets;

    // Build customer lookup
    let customersByExternalId = {};
    if (targetCustomer) {
      const strippedId = targetCustomer.external_id?.replace(/^halo_/, '') || '';
      customersByExternalId[targetCustomer.external_id] = targetCustomer;
      customersByExternalId[strippedId] = targetCustomer;
    } else {
      const customers = await entityService.list('Customer');
      customers.forEach(c => {
        if (c.external_id) {
          customersByExternalId[c.external_id] = c;
          const strippedId = c.external_id.replace(/^halo_/, '');
          customersByExternalId[strippedId] = c;
        }
      });
    }

    // Get existing tickets to avoid duplicates
    // Note: 'Ticket' entity may not exist in whitelist yet; this would need to be added
    let existingTickets = [];
    try {
      if (targetCustomer) {
        existingTickets = await entityService.filter('Ticket', { customer_id: targetCustomer.id });
      } else {
        existingTickets = await entityService.list('Ticket');
      }
    } catch (e) {
      console.warn('Ticket entity may not exist yet:', e.message);
    }

    const existingByExternalId = {};
    existingTickets.forEach(t => {
      existingByExternalId[t.external_id] = t;
    });

    let created = 0;
    let updated = 0;
    let matched = 0;
    let skipped = 0;

    const toCreate = [];
    const toUpdate = [];

    for (const haloTicket of haloTickets) {
      const ticketExternalId = String(haloTicket.id);
      const haloTicketClientId = haloTicket.client_id ? String(haloTicket.client_id) : null;

      const matchedCustomer = haloTicketClientId ? customersByExternalId[haloTicketClientId] : null;

      if (!matchedCustomer) {
        skipped++;
        continue;
      }

      const ticketData = {
        external_id: ticketExternalId,
        customer_id: matchedCustomer.id,
        customer_external_id: haloTicketClientId,
        summary: haloTicket.summary || 'No summary',
        details: haloTicket.details || '',
        status: haloTicket.status?.name || haloTicket.statusname || '',
        status_id: haloTicket.status_id,
        priority: haloTicket.priority?.name || haloTicket.priorityname || '',
        priority_id: haloTicket.priority_id,
        ticket_type: haloTicket.tickettype?.name || haloTicket.tickettypename || '',
        date_created: haloTicket.dateoccurred || haloTicket.datecreated,
        date_closed: haloTicket.dateclosed,
        assigned_agent: haloTicket.agent?.name || haloTicket.agentname || '',
        category: haloTicket.category1 || '',
        raw_data: haloTicket,
      };

      const existing = existingByExternalId[ticketExternalId];

      if (existing) {
        toUpdate.push({ id: existing.id, data: ticketData });
      } else {
        toCreate.push(ticketData);
      }

      matched++;
    }

    // Create new tickets in small batches
    const batchSize = 10;
    try {
      for (let i = 0; i < toCreate.length; i += batchSize) {
        const batch = toCreate.slice(i, i + batchSize);
        await entityService.bulkCreate('Ticket', batch);
        created += batch.length;
        if (i + batchSize < toCreate.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    } catch (e) {
      console.warn('Ticket bulk create failed (entity may not exist):', e.message);
    }

    // Update existing tickets with delays
    try {
      for (let i = 0; i < toUpdate.length; i++) {
        await entityService.update('Ticket', toUpdate[i].id, toUpdate[i].data);
        updated++;
        if (i < toUpdate.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
    } catch (e) {
      console.warn('Ticket update failed (entity may not exist):', e.message);
    }

    // Update last sync timestamp
    await entityService.update('IntegrationSettings', config.id, {
      halopsa_last_sync: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Synced ${created + updated} tickets (skipped ${skipped} unmatched)`,
      created,
      updated,
      matched,
      skipped,
      total: haloTickets.length,
    });
  } catch (error) {
    console.error('HaloPSA Ticket Sync Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
