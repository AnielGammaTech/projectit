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

  // GET - return simple HTML
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('No token', { status: 400 });
  }

  return new Response(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proposal</title>
<style>
body{font-family:sans-serif;background:#f5f5f5;margin:0;padding:20px}
.box{background:#fff;border-radius:8px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h1{margin:0 0 10px;font-size:22px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
.total{font-size:20px;font-weight:bold;border:none}
input{width:100%;padding:10px;border:1px solid #ccc;border-radius:4px;margin-bottom:10px;box-sizing:border-box}
canvas{width:100%;height:80px;border:1px solid #ccc;border-radius:4px}
button{width:100%;padding:12px;background:#0066cc;color:#fff;border:none;border-radius:4px;font-size:16px;cursor:pointer}
button:disabled{opacity:.5}
.ok{text-align:center;color:green}
.err{text-align:center;color:red}
</style>
</head>
<body>
<div id="a"></div>
<script>
var T="${token}",A=location.href.split("?")[0];
fetch(A,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:T,action:"fetch"})})
.then(r=>r.json()).then(d=>{
if(d.error){document.getElementById("a").innerHTML="<div class='box err'>"+d.error+"</div>";return}
var p=d.p;
if(p.status==="approved"){document.getElementById("a").innerHTML="<div class='box ok'><h1>Approved!</h1><p>Signed by "+p.signer_name+"</p></div>";return}
var h="<div class='box'><h1>"+p.title+"</h1><p>"+p.proposal_number+"</p></div>";
h+="<div class='box'>";
(p.items||[]).forEach(function(i){h+="<div class='row'><span>"+i.name+" ("+i.quantity+")</span><span>$"+((i.quantity||0)*(i.unit_price||0)).toFixed(2)+"</span></div>"});
h+="<div class='row total'><span>Total</span><span>$"+(p.total||0).toFixed(2)+"</span></div></div>";
h+="<div class='box'><input id='n' placeholder='Your name'><canvas id='c'></canvas><br><button onclick='clr()'>Clear</button><br><br><label><input type='checkbox' id='k'> I agree</label><br><br><button id='b' onclick='go()'>Approve</button></div>";
document.getElementById("a").innerHTML=h;
var c=document.getElementById("c"),x=c.getContext("2d"),dr=false;
c.width=c.offsetWidth*2;c.height=c.offsetHeight*2;x.scale(2,2);x.lineWidth=2;x.lineCap="round";
c.onmousedown=c.ontouchstart=function(e){e.preventDefault();dr=true;x.beginPath();var r=c.getBoundingClientRect(),px=e.touches?e.touches[0].clientX-r.left:e.clientX-r.left,py=e.touches?e.touches[0].clientY-r.top:e.clientY-r.top;x.moveTo(px,py)};
c.onmousemove=c.ontouchmove=function(e){if(!dr)return;e.preventDefault();var r=c.getBoundingClientRect(),px=e.touches?e.touches[0].clientX-r.left:e.clientX-r.left,py=e.touches?e.touches[0].clientY-r.top:e.clientY-r.top;x.lineTo(px,py);x.stroke()};
c.onmouseup=c.ontouchend=function(){dr=false};
window.clr=function(){x.clearRect(0,0,c.width,c.height)};
window.go=function(){
if(!document.getElementById("n").value||!document.getElementById("k").checked)return alert("Fill name and agree");
var b=document.getElementById("b");b.disabled=true;b.textContent="...";
fetch(A,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:T,action:"approve",signerName:document.getElementById("n").value,signatureData:c.toDataURL()})})
.then(r=>r.json()).then(function(){location.reload()}).catch(function(e){alert(e);b.disabled=false;b.textContent="Approve"});
};
}).catch(function(e){document.getElementById("a").innerHTML="<div class='box err'>Error: "+e+"</div>"});
</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html' } });
});