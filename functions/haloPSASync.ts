import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Field mapping between Base44 and HaloPSA
const FIELD_MAPPING = {
  // Base44 Project -> HaloPSA Ticket
  projectToTicket: {
    name: 'summary',
    description: 'details',
    status: 'status_id', // Will need status mapping
    progress: 'customfields.progress',
  },
  // Base44 Task -> HaloPSA Action/Note
  taskToAction: {
    title: 'note',
    status: 'outcome',
    assigned_to: 'agent_id',
  },
  // HaloPSA Ticket -> Base44 Project
  ticketToProject: {
    summary: 'name',
    details: 'description',
    status_id: 'status',
  },
  // Status mapping
  statusMapping: {
    base44ToHalo: {
      'planning': 1, // New
      'on_hold': 23, // On Hold
      'completed': 9, // Closed
    },
    haloToBase44: {
      1: 'planning', // New
      2: 'planning', // In Progress
      23: 'on_hold', // On Hold
      9: 'completed', // Closed
    }
  }
};

// Sync log entity for tracking
async function logSync(base44, operation, entityType, entityId, status, details) {
  try {
    await base44.entities.AuditLog.create({
      action: `halopsa_sync_${operation}`,
      action_category: 'project',
      entity_type: entityType,
      entity_id: entityId,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      user_email: 'system@halopsa-sync',
      user_name: 'HaloPSA Sync'
    });
  } catch (e) {
    console.error('Failed to log sync:', e);
  }
}

async function getHaloToken(authUrl, clientId, clientSecret, tenant) {
  const tokenUrl = `${authUrl}/auth/token`;
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
    const body = await req.json();
    const { action, projectId, taskId, ticketId, data: updateData } = body;

    // Get credentials
    const haloClientId = Deno.env.get("HALOPSA_CLIENT_ID");
    const clientSecret = Deno.env.get("HALOPSA_CLIENT_SECRET");
    const tenant = Deno.env.get("HALOPSA_TENANT");

    if (!haloClientId || !clientSecret) {
      return Response.json({ 
        error: 'HaloPSA credentials not configured' 
      }, { status: 400 });
    }

    // Get integration settings
    const settings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const authUrl = settings[0]?.halopsa_auth_url?.replace(/\/+$/, '').replace(/\/auth\/?$/, '');
    const apiUrl = settings[0]?.halopsa_api_url?.replace(/\/+$/, '').replace(/\/api\/?$/, '');

    if (!authUrl || !apiUrl) {
      return Response.json({ error: 'HaloPSA URLs not configured' }, { status: 400 });
    }

    const accessToken = await getHaloToken(authUrl, haloClientId, clientSecret, tenant);
    const apiBase = `${apiUrl}/api`;

    // ACTION: Push project updates to HaloPSA
    if (action === 'pushProjectUpdate') {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
      const project = projects[0];
      
      if (!project || !project.halopsa_ticket_id) {
        return Response.json({ error: 'Project not linked to HaloPSA ticket' }, { status: 400 });
      }

      const ticketUpdate = [{
        id: parseInt(project.halopsa_ticket_id),
        summary: project.name,
        details: project.description || '',
      }];

      // Add status if mapped
      if (project.status && FIELD_MAPPING.statusMapping.base44ToHalo[project.status]) {
        ticketUpdate[0].status_id = FIELD_MAPPING.statusMapping.base44ToHalo[project.status];
      }

      const response = await fetch(`${apiBase}/Tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketUpdate)
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logSync(base44, 'push_project', 'Project', projectId, 'error', errorText);
        return Response.json({ error: 'Failed to update HaloPSA ticket', details: errorText }, { status: 500 });
      }

      await logSync(base44, 'push_project', 'Project', projectId, 'success', `Updated ticket #${project.halopsa_ticket_id}`);
      return Response.json({ success: true, message: 'Project synced to HaloPSA' });
    }

    // ACTION: Push task update as note to HaloPSA
    if (action === 'pushTaskUpdate') {
      const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
      const task = tasks[0];
      
      if (!task) {
        return Response.json({ error: 'Task not found' }, { status: 404 });
      }

      const projects = await base44.asServiceRole.entities.Project.filter({ id: task.project_id });
      const project = projects[0];

      if (!project?.halopsa_ticket_id) {
        return Response.json({ error: 'Project not linked to HaloPSA' }, { status: 400 });
      }

      const noteContent = `[Task Update] ${task.title}\nStatus: ${task.status}\nAssigned: ${task.assigned_name || 'Unassigned'}\n${task.description || ''}`;

      const actionData = [{
        ticket_id: parseInt(project.halopsa_ticket_id),
        note: noteContent,
        hiddenfromuser: true,
        outcome: 'note'
      }];

      const response = await fetch(`${apiBase}/Actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(actionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logSync(base44, 'push_task', 'Task', taskId, 'error', errorText);
        return Response.json({ error: 'Failed to add note to HaloPSA', details: errorText }, { status: 500 });
      }

      await logSync(base44, 'push_task', 'Task', taskId, 'success', `Added note to ticket #${project.halopsa_ticket_id}`);
      return Response.json({ success: true, message: 'Task synced to HaloPSA' });
    }

    // ACTION: Pull ticket updates from HaloPSA
    if (action === 'pullTicketUpdate') {
      if (!ticketId) {
        return Response.json({ error: 'Ticket ID required' }, { status: 400 });
      }

      const response = await fetch(`${apiBase}/Tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return Response.json({ error: 'Failed to fetch ticket from HaloPSA' }, { status: 500 });
      }

      const ticket = await response.json();

      // Find linked project
      const projects = await base44.asServiceRole.entities.Project.filter({ halopsa_ticket_id: String(ticketId) });
      const project = projects[0];

      if (!project) {
        return Response.json({ error: 'No project linked to this ticket' }, { status: 404 });
      }

      // Update project with ticket data
      const updates = {
        name: ticket.summary || project.name,
        description: ticket.details || project.description,
      };

      // Map status if available
      if (ticket.status_id && FIELD_MAPPING.statusMapping.haloToBase44[ticket.status_id]) {
        updates.status = FIELD_MAPPING.statusMapping.haloToBase44[ticket.status_id];
      }

      await base44.asServiceRole.entities.Project.update(project.id, updates);
      await logSync(base44, 'pull_ticket', 'Project', project.id, 'success', `Synced from ticket #${ticketId}`);

      return Response.json({ 
        success: true, 
        message: 'Project updated from HaloPSA',
        updates
      });
    }

    // ACTION: Full sync for a project
    if (action === 'fullSync') {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
      const project = projects[0];

      if (!project?.halopsa_ticket_id) {
        return Response.json({ error: 'Project not linked to HaloPSA' }, { status: 400 });
      }

      // Get ticket from HaloPSA
      const ticketResponse = await fetch(`${apiBase}/Tickets/${project.halopsa_ticket_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!ticketResponse.ok) {
        return Response.json({ error: 'Failed to fetch ticket' }, { status: 500 });
      }

      const ticket = await ticketResponse.json();

      // Get ticket actions/notes
      const actionsResponse = await fetch(`${apiBase}/Actions?ticket_id=${project.halopsa_ticket_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const actions = actionsResponse.ok ? await actionsResponse.json() : [];

      await logSync(base44, 'full_sync', 'Project', projectId, 'success', 
        `Synced ticket #${project.halopsa_ticket_id} with ${actions.length} actions`);

      return Response.json({
        success: true,
        ticket,
        actions,
        message: 'Full sync completed'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('HaloPSA Sync Error:', error);
    return Response.json({ 
      error: error.message, 
      stack: error.stack 
    }, { status: 500 });
  }
});