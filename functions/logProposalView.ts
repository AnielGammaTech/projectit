import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const base44 = createClient({ 
    appId: Deno.env.get('BASE44_APP_ID'),
    serviceRoleToken: Deno.env.get('BASE44_SERVICE_ROLE_TOKEN')
  });

  if (req.method === 'POST') {
    const body = await req.json();
    const { token, action, signerName, signatureData } = body;

    const proposals = await base44.entities.Proposal.filter({ approval_token: token });
    const proposal = proposals[0];

    if (!proposal) {
      return Response.json({ error: 'Not found' }, { status: 404, headers });
    }

    if (action === 'fetch') {
      if (proposal.status === 'sent') {
        await base44.entities.Proposal.update(proposal.id, { status: 'viewed', viewed_date: new Date().toISOString() });
      }
      return Response.json({ p: proposal }, { headers });
    }

    if (action === 'approve') {
      await base44.entities.Proposal.update(proposal.id, {
        status: 'approved',
        signature_data: signatureData,
        signer_name: signerName,
        signed_date: new Date().toISOString()
      });
      return Response.json({ ok: true }, { headers });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400, headers });
  }

  // GET - redirect to ProposalApproval page
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('No token', { status: 400 });
  }

  // Get the origin from the request to build the redirect URL
  const origin = req.headers.get('origin') || url.origin.replace('/api/functions/logProposalView', '');
  const redirectUrl = `${origin}/ProposalApproval?token=${token}`;
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirectUrl,
      ...headers
    }
  });
});