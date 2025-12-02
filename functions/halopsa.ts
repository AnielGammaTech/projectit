import { base44 } from './base44Client.js';

// Get access token from HaloPSA
async function getAccessToken() {
  const clientId = process.env.HALOPSA_CLIENT_ID;
  const clientSecret = process.env.HALOPSA_CLIENT_SECRET;
  const tenant = process.env.HALOPSA_TENANT;

  // Remove https:// or http:// if included in tenant
  const cleanTenant = tenant.replace(/^https?:\/\//, '');

  const response = await fetch(`https://${cleanTenant}/auth/token`, {
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
    const errorText = await response.text();
    console.error('HaloPSA auth error:', response.status, errorText);
    throw new Error(`Failed to authenticate with HaloPSA: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get ticket details by ID
export async function getTicket({ ticketId }) {
  const tenant = process.env.HALOPSA_TENANT;
  const cleanTenant = tenant.replace(/^https?:\/\//, '');
  
  try {
    const token = await getAccessToken();

    const response = await fetch(`https://${cleanTenant}/api/tickets/${ticketId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Ticket not found' };
      }
      const errorText = await response.text();
      console.error('HaloPSA ticket fetch error:', response.status, errorText);
      return { error: `Failed to fetch ticket: ${response.status}` };
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
  } catch (err) {
    console.error('HaloPSA error:', err);
    return { error: err.message || 'Failed to connect to HaloPSA' };
  }
}

// Search tickets
export async function searchTickets({ query, count = 10 }) {
  const tenant = process.env.HALOPSA_TENANT;
  const cleanTenant = tenant.replace(/^https?:\/\//, '');
  
  try {
    const token = await getAccessToken();

    const response = await fetch(`https://${cleanTenant}/api/tickets?search=${encodeURIComponent(query)}&count=${count}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HaloPSA search error:', response.status, errorText);
      return { error: `Failed to search tickets: ${response.status}` };
    }

    const data = await response.json();
    return (data.tickets || []).map(ticket => ({
      id: ticket.id,
      summary: ticket.summary,
      status: ticket.status_name,
      client: ticket.client_name,
      priority: ticket.priority_name
    }));
  } catch (err) {
    console.error('HaloPSA search error:', err);
    return { error: err.message || 'Failed to search tickets' };
  }
}