import entityService from '../../services/entityService.js';
import { getHaloPSAConfig, getHaloPSAToken } from '../../services/halopsaService.js';

// Status mapping between ProjectIT and HaloPSA
const FIELD_MAPPING = {
  statusMapping: {
    projectitToHalo: {
      'planning': 1,
      'on_hold': 23,
      'completed': 9,
    },
    haloToProjectit: {
      1: 'planning',
      2: 'planning',
      23: 'on_hold',
      9: 'completed',
    },
  },
};

async function logSync(operation, entityType, entityId, status, details) {
  try {
    await entityService.create('AuditLog', {
      action: `halopsa_sync_${operation}`,
      action_category: 'project',
      entity_type: entityType,
      entity_id: entityId,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      user_email: 'system@halopsa-sync',
      user_name: 'HaloPSA Sync',
    });
  } catch (e) {
    console.error('Failed to log sync:', e);
  }
}

export default async function handler(req, res) {
  try {
    const { action, projectId, taskId, ticketId, data: updateData } = req.body;

    // Get HaloPSA config from DB (falls back to env vars)
    const config = await getHaloPSAConfig();
    const { apiUrl, apiBaseUrl: apiBase } = config;
    const accessToken = await getHaloPSAToken(config);

    // ACTION: Push project updates to HaloPSA
    if (action === 'pushProjectUpdate') {
      const projects = await entityService.filter('Project', { id: projectId });
      const project = projects[0];

      if (!project || !project.halopsa_ticket_id) {
        return res.status(400).json({ error: 'Project not linked to HaloPSA ticket' });
      }

      const ticketUpdate = [{
        id: parseInt(project.halopsa_ticket_id),
        summary: project.name,
        details: project.description || '',
      }];

      if (project.status && FIELD_MAPPING.statusMapping.projectitToHalo[project.status]) {
        ticketUpdate[0].status_id = FIELD_MAPPING.statusMapping.projectitToHalo[project.status];
      }

      const response = await fetch(`${apiBase}/Tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketUpdate),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logSync('push_project', 'Project', projectId, 'error', errorText);
        return res.status(500).json({ error: 'Failed to update HaloPSA ticket', details: errorText });
      }

      await logSync('push_project', 'Project', projectId, 'success', `Updated ticket #${project.halopsa_ticket_id}`);
      return res.json({ success: true, message: 'Project synced to HaloPSA' });
    }

    // ACTION: Push task update as note to HaloPSA
    if (action === 'pushTaskUpdate') {
      const tasks = await entityService.filter('Task', { id: taskId });
      const task = tasks[0];

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const projects = await entityService.filter('Project', { id: task.project_id });
      const project = projects[0];

      if (!project?.halopsa_ticket_id) {
        return res.status(400).json({ error: 'Project not linked to HaloPSA' });
      }

      const noteContent = `[Task Update] ${task.title}\nStatus: ${task.status}\nAssigned: ${task.assigned_name || 'Unassigned'}\n${task.description || ''}`;

      const actionData = [{
        ticket_id: parseInt(project.halopsa_ticket_id),
        note: noteContent,
        hiddenfromuser: true,
        outcome: 'note',
      }];

      const response = await fetch(`${apiBase}/Actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logSync('push_task', 'Task', taskId, 'error', errorText);
        return res.status(500).json({ error: 'Failed to add note to HaloPSA', details: errorText });
      }

      await logSync('push_task', 'Task', taskId, 'success', `Added note to ticket #${project.halopsa_ticket_id}`);
      return res.json({ success: true, message: 'Task synced to HaloPSA' });
    }

    // ACTION: Pull ticket updates from HaloPSA
    if (action === 'pullTicketUpdate') {
      if (!ticketId) {
        return res.status(400).json({ error: 'Ticket ID required' });
      }

      const response = await fetch(`${apiBase}/Tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to fetch ticket from HaloPSA' });
      }

      const ticket = await response.json();

      // Find linked project
      const projects = await entityService.filter('Project', { halopsa_ticket_id: String(ticketId) });
      const project = projects[0];

      if (!project) {
        return res.status(404).json({ error: 'No project linked to this ticket' });
      }

      // Update project with ticket data
      const updates = {
        name: ticket.summary || project.name,
        description: ticket.details || project.description,
      };

      if (ticket.status_id && FIELD_MAPPING.statusMapping.haloToProjectit[ticket.status_id]) {
        updates.status = FIELD_MAPPING.statusMapping.haloToProjectit[ticket.status_id];
      }

      await entityService.update('Project', project.id, updates);
      await logSync('pull_ticket', 'Project', project.id, 'success', `Synced from ticket #${ticketId}`);

      return res.json({
        success: true,
        message: 'Project updated from HaloPSA',
        updates,
      });
    }

    // ACTION: Full sync for a project
    if (action === 'fullSync') {
      const projects = await entityService.filter('Project', { id: projectId });
      const project = projects[0];

      if (!project?.halopsa_ticket_id) {
        return res.status(400).json({ error: 'Project not linked to HaloPSA' });
      }

      const ticketResponse = await fetch(`${apiBase}/Tickets/${project.halopsa_ticket_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!ticketResponse.ok) {
        return res.status(500).json({ error: 'Failed to fetch ticket' });
      }

      const ticket = await ticketResponse.json();

      const actionsResponse = await fetch(`${apiBase}/Actions?ticket_id=${project.halopsa_ticket_id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const actions = actionsResponse.ok ? await actionsResponse.json() : [];

      await logSync('full_sync', 'Project', projectId, 'success',
        `Synced ticket #${project.halopsa_ticket_id} with ${actions.length} actions`);

      return res.json({
        success: true,
        ticket,
        actions,
        message: 'Full sync completed',
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('HaloPSA Sync Error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
}
