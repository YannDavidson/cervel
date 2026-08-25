import {demoApp,demoCss} from "./demo-assets";

export const demoDesignPage=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff"><title>CERVEL — Semantic Workspace Preview</title><link rel="stylesheet" href="/design-preview/app.css?v=1"></head><body class="cervel-design-preview"><div id="app"><div class="boot"><b>CERVEL</b><span>Opening the semantic workspace…</span></div></div><script src="/design-preview/app.js?v=1" defer></script></body></html>`;

export const demoDesignApp=demoApp
 .replaceAll("cervel-workspace-v3","cervel-design-preview-v1")
 .replaceAll("cervel-workspace-v2","cervel-design-preview-v1");

export const demoDesignCss=demoCss+String.raw`
:root{
 --cervel-ink:#071A35;--cervel-blue:#087BC1;--cervel-cyan:#13C9CF;--cervel-violet:#7B2BE2;
 --cervel-gradient-mid:#11BDC8;--background:#fff;--surface-soft:#F5F7FA;--surface-product:#F6F8FB;
 --text-primary:#071A35;--text-secondary:#68778A;--text-tertiary:#8794A5;
 --border-subtle:rgba(7,26,53,.09);--border-faint:rgba(7,26,53,.05);--surface-dark:#06172F;--surface-world:#030D1C;
 --bg:var(--surface-product);--panel:#fff;--side:#F7F9FC;--ink:var(--text-primary);--muted:var(--text-secondary);
 --line:var(--border-subtle);--accent:var(--cervel-blue);--accent2:var(--cervel-violet);--good:#159A72;
 --cervel-gradient:linear-gradient(90deg,#087BC1 5%,#11BDC8 55%,#7B2BE2 96%);
 --soft-shadow:0 10px 30px rgba(29,57,90,.04);--lift-shadow:0 24px 60px rgba(25,54,90,.08);
}
*{scrollbar-width:thin;scrollbar-color:rgba(7,26,53,.16) transparent}
*:focus-visible{outline:2px solid var(--cervel-blue)!important;outline-offset:3px}
body{background:#EEF2F7;color:var(--text-primary);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.app{margin:0;height:100%;border:0;border-radius:0;grid-template-columns:188px 260px minmax(440px,1fr) 292px;grid-template-rows:58px 1fr 30px;background:#fff;box-shadow:none}
.titlebar{padding:0 22px;background:rgba(255,255,255,.86);border-bottom:1px solid var(--border-faint);backdrop-filter:blur(20px) saturate(1.3)}
.traffic{display:none}.brand{min-width:148px;font-size:15px;font-weight:760;letter-spacing:.19em;color:var(--cervel-ink)}
.search{width:min(620px,48vw)}.search input{height:36px;padding-left:36px;border:1px solid var(--border-faint);border-radius:999px;background:#F5F7FA;color:var(--cervel-ink);box-shadow:none}.search input:focus{border-color:rgba(8,123,193,.3);background:#fff;box-shadow:0 0 0 4px rgba(8,123,193,.07)}
.pill{padding:5px 10px;border-color:var(--border-faint);background:#fff;color:var(--text-secondary)}.dot{background:var(--cervel-cyan);box-shadow:0 0 0 3px rgba(19,201,207,.12)}
.rail{grid-row:2;padding:18px 12px;border-right:1px solid var(--border-faint);background:#fff;align-items:stretch;gap:4px}
.rail:before{content:'WORKSPACE';padding:3px 11px 9px;color:var(--text-tertiary);font-size:9px;font-weight:800;letter-spacing:.15em}
.rail button{display:flex;align-items:center;width:100%;height:38px;padding:0 11px;border-radius:11px;color:var(--text-secondary);font-size:15px;text-align:left;transition:background .2s ease,color .2s ease,transform .2s ease}
.rail button:after{content:attr(aria-label);margin-left:11px;font-size:12px;font-weight:650;letter-spacing:.01em}.rail button:hover{transform:none;background:#F5F7FA;color:var(--cervel-ink);box-shadow:none}.rail button.active{background:#EDF5FA;color:var(--cervel-blue);box-shadow:inset 2px 0 var(--cervel-blue)}
.rail .bottom{margin-top:auto}.rail .bottom:after{content:'Reset preview'}
.explorer{background:#F8FAFC;border-right:1px solid var(--border-faint)}.pane-head{height:50px;padding:0 16px;border-bottom:1px solid var(--border-faint);color:var(--text-tertiary);font-size:10px;letter-spacing:.14em}.pane-head button{color:var(--cervel-blue)}
.vault{margin:14px;padding:15px;border:1px solid var(--border-faint);border-radius:18px;background:#fff;box-shadow:var(--soft-shadow)}.vault b{font-size:14px;color:var(--cervel-ink)}
.corpus-switch,.explorer-switch{padding:4px;border-color:var(--border-faint);border-radius:12px;background:#EEF2F6}.corpus-switch button{border-radius:9px}.corpus-switch button.active{color:var(--cervel-ink);box-shadow:0 4px 14px rgba(29,57,90,.08)}
.folder-row,.subtab-row,.file{border-radius:10px;transition:background .18s ease,color .18s ease}.folder-row:hover,.subtab-row:hover,.file:hover{background:#EEF4F8;color:var(--cervel-blue)}
.workspace{background:#fff}.scopebar{min-height:43px;padding:8px 18px;border-bottom:1px solid var(--border-faint);background:rgba(255,255,255,.88)}.scopebar select{border-color:var(--border-subtle);border-radius:999px;padding:5px 10px;background:#fff;color:var(--cervel-ink)}
.tabs{height:42px;padding-left:18px;border-bottom:1px solid var(--border-faint);background:#fff}.tab{padding:0 14px;border:0;background:transparent;color:var(--cervel-blue);box-shadow:inset 0 -2px var(--cervel-blue);font-weight:650}
.view{padding:44px clamp(28px,5vw,76px) 80px;background:radial-gradient(circle at 86% 4%,rgba(19,201,207,.055),transparent 25%),#fff}
h1,.hero h1,.ask-hero h1{color:var(--cervel-ink);font-weight:710;letter-spacing:-.04em}.hero h1{font-size:48px}.sub,.hero>p{color:var(--text-secondary);line-height:1.62}
.card,.result,.answer,.deliverable,.integration-card,.metric,.semantic-demo,.guided-step{border:1px solid var(--border-faint);border-radius:20px;background:#fff;box-shadow:var(--soft-shadow);transition:transform .22s cubic-bezier(.22,.61,.36,1),box-shadow .22s ease,border-color .22s ease}
.card:hover,.result:hover,.integration-card:hover,.guided-step:hover{transform:translateY(-2px);border-color:rgba(8,123,193,.16);box-shadow:var(--lift-shadow)}
.primary,.secondary,.integration-card button,.deliverable button{min-height:36px;border-radius:999px;padding:8px 15px}.primary{background:var(--cervel-ink);box-shadow:none}.secondary{border-color:var(--border-subtle);color:var(--cervel-ink);background:#fff}.secondary:hover{border-color:rgba(8,123,193,.22);color:var(--cervel-blue);background:#F8FBFD}
.notice{border:1px solid rgba(8,123,193,.1);border-radius:16px;background:#F2F8FB;color:#36566E}.tag,.corpus-badge,.privacy-badge,.authority-badge,.graph-stats span{border:1px solid transparent;border-radius:999px;font-size:10px;font-weight:720;letter-spacing:.04em}.tag,.corpus-badge{background:#EEF4F8;color:#47647A}.privacy-badge{background:#EAF8F4;color:#176E59}.authority-badge{background:#F1EDFB;color:#6541A5}
.ask-shell{width:min(860px,100%)}.ask-orb{border-radius:50%;background:var(--cervel-gradient);box-shadow:0 18px 45px rgba(8,123,193,.16)}.suggestion{border-color:var(--border-subtle);background:#fff}.message{border-radius:22px}.message.user{background:var(--cervel-ink);box-shadow:0 12px 30px rgba(7,26,53,.14)}.message.assistant{border:1px solid var(--border-faint);background:#fff;box-shadow:var(--soft-shadow)}
.ask-composer{bottom:20px;border-color:var(--border-subtle);border-radius:24px;background:rgba(255,255,255,.9);box-shadow:0 24px 60px rgba(25,54,90,.12);backdrop-filter:blur(22px) saturate(1.25)}.prompt-surface{border-color:var(--border-faint);border-radius:18px;background:#F7F9FC;box-shadow:none}.ask-send{border-radius:18px;background:var(--cervel-ink);box-shadow:none}.ask-send:hover:not(:disabled){box-shadow:0 12px 26px rgba(7,26,53,.18)}.thinking-dots i{background:var(--cervel-cyan)}
.graph{height:min(650px,calc(100vh - 250px));min-height:470px;border:1px solid var(--border-faint);border-radius:26px;background:radial-gradient(circle at 50% 44%,#fff,#F6F9FC 64%,#EFF4F8);box-shadow:var(--lift-shadow)}.graph:before{content:'';position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(7,26,53,.026) 1px,transparent 1px),linear-gradient(90deg,rgba(7,26,53,.026) 1px,transparent 1px);background-size:28px 28px}.graph-tools button{border-color:var(--border-subtle);background:rgba(255,255,255,.82);color:var(--cervel-ink)}.graph-legend{border-color:var(--border-subtle);background:rgba(255,255,255,.88);color:var(--text-secondary)}.graph-hint{color:var(--text-secondary)}
.trace{position:relative;padding:28px;border-radius:26px;background:var(--surface-dark);box-shadow:0 26px 70px rgba(3,13,28,.18)}.trace:before{content:'';position:absolute;left:8%;right:8%;top:50%;height:1px;background:var(--cervel-gradient);opacity:.5}.trace button{position:relative;border-color:rgba(255,255,255,.09);border-radius:16px;background:#0B213E;color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.14)}.trace button small{color:rgba(255,255,255,.62)}
.context{border-left:1px solid var(--border-faint);background:#F8FAFC}.context-tabs{border-bottom-color:var(--border-faint)}.context-tabs button.active{color:var(--cervel-blue);box-shadow:inset 0 -2px var(--cervel-blue)}.activity b{color:var(--cervel-blue)}
.status{min-height:30px;padding:0 14px;border-top:1px solid var(--border-faint);background:#F7F9FB;color:var(--text-tertiary)}.footer-copy{color:var(--text-secondary)}
.onboarding{background:rgba(3,13,28,.42)}.onboarding-card,.composer-card{border-color:rgba(255,255,255,.6);border-radius:28px;background:rgba(255,255,255,.96);box-shadow:0 35px 100px rgba(3,13,28,.2)}.corpus-choice{border-color:var(--border-faint);border-radius:22px}.corpus-choice i{background:#EDF5FA;color:var(--cervel-blue)}
.integration-logo,.folder-icon{color:var(--cervel-blue);background:#EDF5FA}.integration-category,.taxonomy-heading{color:var(--text-tertiary);font-weight:800;letter-spacing:.14em}
.toast{border:1px solid rgba(255,255,255,.1);border-radius:14px;background:var(--surface-dark);box-shadow:0 18px 50px rgba(3,13,28,.22)}
html[data-theme="dark"]{--bg:#07182F;--panel:#0A1D38;--side:#0B213E;--ink:#F8FAFC;--muted:rgba(255,255,255,.65);--line:rgba(255,255,255,.09);--accent:#45C9E4;--accent2:#A374EC}
html[data-theme="dark"] body{background:#030D1C}html[data-theme="dark"] .app,html[data-theme="dark"] .workspace,html[data-theme="dark"] .view,html[data-theme="dark"] .titlebar,html[data-theme="dark"] .rail,html[data-theme="dark"] .tabs{background:#07182F}html[data-theme="dark"] .explorer,html[data-theme="dark"] .context,html[data-theme="dark"] .status{background:#0A1D38}html[data-theme="dark"] h1,html[data-theme="dark"] .brand{color:#fff}
@media(max-width:1180px){.app{grid-template-columns:66px 230px minmax(390px,1fr)}.rail{padding-inline:9px}.rail:before,.rail button:after{display:none}.rail button{justify-content:center;padding:0}.brand{min-width:auto}.context{display:none}}
@media(max-width:760px){.app{grid-template-columns:54px minmax(0,1fr);grid-template-rows:54px 1fr 30px}.titlebar{padding:0 12px}.brand{display:none}.search{width:100%}.explorer{display:none}.workspace{grid-column:2}.rail{grid-row:2}.view{padding:30px 18px 72px}.hero h1{font-size:38px}.graph{min-height:430px}.trace{grid-template-columns:1fr;padding:18px}.trace:before{display:none}.footer-copy,.status .end{display:none}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
`;
