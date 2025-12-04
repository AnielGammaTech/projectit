import { createClient } from 'npm:@base44/sdk@0.8.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Base44-App-Id',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Create service role client - this function is public for proposal approvals
  const base44 = createClient({ 
    appId: Deno.env.get('BASE44_APP_ID'),
    serviceRoleToken: Deno.env.get('BASE44_SERVICE_ROLE_TOKEN')
  });

  // Handle GET request - serve HTML page
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response('Missing token', { status: 400 });
    }

    const proposals = await base44.entities.Proposal.filter({ approval_token: token });
    const proposal = proposals[0];

    if (!proposal) {
      return new Response(renderErrorPage('Proposal Not Found', 'This proposal link is invalid or has expired.'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Mark as viewed if sent
    if (proposal.status === 'sent') {
      await base44.entities.Proposal.update(proposal.id, {
        status: 'viewed',
        viewed_date: new Date().toISOString()
      });
      await base44.entities.ProposalActivity.create({
        proposal_id: proposal.id,
        action: 'viewed',
        actor_name: proposal.customer_name || 'Customer',
        details: 'Proposal viewed by customer'
      });
    }

    return new Response(renderProposalPage(proposal, token, req.url), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  try {
    const body = await req.json();
    const { proposalId, token, action = 'viewed', details = '', signerName, signatureData } = body;

    // Handle fetch action - return proposal data for public view
    if (action === 'fetch' && token) {
      const proposals = await base44.entities.Proposal.filter({ approval_token: token });
      const proposal = proposals[0];
      
      if (!proposal) {
        return Response.json({ error: 'Proposal not found' }, { status: 404, headers: corsHeaders });
      }
      
      // Return proposal data (excluding sensitive internal data)
      return Response.json({ 
        proposal: {
          id: proposal.id,
          proposal_number: proposal.proposal_number,
          title: proposal.title,
          customer_name: proposal.customer_name,
          customer_company: proposal.customer_company,
          customer_email: proposal.customer_email,
          status: proposal.status,
          items: proposal.items,
          areas: proposal.areas,
          subtotal: proposal.subtotal,
          tax_total: proposal.tax_total,
          total: proposal.total,
          terms_conditions: proposal.terms_conditions,
          valid_until: proposal.valid_until,
          signature_data: proposal.signature_data,
          signer_name: proposal.signer_name,
          signed_date: proposal.signed_date
        }
      }, { headers: corsHeaders });
    }

    let proposal;
    if (token) {
      const proposals = await base44.entities.Proposal.filter({ approval_token: token });
      proposal = proposals[0];
    } else if (proposalId) {
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      proposal = proposals[0];
    }

    if (!proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404, headers: corsHeaders });
    }

    // Get IP Address
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    // Log activity
    await base44.entities.ProposalActivity.create({
      proposal_id: proposal.id,
      action: action,
      actor_name: signerName || proposal.customer_name || 'Customer',
      actor_email: proposal.customer_email || '',
      ip_address: ip,
      details: details || `Proposal ${action} from ${ip}`
    });

    // Update proposal status based on action
    if (action === 'viewed' && proposal.status === 'sent') {
      await base44.entities.Proposal.update(proposal.id, {
        status: 'viewed',
        viewed_date: new Date().toISOString()
      });
    } else if (action === 'approved') {
      await base44.entities.Proposal.update(proposal.id, {
        status: 'approved',
        signature_data: signatureData || null,
        signer_name: signerName || proposal.customer_name,
        signed_date: new Date().toISOString()
      });
    } else if (action === 'rejected') {
      await base44.entities.Proposal.update(proposal.id, {
        status: 'rejected'
      });
    } else if (action === 'changes_requested') {
      await base44.entities.Proposal.update(proposal.id, {
        status: 'changes_requested',
        change_request_notes: details
      });
    }

    return Response.json({ 
      success: true, 
      proposal: { id: proposal.id, title: proposal.title, status: proposal.status } 
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});