import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check API Key
    const apiKey = req.headers.get('x-gammastack-key');
    if (!apiKey) {
      return Response.json({ error: 'Missing API Key' }, { status: 401 });
    }

    const settings = await base44.asServiceRole.entities.IntegrationSettings.filter({ setting_key: 'main' });
    const config = settings[0];

    if (!config || config.gammastack_api_key !== apiKey) {
      return Response.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    if (req.method === 'GET') {
      return Response.json({ status: 'ok', message: 'GammaStack Receiver Ready' });
    }

    const body = await req.json();
    const { type, data } = body;

    // Handle different types of incoming data
    if (type === 'create_ticket') {
      // Example: Create a task from incoming ticket data
      await base44.asServiceRole.entities.Task.create({
        title: data.subject,
        description: data.description,
        status: 'todo',
        priority: 'medium',
        project_id: data.project_id || 'unassigned'
      });
      return Response.json({ success: true, message: 'Ticket created as Task' });
    }

    if (type === 'sync_customer') {
        // Handle customer sync
        // logic to update or create customer...
        return Response.json({ success: true, message: 'Customer synced' });
    }

    // Log the event if no specific handler
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'api_received',
      entity_type: 'api',
      entity_id: 'gammastack',
      details: `Received ${type} event from GammaStack API`,
      user_email: 'system@gammastack',
      user_name: 'GammaStack API'
    });

    return Response.json({ success: true, message: 'Event received' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});