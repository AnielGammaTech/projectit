import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const { token, action, signerName, signatureData, declineReason } = body;

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400, headers });
    }

    const proposals = await base44.entities.Proposal.filter({ approval_token: token });
    const proposal = proposals[0];

    if (!proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404, headers });
    }

    if (action === 'fetch') {
      // Update status to viewed if sent
      if (proposal.status === 'sent') {
        await base44.entities.Proposal.update(proposal.id, { 
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
      
      await base44.entities.Proposal.update(proposal.id, {
        status: 'approved',
        signature_data: signatureData,
        signer_name: signerName,
        signed_date: new Date().toISOString()
      });
      
      // Log activity
      await base44.entities.ProposalActivity.create({
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

  // GET - serve standalone HTML page (no redirect to avoid auth issues)
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('No token provided', { status: 400, headers: { 'Content-Type': 'text/plain' } });
  }

  // Fetch the proposal to display
  const proposals = await base44.entities.Proposal.filter({ approval_token: token });
  const proposal = proposals[0];

  if (!proposal) {
    return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not Found</title>
<style>body{font-family:system-ui,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#fff;border-radius:16px;padding:40px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.1);max-width:400px}
h1{color:#ef4444;margin:0 0 12px}p{color:#64748b;margin:0}</style></head>
<body><div class="card"><h1>Proposal Not Found</h1><p>This link is invalid or has expired.</p></div></body></html>`, 
    { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  // Update status to viewed if it was sent
  if (proposal.status === 'sent') {
    await base44.entities.Proposal.update(proposal.id, { status: 'viewed', viewed_date: new Date().toISOString() });
    proposal.status = 'viewed';
  }

  const p = proposal;
  const itemsHtml = (p.items || []).map(i => 
    `<div class="item"><div class="item-info"><span class="item-name">${i.name || ''}</span><span class="item-desc">${i.description || ''}</span><span class="item-qty">${i.quantity || 1} × $${(i.unit_price || 0).toFixed(2)}</span></div><span class="item-total">$${((i.quantity || 1) * (i.unit_price || 0)).toFixed(2)}</span></div>`
  ).join('');

  const approvedHtml = p.status === 'approved' ? `
<div class="card success">
  <div class="success-icon">✓</div>
  <h1>Proposal Approved!</h1>
  <p>Signed by ${p.signer_name || 'Customer'}</p>
  ${p.signed_date ? `<p class="date">on ${new Date(p.signed_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
</div>` : '';

  const formHtml = p.status !== 'approved' ? `
<div class="card">
  <h2>Approve & Sign</h2>
  <input type="text" id="signerName" placeholder="Your full name" />
  <label class="sig-label">Signature</label>
  <canvas id="sigCanvas"></canvas>
  <button type="button" class="btn-clear" onclick="clearSig()">Clear</button>
  <label class="checkbox-label"><input type="checkbox" id="agree" /> I agree to the terms and conditions outlined in this proposal</label>
  <button id="approveBtn" onclick="submitApproval()">Approve Proposal</button>
  <p id="errorMsg" class="error"></p>
</div>` : '';

  return new Response(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.title || 'Proposal'}</title>
<style>
*{box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;margin:0;padding:20px;color:#1e293b}
.container{max-width:700px;margin:0 auto}
.card{background:#fff;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.header{background:linear-gradient(135deg,#133F5C,#0069AF);color:#fff;border-radius:16px;padding:32px;margin-bottom:20px}
.header h1{margin:0 0 8px;font-size:24px}
.header .number{opacity:.8;font-size:14px}
.meta{display:flex;justify-content:space-between;margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,.2)}
.meta-item{font-size:14px}
.meta-label{opacity:.7;font-size:12px;text-transform:uppercase;margin-bottom:4px}
h2{margin:0 0 16px;font-size:18px;color:#1e293b}
.item{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 0;border-bottom:1px solid #e2e8f0}
.item:last-child{border-bottom:none}
.item-info{display:flex;flex-direction:column;gap:4px}
.item-name{font-weight:600}
.item-desc{font-size:14px;color:#64748b}
.item-qty{font-size:13px;color:#94a3b8}
.item-total{font-weight:600;white-space:nowrap}
.total-row{display:flex;justify-content:space-between;padding-top:20px;margin-top:16px;border-top:2px solid #e2e8f0;font-size:24px;font-weight:700}
.total-row span:last-child{color:#0069AF}
.terms{font-size:14px;color:#64748b;white-space:pre-wrap}
input[type="text"]{width:100%;padding:14px;border:2px solid #e2e8f0;border-radius:10px;font-size:16px;margin-bottom:16px}
input[type="text"]:focus{outline:none;border-color:#0069AF}
.sig-label{display:block;font-size:14px;color:#64748b;margin-bottom:8px}
canvas{width:100%;height:120px;border:2px solid #e2e8f0;border-radius:10px;touch-action:none;cursor:crosshair}
.btn-clear{background:none;border:none;color:#64748b;font-size:14px;cursor:pointer;padding:8px 0;margin-bottom:16px}
.checkbox-label{display:flex;align-items:flex-start;gap:12px;font-size:14px;color:#475569;margin-bottom:20px;cursor:pointer}
.checkbox-label input{width:20px;height:20px;margin:0;cursor:pointer}
button#approveBtn{width:100%;padding:16px;background:#0069AF;color:#fff;border:none;border-radius:10px;font-size:18px;font-weight:600;cursor:pointer}
button#approveBtn:hover{background:#005a94}
button#approveBtn:disabled{opacity:.5;cursor:not-allowed}
.error{color:#ef4444;font-size:14px;margin-top:12px}
.success{text-align:center;padding:48px 24px}
.success-icon{width:80px;height:80px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:40px;color:#22c55e}
.success h1{color:#166534;margin:0 0 8px}
.success p{color:#64748b;margin:0}
.success .date{font-size:14px;margin-top:8px}
</style>
</head>
<body>
<div class="container">
  ${p.status === 'approved' ? approvedHtml : `
  <div class="header">
    <div class="number">${p.proposal_number || ''}</div>
    <h1>${p.title || 'Proposal'}</h1>
    <div class="meta">
      <div class="meta-item"><div class="meta-label">Prepared For</div>${p.customer_name || ''}${p.customer_company ? '<br>' + p.customer_company : ''}</div>
      <div class="meta-item" style="text-align:right"><div class="meta-label">Valid Until</div>${p.valid_until ? new Date(p.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No expiration'}</div>
    </div>
  </div>
  <div class="card">
    <h2>Items & Services</h2>
    ${itemsHtml}
    <div class="total-row"><span>Total</span><span>$${(p.total || 0).toFixed(2)}</span></div>
  </div>
  ${p.terms_conditions ? `<div class="card"><h2>Terms & Conditions</h2><p class="terms">${p.terms_conditions}</p></div>` : ''}
  ${formHtml}
  `}
</div>
<script>
var canvas, ctx, drawing = false;
if (document.getElementById('sigCanvas')) {
  canvas = document.getElementById('sigCanvas');
  ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
  ctx.scale(2, 2);
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1e293b';
  
  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    var y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return {x: x, y: y};
  }
  canvas.onmousedown = canvas.ontouchstart = function(e) {
    e.preventDefault();
    drawing = true;
    var pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };
  canvas.onmousemove = canvas.ontouchmove = function(e) {
    if (!drawing) return;
    e.preventDefault();
    var pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };
  canvas.onmouseup = canvas.ontouchend = canvas.onmouseleave = function() { drawing = false; };
}
function clearSig() { if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }
function submitApproval() {
  var name = document.getElementById('signerName').value.trim();
  var agree = document.getElementById('agree').checked;
  var errEl = document.getElementById('errorMsg');
  if (!name) { errEl.textContent = 'Please enter your name'; return; }
  if (!agree) { errEl.textContent = 'Please agree to the terms'; return; }
  errEl.textContent = '';
  var btn = document.getElementById('approveBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  fetch(location.href.split('?')[0], {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({token: '${token}', action: 'approve', signerName: name, signatureData: canvas.toDataURL()})
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) { location.reload(); }
    else { errEl.textContent = d.error || 'Failed to submit'; btn.disabled = false; btn.textContent = 'Approve Proposal'; }
  }).catch(function(e) { errEl.textContent = 'Error: ' + e; btn.disabled = false; btn.textContent = 'Approve Proposal'; });
}
</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html' } });
});