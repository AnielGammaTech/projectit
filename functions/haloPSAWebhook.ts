import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Field mapping for HaloPSA -> Base44
const STATUS_MAPPING = {
  1: 'planning',   // New
  2: 'planning',   // In Progress  
  23: 'on_hold',   // On Hold
  9: 'completed',  // Closed
  10: 'completed', // Resolved
};

Deno.serve(async (req) => {
  try {
    // For webhook, we use service role since no user auth
    const base44 = createClientFromRequest(req);
    
    // Verify webhook authenticity using a shared secret
    const webhookSecret = Deno.env.get("HALOPSA_WEBHOOK_SECRET");
    const providedSecret = req.headers.get('X-Webhook-Secret') || 
                          new URL(req.url).searchParams.get('secret');
    
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error('Webhook authentication failed');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Log incoming webhook for debugging
    console.log('HaloPSA Webhook received:', JSON.stringify(body, null, 2));

    const { 
      event_type,
      ticket_id,
      ticket,
      action_id,
      action
    } = body;

    // Handle ticket update events
    if (event_type === 'ticket.updated' || event_type === 'ticket.created') {
      const ticketData = ticket || body;
      const ticketIdToFind = ticket_id || ticketData?.id;

      if (!ticketIdToFind) {
        console.log('No ticket ID in webhook payload');
        return Response.json({ success: true, message: 'No ticket ID to process' });
      }

      // Find linked project
      const projects = await base44.asServiceRole.entities.Project.filter({ 
        halopsa_ticket_id: String(ticketIdToFind) 
      });
      
      if (projects.length === 0) {
        console.log(`No project linked to ticket #${ticketIdToFind}`);
        return Response.json({ success: true, message: 'No linked project found' });
      }

      const project = projects[0];
      const updates = {};

      // Update project name if ticket summary changed
      if (ticketData.summary && ticketData.summary !== project.name) {
        updates.name = ticketData.summary;
      }

      // Update description if details changed
      if (ticketData.details && ticketData.details !== project.description) {
        updates.description = ticketData.details;
      }

      // Update status based on mapping
      if (ticketData.status_id && STATUS_MAPPING[ticketData.status_id]) {
        const newStatus = STATUS_MAPPING[ticketData.status_id];
        if (newStatus !== project.status) {
          updates.status = newStatus;
        }
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Project.update(project.id, updates);
        
        // Log the sync activity
        await base44.asServiceRole.entities.ProjectActivity.create({
          project_id: project.id,
          action: 'halopsa_sync',
          description: `Project updated from HaloPSA ticket #${ticketIdToFind}`,
          actor_email: 'system@halopsa',
          actor_name: 'HaloPSA Sync'
        });

        // Also log to audit
        await base44.asServiceRole.entities.AuditLog.create({
          action: 'halopsa_webhook_update',
          action_category: 'project',
          entity_type: 'Project',
          entity_id: project.id,
          entity_name: project.name,
          user_email: 'system@halopsa',
          user_name: 'HaloPSA Webhook',
          details: `Updated fields: ${Object.keys(updates).join(', ')}`,
          changes: updates
        });

        console.log(`Updated project ${project.id} with:`, updates);
      }

      return Response.json({ 
        success: true, 
        message: 'Ticket update processed',
        projectId: project.id,
        updates
      });
    }

    // Handle action/note events
    if (event_type === 'action.created' && action) {
      const ticketIdToFind = action.ticket_id;

      if (!ticketIdToFind) {
        return Response.json({ success: true, message: 'No ticket ID in action' });
      }

      // Find linked project
      const projects = await base44.asServiceRole.entities.Project.filter({ 
        halopsa_ticket_id: String(ticketIdToFind) 
      });

      if (projects.length === 0) {
        return Response.json({ success: true, message: 'No linked project found' });
      }

      const project = projects[0];

      // Create a project note from HaloPSA action
      if (action.note && !action.hiddenfromuser) {
        await base44.asServiceRole.entities.ProjectNote.create({
          project_id: project.id,
          type: 'message',
          title: `HaloPSA Note`,
          content: action.note,
          author_email: 'system@halopsa',
          author_name: action.who || 'HaloPSA'
        });

        // Log activity
        await base44.asServiceRole.entities.ProjectActivity.create({
          project_id: project.id,
          action: 'note_added',
          description: `Note synced from HaloPSA ticket #${ticketIdToFind}`,
          actor_email: 'system@halopsa',
          actor_name: action.who || 'HaloPSA'
        });
      }

      return Response.json({ 
        success: true, 
        message: 'Action processed'
      });
    }

    // Handle ticket closed/resolved
    if (event_type === 'ticket.closed' || event_type === 'ticket.resolved') {
      const ticketIdToFind = ticket_id || ticket?.id;

      if (ticketIdToFind) {
        const projects = await base44.asServiceRole.entities.Project.filter({ 
          halopsa_ticket_id: String(ticketIdToFind) 
        });

        if (projects.length > 0) {
          const project = projects[0];
          await base44.asServiceRole.entities.Project.update(project.id, {
            status: 'completed'
          });

          await base44.asServiceRole.entities.ProjectActivity.create({
            project_id: project.id,
            action: 'project_status_change',
            description: `Project marked complete (HaloPSA ticket #${ticketIdToFind} closed)`,
            actor_email: 'system@halopsa',
            actor_name: 'HaloPSA Sync'
          });
        }
      }

      return Response.json({ success: true, message: 'Ticket closure processed' });
    }

    // Unknown event type - still return success to prevent retries
    console.log('Unhandled webhook event type:', event_type);
    return Response.json({ 
      success: true, 
      message: `Event type '${event_type}' not handled` 
    });

  } catch (error) {
    console.error('HaloPSA Webhook Error:', error);
    
    // Return 200 even on error to prevent webhook retries
    // Log the error for debugging
    return Response.json({ 
      success: false,
      error: error.message
    }, { status: 200 });
  }
});