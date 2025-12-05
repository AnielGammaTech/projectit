Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Direct API access to proposals - no SDK auth needed for cross-app calls
  const APP_ID = Deno.env.get('BASE44_APP_ID');
  const API_KEY = Deno.env.get('PROPOSAL_API_KEY');
  const API_BASE = `https://app.base44.com/api/apps/${APP_ID}/entities`;

  if (!API_KEY) {
    return Response.json({ error: 'API key not configured' }, { status: 500, headers });
  }

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      const { token, action, signerName, signatureData, declineReason } = body;

      if (!token) {
        return Response.json({ error: 'Token required' }, { status: 400, headers });
      }

      // Fetch proposal by token using direct API
      const fetchRes = await fetch(`${API_BASE}/Proposal?filter=${encodeURIComponent(JSON.stringify({ approval_token: token }))}`, {
        headers: { 'api_key': API_KEY, 'Content-Type': 'application/json' }
      });
      const proposals = await fetchRes.json();
      const proposal = proposals[0];

      if (!proposal) {
        return Response.json({ error: 'Proposal not found' }, { status: 404, headers });
      }

      if (action === 'fetch') {
        // Update status to viewed if sent
        if (proposal.status === 'sent') {
          await fetch(`${API_BASE}/Proposal/${proposal.id}`, {
            method: 'PUT',
            headers: { 'api_key': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'viewed', viewed_date: new Date().toISOString() })
          });
          proposal.status = 'viewed';
        }
        
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
        
        await fetch(`${API_BASE}/Proposal/${proposal.id}`, {
          method: 'PUT',
          headers: { 'api_key': API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'approved',
            signature_data: signatureData,
            signer_name: signerName,
            signed_date: new Date().toISOString()
          })
        });

        // Log activity
        await fetch(`${API_BASE}/ProposalActivity`, {
          method: 'POST',
          headers: { 'api_key': API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposal_id: proposal.id,
            action: 'approved',
            actor_name: signerName,
            details: `Proposal approved and signed by ${signerName}`
          })
        });
        
        return Response.json({ success: true }, { headers });
      }

      if (action === 'decline') {
        await fetch(`${API_BASE}/Proposal/${proposal.id}`, {
          method: 'PUT',
          headers: { 'api_key': API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'rejected',
            change_request_notes: declineReason || 'Declined by customer'
          })
        });

        // Log activity
        await fetch(`${API_BASE}/ProposalActivity`, {
          method: 'POST',
          headers: { 'api_key': API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposal_id: proposal.id,
            action: 'rejected',
            actor_name: proposal.customer_name,
            details: declineReason || 'Declined by customer'
          })
        });
        
        return Response.json({ success: true }, { headers });
      }

      return Response.json({ error: 'Invalid action' }, { status: 400, headers });
    }

    return Response.json({ api: 'Proposal Approval API', status: 'ready' }, { headers });

  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500, headers });
  }
});