import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, projectId, ticketId, summary, details, clientId, clientName, note, noteIsPrivate } = body;

    // Get HaloPSA credentials
    const haloClientId = Deno.env.get("HALOPSA_CLIENT_ID");
    const clientSecret = Deno.env.get("HALOPSA_CLIENT_SECRET");
    const tenant = Deno.env.get("HALOPSA_TENANT");

    if (!haloClientId || !clientSecret) {
      return Response.json({ 
        error: 'HaloPSA credentials not configured.',
        details: 'Please set HALOPSA_CLIENT_ID and HALOPSA_CLIENT_SECRET in environment variables'
      }, { status: 400 });
    }

    // Get integration settings for URLs
    const settings = await base44.entities.IntegrationSettings.filter({ setting_key: 'main' });
    let authUrl = settings[0]?.halopsa_auth_url;
    let apiUrl = settings[0]?.halopsa_api_url;

    if (!authUrl || !apiUrl) {
      return Response.json({ 
        error: 'HaloPSA URLs not configured', 
        details: 'Please configure HaloPSA in Adminland → Integrations' 
      }, { status: 400 });
    }

    // Clean up URLs
    authUrl = authUrl.replace(/\/+$/, '').replace(/\/auth\/?$/, '').replace(/\/api\/?$/, '');
    apiUrl = apiUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');

    const tokenUrl = `${authUrl}/auth/token`;
    const apiBaseUrl = `${apiUrl}/api`;

    // Get access token
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: haloClientId,
      client_secret: clientSecret,
      scope: 'all'
    });

    if (tenant) {
      tokenBody.append('tenant', tenant);
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return Response.json({ 
        error: `HaloPSA authentication failed`,
        details: errorText
      }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (action === 'create') {
      // Look up client in HaloPSA if we have a customer_id or client name
      let haloClientId = null;
      
      if (clientId) {
        // Check if it's a HaloPSA ID format (halo_xxx)
        if (clientId.startsWith('halo_')) {
          haloClientId = parseInt(clientId.replace('halo_', ''));
        } else {
          // Try to find the customer in our database and get their HaloPSA ID
          const customers = await base44.entities.Customer.filter({ id: clientId });
          if (customers[0]?.halopsa_id) {
            haloClientId = parseInt(customers[0].halopsa_id);
          }
        }
      }
      
      // If no HaloPSA client ID found and we have a client name, search in HaloPSA
      if (!haloClientId && clientName) {
        const searchResponse = await fetch(`${apiBaseUrl}/Client?search=${encodeURIComponent(clientName)}&count=5`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();
          const clients = searchResults.clients || searchResults;
          if (Array.isArray(clients) && clients.length > 0) {
            // Try to find exact match first
            const exactMatch = clients.find(c => c.name?.toLowerCase() === clientName.toLowerCase());
            haloClientId = exactMatch ? exactMatch.id : clients[0].id;
          }
        }
      }

      // Create a new ticket in HaloPSA with Gamma Default ticket type
      const ticketData = [{
        summary: summary || 'New Project Ticket',
        details: details || '',
        client_id: haloClientId || undefined,
        tickettype_name: 'Gamma Default'
      }];

      const createResponse = await fetch(`${apiBaseUrl}/Tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        return Response.json({ 
          error: `Failed to create ticket`,
          details: errorText
        }, { status: 500 });
      }

      const createdTicket = await createResponse.json();
      const newTicket = createdTicket[0] || createdTicket;
      
      // Build ticket URL
      const ticketUrl = `${apiUrl.replace('/api', '')}/Ticket?id=${newTicket.id}`;

      // Update project with ticket info
      if (projectId) {
        await base44.entities.Project.update(projectId, {
          halopsa_ticket_id: String(newTicket.id),
          halopsa_ticket_url: ticketUrl
        });
      }

      return Response.json({
        success: true,
        ticketId: newTicket.id,
        ticketUrl: ticketUrl,
        message: `Ticket #${newTicket.id} created successfully`
      });

    } else if (action === 'link') {
      // Link an existing ticket to the project
      // First verify the ticket exists
      const ticketResponse = await fetch(`${apiBaseUrl}/Tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!ticketResponse.ok) {
        return Response.json({ 
          error: `Ticket #${ticketId} not found in HaloPSA`,
          details: 'Please check the ticket ID and try again'
        }, { status: 404 });
      }

      const ticketData = await ticketResponse.json();
      const ticketUrl = `${apiUrl.replace('/api', '')}/Ticket?id=${ticketId}`;

      // Update project with ticket info
      if (projectId) {
        await base44.entities.Project.update(projectId, {
          halopsa_ticket_id: String(ticketId),
          halopsa_ticket_url: ticketUrl
        });
      }

      return Response.json({
        success: true,
        ticketId: ticketId,
        ticketUrl: ticketUrl,
        ticketSummary: ticketData.summary,
        message: `Project linked to ticket #${ticketId}`
      });

    } else if (action === 'unlink') {
      // Remove ticket link from project
      if (projectId) {
        await base44.entities.Project.update(projectId, {
          halopsa_ticket_id: '',
          halopsa_ticket_url: ''
        });
      }

      return Response.json({
        success: true,
        message: 'Ticket unlinked from project'
      });

    } else if (action === 'addNote') {
      // Add a private note to an existing ticket
      if (!ticketId || !note) {
        return Response.json({ 
          error: 'Ticket ID and note are required' 
        }, { status: 400 });
      }

      const actionData = [{
        ticket_id: parseInt(ticketId),
        note: note,
        hiddenfromuser: noteIsPrivate !== false, // Default to private
        outcome: 'note'
      }];

      const noteResponse = await fetch(`${apiBaseUrl}/Actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(actionData)
      });

      if (!noteResponse.ok) {
        const errorText = await noteResponse.text();
        return Response.json({ 
          error: 'Failed to add note to ticket',
          details: errorText
        }, { status: 500 });
      }

      return Response.json({
        success: true,
        message: 'Private note added to ticket'
      });

    } else if (action === 'updateTicket') {
      // Update ticket status/summary/details
      if (!ticketId) {
        return Response.json({ error: 'Ticket ID required' }, { status: 400 });
      }

      const { status, newSummary, newDetails } = body;
      
      const ticketUpdate = [{
        id: parseInt(ticketId)
      }];

      if (newSummary) ticketUpdate[0].summary = newSummary;
      if (newDetails) ticketUpdate[0].details = newDetails;
      if (status) {
        // Map Base44 status to HaloPSA status_id
        const statusMap = {
          'planning': 1,
          'on_hold': 23,
          'completed': 9
        };
        if (statusMap[status]) {
          ticketUpdate[0].status_id = statusMap[status];
        }
      }

      const updateResponse = await fetch(`${apiBaseUrl}/Tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketUpdate)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        return Response.json({ 
          error: 'Failed to update ticket',
          details: errorText
        }, { status: 500 });
      }

      return Response.json({
        success: true,
        message: 'Ticket updated successfully'
      });

    } else if (action === 'getTicket') {
      // Fetch ticket details from HaloPSA
      if (!ticketId) {
        return Response.json({ error: 'Ticket ID required' }, { status: 400 });
      }

      const ticketResponse = await fetch(`${apiBaseUrl}/Tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!ticketResponse.ok) {
        return Response.json({ error: 'Ticket not found' }, { status: 404 });
      }

      const ticket = await ticketResponse.json();
      return Response.json({ success: true, ticket });

    } else {
      return Response.json({ error: 'Invalid action. Use: create, link, unlink, addNote, updateTicket, or getTicket' }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});