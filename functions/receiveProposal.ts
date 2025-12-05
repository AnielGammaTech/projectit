import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      const { action, token, proposal } = body;

      if (action === 'store' && token && proposal) {
        // Use service role to store the proposal
        const base44 = createClientFromRequest(req);
        
        // Check if proposal already exists
        const existing = await base44.asServiceRole.entities.Proposal.filter({ approval_token: token });
        
        if (existing.length > 0) {
          // Update existing proposal
          await base44.asServiceRole.entities.Proposal.update(existing[0].id, {
            ...proposal,
            approval_token: token
          });
          return Response.json({ success: true, action: 'updated' }, { headers });
        } else {
          // Create new proposal
          await base44.asServiceRole.entities.Proposal.create({
            ...proposal,
            approval_token: token
          });
          return Response.json({ success: true, action: 'created' }, { headers });
        }
      }

      return Response.json({ error: 'Invalid request. Required: action=store, token, proposal' }, { status: 400, headers });
    }

    return Response.json({ api: 'Receive Proposal API', status: 'ready' }, { headers });

  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500, headers });
  }
});