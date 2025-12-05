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
    const base44 = createClientFromRequest(req);

    if (req.method === 'POST') {
      const body = await req.json();
      const { token, action, signerName, signatureData, declineReason } = body;

      if (!token) {
        return Response.json({ error: 'Token required' }, { status: 400, headers });
      }

      const proposals = await base44.asServiceRole.entities.Proposal.filter({ approval_token: token });
      const proposal = proposals[0];

      if (!proposal) {
        return Response.json({ error: 'Proposal not found', token }, { status: 404, headers });
      }

      if (action === 'fetch') {
        // Update status to viewed if sent
        if (proposal.status === 'sent') {
          await base44.asServiceRole.entities.Proposal.update(proposal.id, { 
            status: 'viewed', 
            viewed_date: new Date().toISOString() 
          });
          proposal.status = 'viewed';
        }
        
        // Return proposal data (sanitized for customer view)
        return Response.json({ 
          success: true,
          proposal: {
            id: proposal.id,
            proposal_number: proposal.proposal_number,
            title: proposal.title,
            customer_name: proposal.customer_name,
            customer_company: proposal.customer_company,
            items: proposal.items || [],
            areas: proposal.areas || [],
            subtotal: proposal.subtotal,
            tax_total: proposal.tax_total,
            total: proposal.total,
            terms_conditions: proposal.terms_conditions,
            valid_until: proposal.valid_until,
            status: proposal.status,
            signer_name: proposal.signer_name,
            signed_date: proposal.signed_date
          }
        }, { headers });
      }

      if (action === 'approve') {
        if (!signerName) {
          return Response.json({ error: 'Signer name required' }, { status: 400, headers });
        }
        
        await base44.asServiceRole.entities.Proposal.update(proposal.id, {
          status: 'approved',
          signature_data: signatureData,
          signer_name: signerName,
          signed_date: new Date().toISOString()
        });
        
        // Log activity
        await base44.asServiceRole.entities.ProposalActivity.create({
          proposal_id: proposal.id,
          action: 'approved',
          actor_name: signerName,
          details: `Proposal approved and signed by ${signerName}`
        });
        
        return Response.json({ success: true }, { headers });
      }

      if (action === 'decline') {
        await base44.entities.Proposal.update(proposal.id, {
          status: 'rejected',
          change_request_notes: declineReason || 'Declined by customer'
        });
        
        // Log activity
        await base44.entities.ProposalActivity.create({
          proposal_id: proposal.id,
          action: 'rejected',
          actor_name: proposal.customer_name,
          details: declineReason || 'Declined by customer'
        });
        
        return Response.json({ success: true }, { headers });
      }

      return Response.json({ error: 'Invalid action' }, { status: 400, headers });
    }

    // GET requests - return API info
    return Response.json({ 
      api: 'Proposal Approval API',
      usage: 'POST with {token, action: "fetch|approve|decline"}',
      actions: {
        fetch: 'Get proposal data',
        approve: 'Approve proposal (requires signerName, signatureData)',
        decline: 'Decline proposal (optional declineReason)'
      }
    }, { headers });

  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500, headers });
  }
});