const homeInvoke=(cmd,args={})=>window.__TAURI__?.core?.invoke(cmd,args);
const homeEscape=(value='')=>String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let activeHomeCorpus='life';

const icons={
  personal:'◯',relationships_family:'♡',health:'⌁',work_career:'▣',education:'◇',projects:'▤',finance:'⌁',home:'⌂',
  organization:'◎',people:'◯',strategy:'◇',operations:'▦',products:'◫',customers:'♡',sales:'↗',marketing:'✦',technology:'⌘',data:'▥',ai_agents:'✧'
};
const corpusCopy={
  life:{kicker:'Life Corpus',title:'Your life, remembered',accent:'on your terms.',description:'Private memories, projects, work, learning and goals become useful semantic views while remaining encrypted, permission-aware and locally owned.'},
  enterprise:{kicker:'Enterprise Corpus',title:'Your organization, remembered',accent:'on your terms.',description:'Institutional knowledge, people, strategy, operations, products and systems become useful semantic views while remaining permission-aware, traceable and organization-owned.'}
};

function friendlyHomeError(){
  return 'CERVEL could not load this workspace state. Refresh after confirming the Vault is unlocked and the Local Node is healthy.';
}
function relativeTime(value){
  const time=Date.parse(value||'');
  if(!Number.isFinite(time))return '';
  const seconds=Math.max(0,Math.round((Date.now()-time)/1000));
  if(seconds<60)return 'now';
  if(seconds<3600)return `${Math.floor(seconds/60)}m`;
  if(seconds<86400)return `${Math.floor(seconds/3600)}h`;
  return `${Math.floor(seconds/86400)}d`;
}
function renderCorpusCopy(){
  const copy=corpusCopy[activeHomeCorpus]||corpusCopy.life;
  document.getElementById('home-kicker')?.replaceChildren(document.createTextNode(copy.kicker));
  document.getElementById('home-hero-title')?.replaceChildren(document.createTextNode(copy.title));
  document.getElementById('home-hero-accent')?.replaceChildren(document.createTextNode(copy.accent));
  document.getElementById('home-hero-description')?.replaceChildren(document.createTextNode(copy.description));
}
function setRuntime(status){
  const pill=document.getElementById('home-runtime-pill');
  const strip=document.getElementById('home-runtime-strip');
  if(!pill||!strip)return;
  const live=!!status?.running;
  const unlocked=Boolean(status?.vault);
  pill.classList.toggle('offline',!live||!unlocked);
  pill.querySelector('span').textContent=!live?'Local Node offline':unlocked?'Local Node healthy':'Vault locked';
  strip.innerHTML=!live
    ?'<strong>○</strong><span>Start the Local Node to load your real knowledge workspace.</span>'
    :unlocked
      ?'<strong>✓</strong><span>Your Local Node is running</span><span>Your Vault is encrypted</span><span>You’re in control</span>'
      :'<strong>○</strong><span>Local Node is running. Unlock a Vault to load semantic views and activity.</span>';
}
function renderSemanticPreview(explorer){
  const host=document.getElementById('home-semantic-preview');
  if(!host)return;
  const view=explorer?.semantic_views?.[activeHomeCorpus];
  const rows=(view?.semantic_views||[]).slice(0,8);
  host.innerHTML=rows.length?rows.map(item=>`<article tabindex="0" role="button" data-home-semantic="${homeEscape(item.key||'')}"><i>${icons[item.key]||'◇'}</i><strong>${homeEscape(item.title||item.key||'Knowledge')}</strong><span><b>${Number(item.canonical_cko_count||0)}</b> objects</span></article>`).join(''):'<div class="activity-empty">No visible semantic views in this corpus yet.</div>';
  host.querySelectorAll('[data-home-semantic]').forEach(card=>{
    const open=()=>{window.CERVEL_WORKSPACE?.openSemanticView(activeHomeCorpus,card.dataset.homeSemantic||'',card.querySelector('strong')?.textContent||'Semantic view')};
    card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
}
function renderActivity(explorer){
  const host=document.getElementById('home-activity-feed');
  if(!host)return;
  const rows=(explorer?.activity||[]).slice(0,12);
  host.innerHTML=rows.length?rows.map(event=>`<article><i class="activity-icon">${event.io_role==='output'?'↗':'✦'}</i><strong>${homeEscape(event.event_type||'KNOWLEDGE_EVENT')}</strong><span>${homeEscape([event.resource_type,event.actor_type].filter(Boolean).join(' · ')||'Canonical knowledge activity')}</span><small>${homeEscape(relativeTime(event.occurred_at))}</small></article>`).join(''):'<div class="activity-empty">No provenance activity yet. Capture knowledge to begin your timeline.</div>';
}
async function loadHome(){
  try{
    const status=await homeInvoke('node_status');
    setRuntime(status);
    const vaultName=document.getElementById('home-vault-name');
    const vaultMeta=document.getElementById('home-vault-meta');
    if(status?.vault&&vaultName){vaultName.textContent=status.vault.split('/').filter(Boolean).at(-1)||'Local Vault';vaultMeta.textContent='Encrypted · locally owned';}
    if(!status?.running||!status?.vault){
      document.getElementById('home-semantic-preview').innerHTML='<div class="activity-empty">Unlock your Vault to load real semantic views.</div>';
      document.getElementById('home-activity-feed').innerHTML='<div class="activity-empty">Unlock your Vault to load provenance activity.</div>';
      return;
    }
    const explorer=await homeInvoke('vault_explorer');
    renderSemanticPreview(explorer);
    renderActivity(explorer);
  }catch(error){
    console.error('Home workspace load failed',error);
    const safe=friendlyHomeError();
    const activity=document.getElementById('home-activity-feed');
    const semantic=document.getElementById('home-semantic-preview');
    if(activity)activity.innerHTML=`<div class="activity-empty">${homeEscape(safe)}</div>`;
    if(semantic)semantic.innerHTML=`<div class="activity-empty">${homeEscape(safe)}</div>`;
  }
}
function selectCorpus(key,emit=true){
  activeHomeCorpus=key==='enterprise'?'enterprise':'life';
  document.querySelectorAll('[data-home-corpus]').forEach(button=>button.classList.toggle('active',button.dataset.homeCorpus===activeHomeCorpus));
  renderCorpusCopy();
  if(emit)window.dispatchEvent(new CustomEvent('cervel:corpus-change',{detail:{corpus:activeHomeCorpus}}));
  void loadHome();
}

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-home-corpus]').forEach(button=>button.addEventListener('click',()=>selectCorpus(button.dataset.homeCorpus)));
  window.addEventListener('cervel:corpus-change',event=>{const corpus=event.detail?.corpus;if(corpus&&corpus!==activeHomeCorpus)selectCorpus(corpus,false)});
  const topSearch=document.getElementById('top-global-search');
  topSearch?.addEventListener('keydown',event=>{if(event.key==='Enter'&&topSearch.value.trim()){show('search');const search=document.getElementById('global-search');if(search){search.value=topSearch.value.trim();search.dispatchEvent(new Event('input',{bubbles:true}));}}});
  document.getElementById('home-open-explorer')?.addEventListener('click',()=>{show('vault');void window.CERVEL_WORKSPACE?.openCorpus(activeHomeCorpus);});
  document.getElementById('home-ask')?.addEventListener('click',()=>show('cortex'));
  document.getElementById('home-add-knowledge')?.addEventListener('click',()=>window.CERVEL_WORKSPACE?.openCaptureMenu());
  document.getElementById('home-refresh')?.addEventListener('click',loadHome);
  document.querySelector('[data-view="home"]')?.addEventListener('click',loadHome);
  renderCorpusCopy();
  void loadHome();
  setInterval(loadHome,10000);
});
window.CERVEL_HOME={loadHome,selectCorpus};
