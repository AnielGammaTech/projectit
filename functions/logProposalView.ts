import { createClient } from 'npm:@base44/sdk@0.8.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Base44-App-Id',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClient({ 
      appId: Deno.env.get('BASE44_APP_ID'),
      serviceRoleToken: Deno.env.get('BASE44_SERVICE_ROLE_TOKEN')
    });

    // Handle POST requests - API calls
    if (req.method === 'POST') {
      const body = await req.json();
      const { token, action = 'fetch', signerName, signatureData, details = '' } = body;

      if (!token) {
        return Response.json({ error: 'Token required' }, { status: 400, headers: corsHeaders });
      }

      const proposals = await base44.entities.Proposal.filter({ approval_token: token });
      const proposal = proposals[0];

      if (!proposal) {
        return Response.json({ error: 'Proposal not found' }, { status: 404, headers: corsHeaders });
      }

      // Fetch action - return proposal data
      if (action === 'fetch') {
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

        return Response.json({ 
          proposal: {
            id: proposal.id,
            proposal_number: proposal.proposal_number,
            title: proposal.title,
            customer_name: proposal.customer_name,
            customer_company: proposal.customer_company,
            status: proposal.status,
            items: proposal.items,
            total: proposal.total,
            terms_conditions: proposal.terms_conditions,
            valid_until: proposal.valid_until,
            signer_name: proposal.signer_name,
            signed_date: proposal.signed_date
          }
        }, { headers: corsHeaders });
      }

      const ip = req.headers.get("x-forwarded-for") || "unknown";

      // Log activity
      await base44.entities.ProposalActivity.create({
        proposal_id: proposal.id,
        action: action,
        actor_name: signerName || proposal.customer_name || 'Customer',
        actor_email: proposal.customer_email || '',
        ip_address: ip,
        details: details || `Proposal ${action}`
      });

      // Update status
      if (action === 'approved') {
        await base44.entities.Proposal.update(proposal.id, {
          status: 'approved',
          signature_data: signatureData || null,
          signer_name: signerName || proposal.customer_name,
          signed_date: new Date().toISOString()
        });
      } else if (action === 'rejected') {
        await base44.entities.Proposal.update(proposal.id, { status: 'rejected' });
      } else if (action === 'changes_requested') {
        await base44.entities.Proposal.update(proposal.id, {
          status: 'changes_requested',
          change_request_notes: details
        });
      }

      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // GET request - simple redirect page
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('Missing token', { status: 400 });
    }

    // Return a minimal HTML page that loads the proposal
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Loading...</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#f8fafc;min-height:100vh}#app{max-width:700px;margin:0 auto;padding:20px}.card{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-bottom:16px;overflow:hidden}.header{background:#133F5C;color:#fff;padding:20px}.header h1{font-size:20px}.info{padding:16px;display:flex;justify-content:space-between;border-bottom:1px solid #eee}.info p{font-size:14px}.info .label{color:#888;font-size:12px}.items{padding:16px}.item{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee}.item:last-child{border:none}.item-name{font-weight:500}.item-qty{color:#666;font-size:14px}.total{display:flex;justify-content:space-between;padding:16px;border-top:2px solid #eee;font-size:20px;font-weight:bold}.total span:last-child{color:#0069AF}form{padding:16px}input[type=text]{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;font-size:16px}canvas{width:100%;height:100px;border:2px solid #ddd;border-radius:8px;touch-action:none}.clear{background:none;border:none;color:#666;font-size:14px;cursor:pointer;margin:8px 0}.check{display:flex;gap:8px;margin:16px 0;font-size:14px}.btn{width:100%;padding:14px;background:#0069AF;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:500;cursor:pointer}.btn:disabled{opacity:.5}.success{text-align:center;padding:40px}.success h1{color:#10b981;margin-bottom:8px}.error{text-align:center;padding:40px;color:#ef4444}.loading{text-align:center;padding:60px;color:#666}</style></head><body><div id="app"><div class="loading">Loading proposal...</div></div><script>const T='${token}',U=location.origin+'/api/functions/logProposalView';let P,C,X,D=false;async function load(){try{const r=await fetch(U,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:T,action:'fetch'})});const d=await r.json();if(d.error){show('error','Proposal not found');return}P=d.proposal;render()}catch(e){show('error','Failed to load')}}function show(t,m){document.getElementById('app').innerHTML='<div class="'+t+'"><h1>'+m+'</h1></div>'}function render(){if(P.status==='approved'){document.getElementById('app').innerHTML='<div class="card"><div class="success"><h1>✓ Approved</h1><p>Thank you for approving this proposal.</p>'+(P.signer_name?'<p style="color:#888;margin-top:8px">Signed by '+P.signer_name+'</p>':'')+'</div></div>';return}if(P.status==='rejected'){show('error','This proposal has been declined');return}let items='';(P.items||[]).forEach(i=>{items+='<div class="item"><div><div class="item-name">'+i.name+'</div><div class="item-qty">'+i.quantity+' x $'+(i.unit_price||0).toFixed(2)+'</div></div><div>$'+((i.quantity||0)*(i.unit_price||0)).toFixed(2)+'</div></div>'});document.getElementById('app').innerHTML='<div class="card"><div class="header"><p style="opacity:.7;font-size:14px">'+(P.proposal_number||'')+'</p><h1>'+(P.title||'Proposal')+'</h1></div><div class="info"><div><p class="label">Prepared For</p><p>'+(P.customer_name||'')+'</p></div><div style="text-align:right"><p class="label">Valid Until</p><p>'+(P.valid_until?new Date(P.valid_until).toLocaleDateString():'N/A')+'</p></div></div></div><div class="card"><div class="items">'+items+'</div><div class="total"><span>Total</span><span>$'+(P.total||0).toFixed(2)+'</span></div></div><div class="card"><form id="f"><input type="text" id="n" placeholder="Your full name" required><canvas id="c"></canvas><button type="button" class="clear" onclick="clr()">Clear signature</button><label class="check"><input type="checkbox" id="a" required><span>I agree and authorize work to proceed</span></label><button type="submit" class="btn" id="b">Approve Proposal</button></form></div>';C=document.getElementById('c');X=C.getContext('2d');C.width=C.offsetWidth*2;C.height=C.offsetHeight*2;X.scale(2,2);X.lineCap='round';X.strokeStyle='#333';X.lineWidth=2;C.onmousedown=C.ontouchstart=e=>{e.preventDefault();D=true;X.beginPath();let p=pos(e);X.moveTo(p.x,p.y)};C.onmousemove=C.ontouchmove=e=>{if(!D)return;e.preventDefault();let p=pos(e);X.lineTo(p.x,p.y);X.stroke()};C.onmouseup=C.onmouseleave=C.ontouchend=()=>D=false;document.getElementById('f').onsubmit=submit}function pos(e){let r=C.getBoundingClientRect();return{x:(e.touches?e.touches[0].clientX:e.clientX)-r.left,y:(e.touches?e.touches[0].clientY:e.clientY)-r.top}}function clr(){X.clearRect(0,0,C.width,C.height)}async function submit(e){e.preventDefault();let b=document.getElementById('b');b.disabled=true;b.textContent='Submitting...';try{let r=await fetch(U,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:T,action:'approved',signerName:document.getElementById('n').value,signatureData:C.toDataURL()})});let d=await r.json();if(d.success)location.reload();else{alert(d.error||'Error');b.disabled=false;b.textContent='Approve Proposal'}}catch(err){alert(err.message);b.disabled=false;b.textContent='Approve Proposal'}}load()</script></body></html>`;

    return new Response(html, { 
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    if (req.method === 'GET') {
      return new Response('<h1>Error</h1><p>'+error.message+'</p>', { 
        headers: { 'Content-Type': 'text/html' }
      });
    }
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});