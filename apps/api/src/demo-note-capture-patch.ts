const replaceRequired=(source:string,anchor:string,replacement:string,label:string)=>{
  if(!source.includes(anchor))throw new Error(`DEMO_NOTE_CAPTURE_PATCH_MISSING:${label}`);
  return source.replace(anchor,replacement);
};
const replaceRegexRequired=(source:string,pattern:RegExp,replacement:string,label:string)=>{
  if(!pattern.test(source))throw new Error(`DEMO_NOTE_CAPTURE_PATCH_MISSING:${label}`);
  pattern.lastIndex=0;
  return source.replace(pattern,replacement);
};

export function patchDemoNoteCapture(source:string):string{
  let out=source;

  out=replaceRequired(out,"compiledReceipt:null,composer:false,filingReceipt:''","compiledReceipt:null,composer:false,composerDraft:{title:'',body:''},composerTarget:null,filingReceipt:''","composer-state");

  out=replaceRequired(
    out,
    "function composer(){if(!state.composer)return'';return '<div class=\"composer\"><form class=\"composer-card\" id=\"knowledge-composer\"><small style=\"color:var(--accent);font-weight:750\">ADD TO '+(state.corpus==='life'?'LIFE':'ENTERPRISE')+' CORPUS</small><h2>Capture knowledge</h2><p class=\"sub\">Write or paste content. CERVEL will analyze it and select the best Mega Tab and subtab.</p><input id=\"composer-title\" required maxlength=\"120\" placeholder=\"Title\"><textarea id=\"composer-body\" required placeholder=\"Note, webpage excerpt, conversation, research, or project update…\"></textarea><div class=\"composer-actions\"><button type=\"button\" class=\"secondary\" data-composer-close>Cancel</button><button type=\"submit\" class=\"primary\">Add & auto-file</button></div></form></div>'}",
    "function openComposer(target){state.composer=true;state.composerTarget=target||null;state.composerDraft={title:'',body:''};render();setTimeout(function(){var title=document.getElementById('composer-title');if(title)title.focus()},0)}function enhanceSubtabActions(){document.querySelectorAll('.subtab-row').forEach(function(row){if(row.querySelector('[data-direct-note]'))return;var tab=row.querySelector('.subtab[data-semantic]');if(!tab)return;var add=document.createElement('button');add.type='button';add.className='subtab-add';add.dataset.directNote=tab.dataset.semantic||'';add.setAttribute('aria-label','Add note directly to '+tab.textContent.trim());add.title='Add note here';add.textContent='＋';row.appendChild(add)})}function composer(){if(!state.composer)return'';var draft=state.composerDraft||{title:'',body:''},parts=(state.composerTarget||'').split('|'),direct=parts[0]&&parts[1],destination=direct?'<div class=\"composer-target\"><span>Direct destination</span><b>'+esc((state.corpus==='life'?'Life':'Enterprise')+' › '+parts[0]+' › '+parts[1])+'</b></div>':'',hint=direct?'This note will be filed directly into the selected subtab. You can move it later without duplicating the canonical CKO.':'Write or paste content. CERVEL will analyze it and select the best Mega Tab and subtab.';return '<div class=\"composer\"><form class=\"composer-card\" id=\"knowledge-composer\"><small style=\"color:var(--accent);font-weight:750\">'+(direct?'ADD DIRECTLY TO SUBTAB':'ADD TO '+(state.corpus==='life'?'LIFE':'ENTERPRISE')+' CORPUS')+'</small><h2>Capture knowledge</h2>'+destination+'<p class=\"sub\">'+hint+'</p><label class=\"composer-field\"><span>Title</span><input id=\"composer-title\" required maxlength=\"120\" autocomplete=\"off\" placeholder=\"Give this note a clear title\" value=\"'+esc(draft.title||'')+'\"></label><label class=\"composer-field\"><span>Content</span><textarea id=\"composer-body\" required placeholder=\"Write your note, paste research, capture a conversation, or add a project update…\">'+esc(draft.body||'')+'</textarea></label><div class=\"composer-tip\">⌘/Ctrl + Enter to save · Esc to cancel</div><div class=\"composer-actions\"><button type=\"button\" class=\"secondary\" data-composer-close>Cancel</button><button type=\"submit\" class=\"primary\">'+(direct?'Add note here':'Add & auto-file')+'</button></div></form></div>'}",
    "composer-render"
  );

  out=replaceRequired(
    out,
    "var t=document.getElementById('note-title'),b=document.getElementById('note-body'),askInput=document.getElementById('ask-input'),askButton=document.querySelector('[data-live-ask]');if(t)t.oninput=function(){note().title=t.value;save()};if(b)b.oninput=function(){note().body=b.value;save()};",
    "var t=document.getElementById('note-title'),b=document.getElementById('note-body'),askInput=document.getElementById('ask-input'),askButton=document.querySelector('[data-live-ask]'),composerTitle=document.getElementById('composer-title'),composerBody=document.getElementById('composer-body');if(t)t.oninput=function(){note().title=t.value;save()};if(b)b.oninput=function(){note().body=b.value;save()};if(composerTitle)composerTitle.oninput=function(){state.composerDraft=state.composerDraft||{title:'',body:''};state.composerDraft.title=composerTitle.value};if(composerBody)composerBody.oninput=function(){state.composerDraft=state.composerDraft||{title:'',body:''};state.composerDraft.body=composerBody.value};",
    "composer-draft-bindings"
  );

  out=replaceRegexRequired(
    out,
    /if\(a==='new-note'\)\{var id='note-'\+Date\.now\(\);notes\.push\(\{id:id,title:'Untitled note',folder:'Projects',tags:\['new'\],body:'# Untitled note[\s\S]*?source:'Created in demo Vault'\}\);openNote\(id\)\}/,
    "if(a==='new-note'){openComposer(null);return}",
    "remove-competing-new-note-handler"
  );

  out=replaceRequired(
    out,
    "var add=e.target.closest&&e.target.closest('[data-action=\"new-note\"]');if(add){e.preventDefault();e.stopPropagation();state.composer=true;render();return}var close=e.target.closest&&e.target.closest('[data-composer-close]');if(close){e.preventDefault();e.stopPropagation();state.composer=false;render();return}",
    "var direct=e.target.closest&&e.target.closest('[data-direct-note]');if(direct){e.preventDefault();e.stopPropagation();openComposer(direct.dataset.directNote);return}var add=e.target.closest&&e.target.closest('[data-action=\"new-note\"]');if(add){e.preventDefault();e.stopPropagation();openComposer(null);return}var close=e.target.closest&&e.target.closest('[data-composer-close]');if(close){e.preventDefault();e.stopPropagation();state.composer=false;state.composerTarget=null;state.composerDraft={title:'',body:''};render();return}",
    "direct-note-click"
  );

  out=replaceRequired(
    out,
    "var filed=fileKnowledge(n,state.corpus);state.composer=false;state.selected=id;state.folder=filed.mega+' / '+filed.sub;state.view='notes';save();render()",
    "var target=(state.composerTarget||'').split('|'),filed;if(target[0]&&target[1]){filed={mega:target[0],sub:target[1],confidence:1};state.memberships=state.memberships||{};state.memberships[state.corpus+':'+n.id]=filed;state.collapsed[filed.mega]=false;state.subcollapsed[filed.mega+' / '+filed.sub]=false;state.filingReceipt=(state.corpus==='life'?'Life':'Enterprise')+' › '+filed.mega+' › '+filed.sub+' · direct placement';event('KNOWLEDGE_DIRECT_FILED',state.filingReceipt)}else filed=fileKnowledge(n,state.corpus);state.composer=false;state.composerTarget=null;state.composerDraft={title:'',body:''};state.selected=id;state.folder=filed.mega+' / '+filed.sub;state.view='notes';save();render()",
    "direct-subtab-submit"
  );

  out=replaceRequired(out,"bind();applyPreferences();if(state.view==='graph')requestAnimationFrame(initGraph);","bind();enhanceSubtabActions();applyPreferences();if(state.view==='graph')requestAnimationFrame(initGraph);","enhance-subtabs-after-render");

  out=replaceRequired(
    out,
    "if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault();document.querySelector('[data-action=\"new-note\"]').click()}",
    "if(state.composer&&e.key==='Escape'){e.preventDefault();state.composer=false;state.composerTarget=null;state.composerDraft={title:'',body:''};render();return}if(state.composer&&(e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();var form=document.getElementById('knowledge-composer');if(form)form.requestSubmit();return}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault();openComposer(null)}",
    "composer-keyboard"
  );

  return out;
}

export const demoNoteCaptureCss=String.raw`
.subtab-row{grid-template-columns:28px minmax(0,1fr) 28px}
.subtab-add{display:grid;place-items:center;width:25px;height:25px;border:0;border-radius:7px;background:transparent;color:var(--muted);font-size:16px;line-height:1;opacity:0;transition:opacity .16s ease,background .16s ease,color .16s ease,transform .16s ease}
.subtab-row:hover .subtab-add,.subtab-add:focus-visible{opacity:1}
.subtab-add:hover{background:rgba(113,87,232,.12);color:var(--accent);transform:scale(1.04)}
.composer-card{width:min(660px,100%);padding:28px;border-radius:24px}
.composer-card h2{margin:8px 0 5px;font-size:27px;letter-spacing:-.035em}
.composer-card .sub{margin:8px 0 17px;font-size:13px;line-height:1.55}
.composer-target{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:14px 0 10px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--accent) 20%,var(--line));border-radius:11px;background:color-mix(in srgb,var(--accent) 5%,var(--panel));font-size:11px}
.composer-target span{color:var(--muted)}
.composer-target b{color:var(--accent);text-align:right}
.composer-field{display:block;margin:12px 0}
.composer-field>span{display:block;margin:0 0 5px;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.04em}
.composer-card .composer-field input,.composer-card .composer-field textarea{margin:0;border-color:var(--hairline);background:rgba(247,248,251,.9);transition:border-color .16s ease,box-shadow .16s ease,background .16s ease}
.composer-card .composer-field input:focus,.composer-card .composer-field textarea:focus{outline:0;border-color:color-mix(in srgb,var(--accent) 58%,#fff);background:var(--panel);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 12%,transparent)}
.composer-card .composer-field textarea{min-height:210px;line-height:1.6}
.composer-tip{margin-top:5px;color:var(--muted);font-size:10px}
html[data-theme="dark"] .composer-card .composer-field input,html[data-theme="dark"] .composer-card .composer-field textarea{background:#171820;border-color:#3a3c48}
html[data-theme="dark"] .composer-target{background:#282538;border-color:#46405f}
@media(max-width:720px){.subtab-add{opacity:1}.composer{padding:12px}.composer-card{padding:21px;border-radius:20px}.composer-target{align-items:flex-start;flex-direction:column}.composer-target b{text-align:left}}
`;
