import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, projectId, ticketId, summary, details, clientId } = body;

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
      // Create a new ticket in HaloPSA
      const ticketData = [{
        summary: summary || 'New Project Ticket',
        details: details || '',
        client_id: clientId ? parseInt(clientId.replace('halo_', '')) : undefined,
        tickettype_id: 1 // Default ticket type
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

    } else {
      return Response.json({ error: 'Invalid action. Use: create, link, or unlink' }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});