import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Base44-App-Id',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { proposalId, token, action = 'viewed', details = '' } = body;

    let proposal;
    if (token) {
      const proposals = await base44.asServiceRole.entities.Proposal.filter({ approval_token: token });
      proposal = proposals[0];
    } else if (proposalId) {
      const proposals = await base44.asServiceRole.entities.Proposal.filter({ id: proposalId });
      proposal = proposals[0];
    }

    if (!proposal) {
      return Response.json({ error: 'Proposal not found' }, { 
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Get IP Address
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    // Log activity
    await base44.asServiceRole.entities.ProposalActivity.create({
      proposal_id: proposal.id,
      action: action,
      actor_name: proposal.customer_name || 'Customer',
      actor_email: proposal.customer_email || '',
      ip_address: ip,
      details: details || `Proposal ${action} from ${ip}`
    });

    // Update proposal status based on action
    if (action === 'viewed' && proposal.status === 'sent') {
      await base44.asServiceRole.entities.Proposal.update(proposal.id, {
        status: 'viewed',
        viewed_date: new Date().toISOString()
      });
    } else if (action === 'approved') {
      await base44.asServiceRole.entities.Proposal.update(proposal.id, {
        status: 'approved',
        signed_date: new Date().toISOString()
      });
    } else if (action === 'rejected') {
      await base44.asServiceRole.entities.Proposal.update(proposal.id, {
        status: 'rejected'
      });
    } else if (action === 'changes_requested') {
      await base44.asServiceRole.entities.Proposal.update(proposal.id, {
        status: 'changes_requested',
        change_request_notes: details
      });
    }

    return Response.json({ 
      success: true, 
      proposal: { id: proposal.id, title: proposal.title, status: proposal.status } 
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
});