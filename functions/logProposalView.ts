import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const { proposalId, token, action = 'viewed', details = '' } = await req.json();

    let proposal;
    if (token) {
      const proposals = await base44.asServiceRole.entities.Proposal.filter({ approval_token: token });
      proposal = proposals[0];
    } else if (proposalId) {
      const proposals = await base44.asServiceRole.entities.Proposal.filter({ id: proposalId });
      proposal = proposals[0];
    }

    if (!proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Get IP Address
    const ip = req.headers.get("x-forwarded-for") || req.remoteAddr?.hostname || "unknown";

    // Log activity
    await base44.asServiceRole.entities.ProposalActivity.create({
      proposal_id: proposal.id,
      action: action,
      actor_name: 'Customer', // Assuming this is called from public view
      ip_address: ip,
      details: details || `Proposal viewed from ${ip}`,
      created_date: new Date().toISOString()
    });

    // Update proposal status if first view
    if (action === 'viewed' && proposal.status === 'sent') {
      await base44.asServiceRole.entities.Proposal.update(proposal.id, {
        status: 'viewed',
        viewed_date: new Date().toISOString()
      });
    }

    return Response.json({ success: true, proposal: { id: proposal.id, title: proposal.title } });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});