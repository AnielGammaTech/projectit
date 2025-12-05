import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    if (req.method === 'POST') {
      const body = await req.json();
      const { token, action, signerName, signatureData, declineReason, changeNotes } = body;

      console.log('Webhook received:', { token, action });

      if (!token) {
        return Response.json({ error: 'Token required' }, { status: 400, headers });
      }

      // Fetch proposal by token
      const proposals = await base44.asServiceRole.entities.Proposal.filter({ approval_token: token });
      const proposal = proposals[0];

      if (!proposal) {
        return Response.json({ error: 'Proposal not found', token }, { status: 404, headers });
      }

      // Handle different actions
      if (action === 'viewed') {
        if (proposal.status === 'sent') {
          await base44.asServiceRole.entities.Proposal.update(proposal.id, { 
            status: 'viewed', 
            viewed_date: new Date().toISOString() 
          });
          await base44.asServiceRole.entities.ProposalActivity.create({
            proposal_id: proposal.id,
            action: 'viewed',
            actor_name: proposal.customer_name,
            details: 'Proposal viewed by customer'
          });
        }
        return Response.json({ success: true, status: 'viewed' }, { headers });
      }

      if (action === 'approved') {
        await base44.asServiceRole.entities.Proposal.update(proposal.id, {
          status: 'approved',
          signature_data: signatureData || null,
          signer_name: signerName || proposal.customer_name,
          signed_date: new Date().toISOString()
        });
        await base44.asServiceRole.entities.ProposalActivity.create({
          proposal_id: proposal.id,
          action: 'approved',
          actor_name: signerName || proposal.customer_name,
          details: `Proposal approved and signed by ${signerName || proposal.customer_name}`
        });
        return Response.json({ success: true, status: 'approved' }, { headers });
      }

      if (action === 'rejected' || action === 'declined') {
        await base44.asServiceRole.entities.Proposal.update(proposal.id, {
          status: 'rejected',
          change_request_notes: declineReason || 'Declined by customer'
        });
        await base44.asServiceRole.entities.ProposalActivity.create({
          proposal_id: proposal.id,
          action: 'rejected',
          actor_name: proposal.customer_name,
          details: declineReason || 'Declined by customer'
        });
        return Response.json({ success: true, status: 'rejected' }, { headers });
      }

      if (action === 'changes_requested') {
        await base44.asServiceRole.entities.Proposal.update(proposal.id, {
          status: 'changes_requested',
          change_request_notes: changeNotes || 'Customer requested changes'
        });
        await base44.asServiceRole.entities.ProposalActivity.create({
          proposal_id: proposal.id,
          action: 'changes_requested',
          actor_name: proposal.customer_name,
          details: changeNotes || 'Customer requested changes'
        });
        return Response.json({ success: true, status: 'changes_requested' }, { headers });
      }

      return Response.json({ error: 'Invalid action', received: action }, { status: 400, headers });
    }

    return Response.json({ 
      api: 'Proposal Webhook', 
      status: 'ready',
      usage: 'POST with { token, action, signerName?, signatureData?, declineReason?, changeNotes? }',
      actions: ['viewed', 'approved', 'rejected', 'declined', 'changes_requested']
    }, { headers });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500, headers });
  }
});