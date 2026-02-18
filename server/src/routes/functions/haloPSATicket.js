import entityService from '../../services/entityService.js';
import { getHaloPSAConfig, getHaloPSAToken } from '../../services/halopsaService.js';

export default async function handler(req, res) {
  try {
    const { action, projectId, ticketId, summary, details, clientId, clientName, note, noteIsPrivate } = req.body;

    // Get HaloPSA config from DB (falls back to env vars)
    const config = await getHaloPSAConfig();
    const { apiUrl, apiBaseUrl } = config;
    const accessToken = await getHaloPSAToken(config);

    if (action === 'create') {
      // Look up client in HaloPSA if we have a customer_id or client name
      let haloClientIdResolved = null;

      if (clientId) {
        if (clientId.startsWith('halo_')) {
          haloClientIdResolved = parseInt(clientId.replace('halo_', ''));
        } else {
          const customers = await entityService.filter('Customer', { id: clientId });
          if (customers[0]?.halopsa_id) {
            haloClientIdResolved = parseInt(customers[0].halopsa_id);
          }
        }
      }

      // If no HaloPSA client ID found and we have a client name, search in HaloPSA
      if (!haloClientIdResolved && clientName) {
        const searchResponse = await fetch(`${apiBaseUrl}/Client?search=${encodeURIComponent(clientName)}&count=5`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();
          const clients = searchResults.clients || searchResults;
          if (Array.isArray(clients) && clients.length > 0) {
            const exactMatch = clients.find(c => c.name?.toLowerCase() === clientName.toLowerCase());
            haloClientIdResolved = exactMatch ? exactMatch.id : clients[0].id;
          }
        }
      }

      // Create a new ticket in HaloPSA
      const ticketData = [{
        summary: summary || 'New Project Ticket',
        details: details || '',
        client_id: haloClientIdResolved || undefined,
        tickettype_name: 'Gamma Default',
      }];

      const createResponse = await fetch(`${apiBaseUrl}/Tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        return res.status(500).json({
          error: 'Failed to create ticket',
          details: errorText,
        });
      }

      const createdTicket = await createResponse.json();
      const newTicket = createdTicket[0] || createdTicket;

      // Build ticket URL
      const ticketUrl = `${apiUrl.replace('/api', '')}/Ticket?id=${newTicket.id}`;

      // Update project with ticket info
      if (projectId) {
        await entityService.update('Project', projectId, {
          halopsa_ticket_id: String(newTicket.id),
          halopsa_ticket_url: ticketUrl,
        });
      }

      return res.json({
        success: true,
        ticketId: newTicket.id,
        ticketUrl: ticketUrl,
        message: `Ticket #${newTicket.id} created successfully`,
      });

    } else if (action === 'link') {
      // Verify the ticket exists
      const ticketResponse = await fetch(`${apiBaseUrl}/Tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!ticketResponse.ok) {
        return res.status(404).json({
          error: `Ticket #${ticketId} not found in HaloPSA`,
          details: 'Please check the ticket ID and try again',
        });
      }

      const ticketData = await ticketResponse.json();
      const ticketUrl = `${apiUrl.replace('/api', '')}/Ticket?id=${ticketId}`;

      if (projectId) {
        await entityService.update('Project', projectId, {
          halopsa_ticket_id: String(ticketId),
          halopsa_ticket_url: ticketUrl,
        });
      }

      return res.json({
        success: true,
        ticketId: ticketId,
        ticketUrl: ticketUrl,
        ticketSummary: ticketData.summary,
        message: `Project linked to ticket #${ticketId}`,
      });

    } else if (action === 'unlink') {
      if (projectId) {
        await entityService.update('Project', projectId, {
          halopsa_ticket_id: '',
          halopsa_ticket_url: '',
        });
      }

      return res.json({
        success: true,
        message: 'Ticket unlinked from project',
      });

    } else if (action === 'addNote') {
      if (!ticketId || !note) {
        return res.status(400).json({
          error: 'Ticket ID and note are required',
        });
      }

      const actionData = [{
        ticket_id: parseInt(ticketId),
        note: note,
        hiddenfromuser: noteIsPrivate !== false,
        outcome: 'note',
      }];

      const noteResponse = await fetch(`${apiBaseUrl}/Actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
      });

      if (!noteResponse.ok) {
        const errorText = await noteResponse.text();
        return res.status(500).json({
          error: 'Failed to add note to ticket',
          details: errorText,
        });
      }

      return res.json({
        success: true,
        message: 'Private note added to ticket',
      });

    } else if (action === 'updateTicket') {
      if (!ticketId) {
        return res.status(400).json({ error: 'Ticket ID required' });
      }

      const { status, newSummary, newDetails } = req.body;

      const ticketUpdate = [{
        id: parseInt(ticketId),
      }];

      if (newSummary) ticketUpdate[0].summary = newSummary;
      if (newDetails) ticketUpdate[0].details = newDetails;
      if (status) {
        const statusMap = {
          'planning': 1,
          'on_hold': 23,
          'completed': 9,
        };
        if (statusMap[status]) {
          ticketUpdate[0].status_id = statusMap[status];
        }
      }

      const updateResponse = await fetch(`${apiBaseUrl}/Tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketUpdate),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        return res.status(500).json({
          error: 'Failed to update ticket',
          details: errorText,
        });
      }

      return res.json({
        success: true,
        message: 'Ticket updated successfully',
      });

    } else if (action === 'getTicket') {
      if (!ticketId) {
        return res.status(400).json({ error: 'Ticket ID required' });
      }

      const ticketResponse = await fetch(`${apiBaseUrl}/Tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!ticketResponse.ok) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticket = await ticketResponse.json();
      return res.json({ success: true, ticket });

    } else {
      return res.status(400).json({ error: 'Invalid action. Use: create, link, unlink, addNote, updateTicket, or getTicket' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
