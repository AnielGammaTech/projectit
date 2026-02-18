import entityService from '../../services/entityService.js';
import emailService from '../../services/emailService.js';

// Field mapping for HaloPSA -> Base44
const STATUS_MAPPING = {
  1: 'planning',
  2: 'planning',
  23: 'on_hold',
  9: 'completed',
  10: 'completed',
};

export default async function handler(req, res) {
  try {
    // Verify webhook authenticity using a shared secret
    const webhookSecret = process.env.HALOPSA_WEBHOOK_SECRET;
    const providedSecret = req.headers['x-webhook-secret'] || req.query?.secret;

    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error('Webhook authentication failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body;

    // Log incoming webhook for debugging
    console.log('HaloPSA Webhook received:', JSON.stringify(body, null, 2));

    const {
      event_type,
      ticket_id,
      ticket,
      action_id,
      action,
    } = body;

    // Handle ticket update events
    if (event_type === 'ticket.updated' || event_type === 'ticket.created') {
      const ticketData = ticket || body;
      const ticketIdToFind = ticket_id || ticketData?.id;

      if (!ticketIdToFind) {
        console.log('No ticket ID in webhook payload');
        return res.json({ success: true, message: 'No ticket ID to process' });
      }

      // Find linked project
      const projects = await entityService.filter('Project', {
        halopsa_ticket_id: String(ticketIdToFind),
      });

      if (projects.length === 0) {
        console.log(`No project linked to ticket #${ticketIdToFind}`);
        return res.json({ success: true, message: 'No linked project found' });
      }

      const project = projects[0];
      const updates = {};

      if (ticketData.summary && ticketData.summary !== project.name) {
        updates.name = ticketData.summary;
      }

      if (ticketData.details && ticketData.details !== project.description) {
        updates.description = ticketData.details;
      }

      if (ticketData.status_id && STATUS_MAPPING[ticketData.status_id]) {
        const newStatus = STATUS_MAPPING[ticketData.status_id];
        if (newStatus !== project.status) {
          updates.status = newStatus;
        }
      }

      if (Object.keys(updates).length > 0) {
        await entityService.update('Project', project.id, updates);

        await entityService.create('ProjectActivity', {
          project_id: project.id,
          action: 'halopsa_sync',
          description: `Project updated from HaloPSA ticket #${ticketIdToFind}`,
          actor_email: 'system@halopsa',
          actor_name: 'HaloPSA Sync',
        });

        await entityService.create('AuditLog', {
          action: 'halopsa_webhook_update',
          action_category: 'project',
          entity_type: 'Project',
          entity_id: project.id,
          entity_name: project.name,
          user_email: 'system@halopsa',
          user_name: 'HaloPSA Webhook',
          details: `Updated fields: ${Object.keys(updates).join(', ')}`,
          changes: updates,
        });

        console.log(`Updated project ${project.id} with:`, updates);
      }

      return res.json({
        success: true,
        message: 'Ticket update processed',
        projectId: project.id,
        updates,
      });
    }

    // Handle action/note events
    if (event_type === 'action.created' && action) {
      const ticketIdToFind = action.ticket_id;

      if (!ticketIdToFind) {
        return res.json({ success: true, message: 'No ticket ID in action' });
      }

      const projects = await entityService.filter('Project', {
        halopsa_ticket_id: String(ticketIdToFind),
      });

      if (projects.length === 0) {
        return res.json({ success: true, message: 'No linked project found' });
      }

      const project = projects[0];

      if (action.note && !action.hiddenfromuser) {
        await entityService.create('ProjectNote', {
          project_id: project.id,
          type: 'message',
          title: 'HaloPSA Note',
          content: action.note,
          author_email: 'system@halopsa',
          author_name: action.who || 'HaloPSA',
        });

        await entityService.create('ProjectActivity', {
          project_id: project.id,
          action: 'note_added',
          description: `Note synced from HaloPSA ticket #${ticketIdToFind}`,
          actor_email: 'system@halopsa',
          actor_name: action.who || 'HaloPSA',
        });
      }

      return res.json({
        success: true,
        message: 'Action processed',
      });
    }

    // Handle ticket closed/resolved
    if (event_type === 'ticket.closed' || event_type === 'ticket.resolved') {
      const ticketIdToFind = ticket_id || ticket?.id;

      if (ticketIdToFind) {
        const projects = await entityService.filter('Project', {
          halopsa_ticket_id: String(ticketIdToFind),
        });

        if (projects.length > 0) {
          const project = projects[0];
          await entityService.update('Project', project.id, {
            status: 'completed',
          });

          await entityService.create('ProjectActivity', {
            project_id: project.id,
            action: 'project_status_change',
            description: `Project marked complete (HaloPSA ticket #${ticketIdToFind} closed)`,
            actor_email: 'system@halopsa',
            actor_name: 'HaloPSA Sync',
          });
        }
      }

      return res.json({ success: true, message: 'Ticket closure processed' });
    }

    // Unknown event type - still return success to prevent retries
    console.log('Unhandled webhook event type:', event_type);
    return res.json({
      success: true,
      message: `Event type '${event_type}' not handled`,
    });
  } catch (error) {
    console.error('HaloPSA Webhook Error:', error);

    // Return 200 even on error to prevent webhook retries
    return res.status(200).json({
      success: false,
      error: error.message,
    });
  }
}
