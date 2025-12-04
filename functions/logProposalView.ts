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

  try {
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
        return new Response(renderErrorPage('Missing Token', 'No proposal token was provided.'), {
          headers: { 'Content-Type': 'text/html' }
        });
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

    // Handle POST request
    const body = await req.json();
    const { proposalId, token, action = 'viewed', details = '', signerName, signatureData } = body;

    // Handle fetch action - return proposal data for public view
    if (action === 'fetch' && token) {
      const proposals = await base44.entities.Proposal.filter({ approval_token: token });
      const proposal = proposals[0];
      
      if (!proposal) {
        return Response.json({ error: 'Proposal not found' }, { status: 404, headers: corsHeaders });
      }
      
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
    // For GET requests, return HTML error page
    if (req.method === 'GET') {
      return new Response(renderErrorPage('Error', error.message || 'An unexpected error occurred.'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    // For POST requests, return JSON error
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});

function renderErrorPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
    <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.27 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
    </svg>
    <h1 class="text-xl font-bold text-slate-900 mb-2">${title}</h1>
    <p class="text-slate-500">${message}</p>
  </div>
</body>
</html>`;
}

function renderProposalPage(proposal, token, baseUrl) {
  const apiUrl = baseUrl.split('?')[0];
  
  if (proposal.status === 'approved') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Approved</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"></head><body class="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div class="bg-white rounded-xl shadow p-8 text-center max-w-md"><div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></div><h1 class="text-2xl font-bold mb-2">Proposal Approved!</h1><p class="text-gray-500">Thank you. We'll be in touch shortly.</p>${proposal.signer_name ? `<p class="text-sm text-gray-400 mt-2">Signed by ${proposal.signer_name}</p>` : ''}</div></body></html>`;
  }

  if (proposal.status === 'rejected') {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Declined</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"></head><body class="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div class="bg-white rounded-xl shadow p-8 text-center max-w-md"><h1 class="text-xl font-bold mb-2">Proposal Declined</h1><p class="text-gray-500">This proposal has been declined.</p></div></body></html>`;
  }

  const items = (proposal.items || []).slice(0, 20);
  const itemsHtml = items.map(i => `<div class="flex justify-between py-2 border-b"><div><p class="font-medium">${(i.name||'').substring(0,50)}</p><p class="text-sm text-gray-500">${i.quantity||0} x $${(i.unit_price||0).toFixed(2)}</p></div><p class="font-semibold">$${((i.quantity||0)*(i.unit_price||0)).toFixed(2)}</p></div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${(proposal.title||'Proposal').substring(0,30)}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"></head><body class="bg-gray-50 py-6 px-4"><div class="max-w-2xl mx-auto"><div class="bg-white rounded-xl shadow mb-4"><div class="bg-blue-900 text-white p-4 rounded-t-xl"><p class="text-sm opacity-80">${proposal.proposal_number||''}</p><h1 class="text-xl font-bold">${(proposal.title||'Proposal').substring(0,50)}</h1></div><div class="p-4 grid grid-cols-2 gap-4 text-sm"><div><p class="text-gray-400">Prepared For</p><p class="font-medium">${(proposal.customer_name||'').substring(0,30)}</p></div><div class="text-right"><p class="text-gray-400">Valid Until</p><p class="font-medium">${proposal.valid_until?new Date(proposal.valid_until).toLocaleDateString():'N/A'}</p></div></div></div><div class="bg-white rounded-xl shadow p-4 mb-4"><h2 class="font-semibold mb-3">Items</h2>${itemsHtml||'<p class="text-gray-400">No items</p>'}<div class="mt-3 pt-3 border-t flex justify-between text-xl font-bold"><span>Total</span><span class="text-blue-600">$${(proposal.total||0).toFixed(2)}</span></div></div><div class="bg-white rounded-xl shadow p-4"><h2 class="font-semibold mb-3">Approve & Sign</h2><form id="f"><input type="text" id="n" required class="w-full p-2 border rounded mb-3" placeholder="Your full name"><div class="border rounded mb-3"><canvas id="c" class="w-full h-24"></canvas></div><button type="button" onclick="clearSig()" class="text-sm text-gray-500 mb-3">Clear</button><label class="flex items-start gap-2 mb-3"><input type="checkbox" id="a" required class="mt-1"><span class="text-sm">I agree to the terms and authorize work to proceed.</span></label><button type="submit" id="b" class="w-full bg-blue-600 text-white p-3 rounded font-medium">Approve Proposal</button></form></div></div><script>const c=document.getElementById('c'),x=c.getContext('2d');let d=false;function r(){c.width=c.offsetWidth*2;c.height=c.offsetHeight*2;x.scale(2,2);x.lineCap='round';x.strokeStyle='#333';x.lineWidth=2}r();function g(e){const t=c.getBoundingClientRect();return{x:(e.touches?e.touches[0].clientX:e.clientX)-t.left,y:(e.touches?e.touches[0].clientY:e.clientY)-t.top}}c.onmousedown=c.ontouchstart=e=>{e.preventDefault();d=true;x.beginPath();const p=g(e);x.moveTo(p.x,p.y)};c.onmousemove=c.ontouchmove=e=>{if(!d)return;e.preventDefault();const p=g(e);x.lineTo(p.x,p.y);x.stroke()};c.onmouseup=c.onmouseleave=c.ontouchend=()=>d=false;function clearSig(){x.clearRect(0,0,c.width,c.height)}document.getElementById('f').onsubmit=async e=>{e.preventDefault();const b=document.getElementById('b');b.disabled=true;b.textContent='Submitting...';try{const r=await fetch('${apiUrl}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'${token}',action:'approved',signerName:document.getElementById('n').value,signatureData:c.toDataURL()})});const j=await r.json();if(j.success)location.reload();else{alert(j.error||'Error');b.disabled=false;b.textContent='Approve Proposal'}}catch(err){alert(err.message);b.disabled=false;b.textContent='Approve Proposal'}}</script></body></html>`;
}