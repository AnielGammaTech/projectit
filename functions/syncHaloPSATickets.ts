import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function getHaloToken(authUrl, clientId, clientSecret, tenant) {
  const tokenUrl = `${authUrl}/token`;
  const tokenBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'all'
  });

  if (tenant) {
    tokenBody.append('tenant', tenant);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody
  });

  if (!response.ok) {
    throw new Error(`HaloPSA auth failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify auth
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { customerId, customerExternalId } = body;

    // Get credentials
    const haloClientId = Deno.env.get("HALOPSA_CLIENT_ID");
    const clientSecret = Deno.env.get("HALOPSA_CLIENT_SECRET");
    const tenant = Deno.env.get("HALOPSA_TENANT");

    if (!haloClientId || !clientSecret) {
      return Response.json({ error: 'HaloPSA credentials not configured' }, { status: 400 });
    }

    // Get integration settings
    const settings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const config = settings[0];
    
    if (!config?.halopsa_enabled) {
      return Response.json({ error: 'HaloPSA integration not enabled' }, { status: 400 });
    }

    const authUrl = config.halopsa_auth_url?.replace(/\/+$/, '');
    const apiUrl = config.halopsa_api_url?.replace(/\/+$/, '');

    if (!authUrl || !apiUrl) {
      return Response.json({ error: 'HaloPSA URLs not configured' }, { status: 400 });
    }

    const accessToken = await getHaloToken(authUrl, haloClientId, clientSecret, tenant);

    // Build query params - filter by client if specified
    let clientFilter = '';
    let targetCustomer = null;
    
    if (customerId || customerExternalId) {
      // Get customer to find external_id
      if (customerId) {
        const customers = await base44.asServiceRole.entities.Customer.filter({ id: customerId });
        targetCustomer = customers[0];
        if (targetCustomer?.external_id) {
          clientFilter = `&client_id=${targetCustomer.external_id}`;
        }
      } else if (customerExternalId) {
        clientFilter = `&client_id=${customerExternalId}`;
      }
    }

    // Fetch tickets from HaloPSA - paginated to avoid rate limits
    let allTickets = [];
    let page = 1;
    const pageSize = 50;
    const maxPages = clientFilter ? 20 : 10; // Allow more pages for single client
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const ticketsResponse = await fetch(`${apiUrl}/Tickets?page_no=${page}&page_size=${pageSize}${clientFilter}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!ticketsResponse.ok) {
        const errorText = await ticketsResponse.text();
        return Response.json({ error: 'Failed to fetch tickets', details: errorText, page }, { status: 500 });
      }

      const ticketsData = await ticketsResponse.json();
      const pageTickets = ticketsData.tickets || ticketsData || [];
      
      if (pageTickets.length === 0) {
        hasMore = false;
      } else {
        allTickets = [...allTickets, ...pageTickets];
        page++;
        // Small delay to avoid rate limiting
        if (hasMore && page <= maxPages) {
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }

    const haloTickets = allTickets;

    // Get all customers to match by external_id
    const customers = await base44.asServiceRole.entities.Customer.list();
    const customersByExternalId = {};
    customers.forEach(c => {
      if (c.external_id) {
        customersByExternalId[c.external_id] = c;
      }
    });

    // Get existing tickets to avoid duplicates
    const existingTickets = await base44.asServiceRole.entities.Ticket.list();
    const existingByExternalId = {};
    existingTickets.forEach(t => {
      existingByExternalId[t.external_id] = t;
    });

    let created = 0;
    let updated = 0;
    let matched = 0;

    for (const haloTicket of haloTickets) {
      const ticketExternalId = String(haloTicket.id);
      const clientId = haloTicket.client_id ? String(haloTicket.client_id) : null;
      
      // Find matching customer
      const matchedCustomer = clientId ? customersByExternalId[clientId] : null;

      const ticketData = {
        external_id: ticketExternalId,
        customer_id: matchedCustomer?.id || null,
        customer_external_id: clientId,
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
        raw_data: haloTicket
      };

      const existing = existingByExternalId[ticketExternalId];

      if (existing) {
        // Update existing ticket
        await base44.asServiceRole.entities.Ticket.update(existing.id, ticketData);
        updated++;
      } else {
        // Create new ticket
        await base44.asServiceRole.entities.Ticket.create(ticketData);
        created++;
      }

      if (matchedCustomer) {
        matched++;
      }
    }

    // Update last sync timestamp
    await base44.asServiceRole.entities.IntegrationSettings.update(config.id, {
      halopsa_last_sync: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: `Synced ${haloTickets.length} tickets`,
      created,
      updated,
      matched,
      total: haloTickets.length
    });

  } catch (error) {
    console.error('HaloPSA Ticket Sync Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});