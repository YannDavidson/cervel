export function renderTraceUI(answerId: string): string {
  const safeId = answerId.replace(/[^a-zA-Z0-9-]/g, "");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>CERVEL Trace</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171717;background:#f6f6f3}*{box-sizing:border-box}body{margin:0}.shell{max-width:1180px;margin:0 auto;padding:32px}.top{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:24px}.brand{font-size:14px;letter-spacing:.18em;font-weight:800}.title{font-size:34px;font-weight:700;margin:8px 0 0}.muted{color:#6b6b66}.panel{background:white;border:1px solid #e7e7e2;border-radius:18px;padding:20px;box-shadow:0 8px 30px rgba(0,0,0,.035)}.controls{display:flex;gap:10px;margin-bottom:20px}input,button{border:1px solid #d8d8d2;border-radius:10px;padding:11px 13px;font:inherit}input{flex:1}button{background:#171717;color:white;cursor:pointer}.answer{font-size:18px;line-height:1.6}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.stat{background:#fafaf8;border:1px solid #ecece6;border-radius:12px;padding:14px}.stat b{display:block;font-size:21px;margin-top:4px}.chain{display:grid;gap:12px;margin-top:18px}.step{border-left:3px solid #181818;padding:6px 0 6px 14px}.step h3{margin:0 0 5px;font-size:15px}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;word-break:break-all}.badge{display:inline-block;border:1px solid #d8d8d2;border-radius:999px;padding:4px 8px;font-size:12px;margin-right:5px}.conflict{border-color:#d5a0a0;background:#fff7f7}.grid{display:grid;grid-template-columns:1.3fr .7fr;gap:18px}@media(max-width:850px){.grid,.stats{grid-template-columns:1fr}.top{align-items:start;flex-direction:column}}
</style>
</head>
<body>
<div class="shell">
  <div class="top"><div><div class="brand">CERVEL</div><h1 class="title">Trace</h1><div class="muted">Answer → CCP → Claim → Evidence → Fragment → Artifact → Source</div></div><div class="mono">${safeId}</div></div>
  <div class="panel controls"><input id="principal" placeholder="CERVEL principal UUID" autocomplete="off"/><button id="load">Load trace</button></div>
  <div id="status" class="muted"></div>
  <div id="app" style="display:none">
    <div class="grid">
      <main class="panel"><div class="muted">ANSWER</div><div id="answer" class="answer"></div><div id="citations" style="margin-top:16px"></div></main>
      <aside class="panel"><div class="muted">TRACE HEALTH</div><div class="stats"><div class="stat">Claims<b id="claimCount">0</b></div><div class="stat">Sources<b id="sourceCount">0</b></div><div class="stat">Conflicts<b id="conflictCount">0</b></div><div class="stat">Model<b id="model">—</b></div></div><div id="conflicts"></div></aside>
    </div>
    <section class="panel" style="margin-top:18px"><div class="muted">LINEAGE</div><div id="chain" class="chain"></div></section>
  </div>
</div>
<script>
const answerId=${JSON.stringify(safeId)};
const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
document.getElementById('load').onclick=async()=>{
  const principal=document.getElementById('principal').value.trim();
  const status=document.getElementById('status');
  if(!principal){status.textContent='Enter a principal UUID to view this protected trace.';return;}
  status.textContent='Loading protected knowledge lineage…';
  try{
    const r=await fetch('/v1/answers/'+encodeURIComponent(answerId)+'/trace',{headers:{'x-cervel-principal-id':principal}});
    const data=await r.json(); if(!r.ok) throw new Error(data.error||'TRACE_LOAD_FAILED');
    document.getElementById('app').style.display='block'; status.textContent='';
    document.getElementById('answer').textContent=data.answer?.text||'';
    document.getElementById('model').textContent=(data.answer?.model_run_id||'—').slice(0,8);
    const uniqueClaims=new Set((data.chain||[]).map(x=>x.claim?.id).filter(Boolean));
    const uniqueSources=new Set((data.chain||[]).map(x=>x.source?.cko_id).filter(Boolean));
    document.getElementById('claimCount').textContent=uniqueClaims.size;
    document.getElementById('sourceCount').textContent=uniqueSources.size;
    document.getElementById('conflictCount').textContent=(data.conflicts||[]).length;
    document.getElementById('citations').innerHTML=(data.answer?.citations||[]).map(c=>'<span class="badge">'+esc(c.index)+': '+esc(c.uri)+'</span>').join('');
    document.getElementById('conflicts').innerHTML=(data.conflicts||[]).map(c=>'<div class="badge conflict">'+esc(c.conflict_type)+' · '+Math.round(Number(c.confidence||0)*100)+'%</div>').join('');
    document.getElementById('chain').innerHTML=(data.chain||[]).map((x,i)=>'<div class="step"><h3>'+ (i+1)+'. '+esc(x.claim?.predicate||'Claim')+'</h3><div>'+esc(x.fragment?.text||'')+'</div><div class="mono" style="margin-top:8px">Claim '+esc(x.claim?.id)+'<br/>Fragment '+esc(x.fragment?.id)+'<br/>Artifact '+esc(x.artifact?.id)+' · SHA '+esc(x.artifact?.sha256)+'<br/>Source '+esc(x.source?.title)+' · '+esc(x.source?.cko_id)+'</div></div>').join('');
  }catch(e){status.textContent=e.message;document.getElementById('app').style.display='none';}
};
</script>
</body></html>`;
}
