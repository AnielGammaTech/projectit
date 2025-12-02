import { base44 } from './base44Client.js';

// Get access token from HaloPSA
async function getAccessToken() {
  const clientId = process.env.HALOPSA_CLIENT_ID;
  const clientSecret = process.env.HALOPSA_CLIENT_SECRET;
  const tenant = process.env.HALOPSA_TENANT;

  const response = await fetch(`https://${tenant}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'all'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with HaloPSA');
  }

  const data = await response.json();
  return data.access_token;
}

// Get ticket details by ID
export async function getTicket({ ticketId }) {
  const tenant = process.env.HALOPSA_TENANT;
  const token = await getAccessToken();

  const response = await fetch(`https://${tenant}/api/tickets/${ticketId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { error: 'Ticket not found' };
    }
    throw new Error('Failed to fetch ticket from HaloPSA');
  }

  const ticket = await response.json();
  return {
    id: ticket.id,
    summary: ticket.summary,
    details: ticket.details,
    status: ticket.status_name,
    client: ticket.client_name,
    site: ticket.site_name,
    user: ticket.user_name,
    priority: ticket.priority_name,
    category: ticket.category_1,
    dateLogged: ticket.datelogged,
    dateClosed: ticket.dateclosed,
    assignedTo: ticket.agent_name
  };
}

// Search tickets
export async function searchTickets({ query, count = 10 }) {
  const tenant = process.env.HALOPSA_TENANT;
  const token = await getAccessToken();

  const response = await fetch(`https://${tenant}/api/tickets?search=${encodeURIComponent(query)}&count=${count}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to search tickets in HaloPSA');
  }

  const data = await response.json();
  return (data.tickets || []).map(ticket => ({
    id: ticket.id,
    summary: ticket.summary,
    status: ticket.status_name,
    client: ticket.client_name,
    priority: ticket.priority_name
  }));
}