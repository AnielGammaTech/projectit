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
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal Approved</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
    <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </div>
    <h1 class="text-2xl font-bold text-slate-900 mb-2">Proposal Approved!</h1>
    <p class="text-slate-500 mb-4">Thank you for approving this proposal. We'll be in touch shortly.</p>
    ${proposal.signer_name ? `<p class="text-sm text-slate-400">Signed by ${proposal.signer_name}</p>` : ''}
  </div>
</body>
</html>`;
  }

  if (proposal.status === 'rejected') {
    return renderErrorPage('Proposal Declined', 'This proposal has been declined.');
  }

  const itemsHtml = (proposal.items || []).map(item => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    return `<div class="flex justify-between items-start py-3 border-b border-slate-100 last:border-0">
      <div class="flex-1">
        <p class="font-medium text-slate-900">${item.name || ''}</p>
        ${item.description ? `<p class="text-sm text-slate-500">${item.description}</p>` : ''}
        <p class="text-xs text-slate-400 mt-1">${item.quantity || 0} × $${(item.unit_price || 0).toFixed(2)}</p>
      </div>
      <p class="font-semibold text-slate-900">$${lineTotal.toFixed(2)}</p>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal - ${proposal.title || 'Review'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-slate-50 py-8 px-4">
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
      <div class="bg-[#133F5C] text-white p-6">
        <div class="flex items-center gap-3 mb-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span class="text-sm opacity-80">${proposal.proposal_number || ''}</span>
        </div>
        <h1 class="text-2xl font-bold">${proposal.title || 'Proposal'}</h1>
      </div>
      <div class="p-6 border-b border-slate-100">
        <div class="grid grid-cols-2 gap-6">
          <div>
            <p class="text-xs text-slate-400 uppercase mb-1">Prepared For</p>
            <p class="font-medium text-slate-900">${proposal.customer_name || ''}</p>
            ${proposal.customer_company ? `<p class="text-sm text-slate-500">${proposal.customer_company}</p>` : ''}
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-400 uppercase mb-1">Valid Until</p>
            <p class="font-medium text-slate-900">${proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No expiration'}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Line Items -->
    <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h2 class="font-semibold text-slate-900 mb-4">Items & Services</h2>
      <div class="space-y-3">${itemsHtml}</div>
      <div class="mt-4 pt-4 border-t border-slate-200">
        <div class="flex justify-between text-2xl font-bold">
          <span>Total</span>
          <span class="text-[#0069AF]">$${(proposal.total || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>

    ${proposal.terms_conditions ? `
    <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h2 class="font-semibold text-slate-900 mb-3">Terms & Conditions</h2>
      <p class="text-sm text-slate-600 whitespace-pre-wrap">${proposal.terms_conditions}</p>
    </div>` : ''}

    <!-- Signature Section -->
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h2 class="font-semibold text-slate-900 mb-4">Approve & Sign</h2>
      <form id="approvalForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Your Full Name</label>
          <input type="text" id="signerName" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter your full name">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Signature</label>
          <div class="border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
            <canvas id="signatureCanvas" class="w-full h-32 cursor-crosshair touch-none"></canvas>
          </div>
          <button type="button" onclick="clearSignature()" class="mt-1 text-sm text-slate-500 hover:text-slate-700">Clear Signature</button>
        </div>
        <label class="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" id="agreed" required class="mt-0.5 w-4 h-4 text-blue-600 rounded">
          <span class="text-sm text-slate-600">I agree to the terms and conditions outlined in this proposal and authorize the work to proceed.</span>
        </label>
        <button type="submit" id="submitBtn" class="w-full bg-[#0069AF] hover:bg-[#133F5C] text-white h-12 text-lg font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Approve Proposal
        </button>
      </form>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      return { x, y };
    }

    canvas.addEventListener('mousedown', (e) => { isDrawing = true; ctx.beginPath(); const pos = getPos(e); ctx.moveTo(pos.x, pos.y); });
    canvas.addEventListener('mousemove', (e) => { if (!isDrawing) return; const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); });
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseleave', () => isDrawing = false);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing = true; ctx.beginPath(); const pos = getPos(e); ctx.moveTo(pos.x, pos.y); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!isDrawing) return; const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); });
    canvas.addEventListener('touchend', () => isDrawing = false);

    function clearSignature() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    document.getElementById('approvalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Submitting...';

      try {
        const response = await fetch('${apiUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: '${token}',
            action: 'approved',
            signerName: document.getElementById('signerName').value,
            signatureData: canvas.toDataURL(),
            details: 'Approved and signed by ' + document.getElementById('signerName').value
          })
        });
        const data = await response.json();
        if (data.success) {
          location.reload();
        } else {
          alert('Error: ' + (data.error || 'Failed to submit'));
          btn.disabled = false;
          btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Approve Proposal';
        }
      } catch (err) {
        alert('Error submitting: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Approve Proposal';
      }
    });
  </script>
</body>
</html>`;
}