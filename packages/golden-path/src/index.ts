import {createHash}from"node:crypto";
import{mkdir,readFile,writeFile}from"node:fs/promises";
import{dirname}from"node:path";

export const GOLDEN_PATH_PROTOCOL="cervel-alpha-golden-path/v0.1"as const;
export type CheckStatus="passed"|"failed"|"pending";
export type GoldenCheck={status:CheckStatus;detail:string;evidence?:Record<string,unknown>};
export type GoldenPathReport={protocol:typeof GOLDEN_PATH_PROTOCOL;run_id:string;commit:string;started_at:string;completed_at?:string;result:"running"|"passed"|"failed";tier:"golden_path_ci";checks:Record<string,GoldenCheck>;release_qualification:{automated_ci:CheckStatus;signed_artifacts:CheckStatus;real_devices:CheckStatus}};

function canonical(value:unknown):string{if(Array.isArray(value))return`[${value.map(canonical).join(",")}]`;if(value&&typeof value==="object")return`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;return JSON.stringify(value);}
export function stateDigest(value:unknown){return createHash("sha256").update(canonical(value)).digest("hex");}
export function verifyTrace(trace:any){const chain=Array.isArray(trace?.chain)?trace.chain:[];const complete=chain.filter((v:any)=>v?.answer_id&&v?.context_package_id&&v?.claim?.id&&v?.fragment?.id&&v?.artifact?.id&&v?.artifact?.sha256&&v?.source?.cko_id);if(!trace?.answer?.id||!trace?.context_package?.id||complete.length===0)throw new Error("GOLDEN_TRACE_INCOMPLETE");return{answer_id:trace.answer.id,context_package_id:trace.context_package.id,complete_links:complete.length,digest:stateDigest(complete)};}

export class GoldenReport{
 constructor(public value:GoldenPathReport){}
 static start(commit=process.env.GITHUB_SHA??"local"){return new GoldenReport({protocol:GOLDEN_PATH_PROTOCOL,run_id:`golden-${Date.now()}`,commit,started_at:new Date().toISOString(),result:"running",tier:"golden_path_ci",checks:{},release_qualification:{automated_ci:"pending",signed_artifacts:"pending",real_devices:"pending"}});}
 static async load(path:string){return new GoldenReport(JSON.parse(await readFile(path,"utf8")));}
 pass(name:string,detail:string,evidence?:Record<string,unknown>){this.value.checks[name]={status:"passed",detail,evidence};return this;}
 fail(name:string,detail:string,evidence?:Record<string,unknown>){this.value.checks[name]={status:"failed",detail,evidence};this.value.result="failed";return this;}
 finalize(required:string[]){const missing=required.filter(k=>this.value.checks[k]?.status!=="passed");if(missing.length)throw new Error(`GOLDEN_REQUIRED_CHECKS_FAILED:${missing.join(",")}`);this.value.result="passed";this.value.completed_at=new Date().toISOString();this.value.release_qualification.automated_ci="passed";return this;}
 async save(jsonPath:string,htmlPath=jsonPath.replace(/\.json$/,".html")){await mkdir(dirname(jsonPath),{recursive:true});await writeFile(jsonPath,JSON.stringify(this.value,null,2)+"\n");const rows=Object.entries(this.value.checks).map(([name,c])=>`<tr><td>${escapeHtml(name)}</td><td class="${c.status}">${c.status}</td><td>${escapeHtml(c.detail)}</td></tr>`).join("");await writeFile(htmlPath,`<!doctype html><meta charset="utf-8"><title>CERVEL Alpha Golden Path</title><style>body{font:16px system-ui;background:#07110d;color:#e6fff2;max-width:1000px;margin:40px auto;padding:0 24px}h1{font-size:42px}.meta{color:#83aa98}.passed{color:#54e79a}.failed{color:#ff7d7d}.pending{color:#e8c765}table{width:100%;border-collapse:collapse;background:#0e1b15}th,td{padding:12px;border:1px solid #284b3b;text-align:left}</style><p class="meta">CERVEL / SOVEREIGN KNOWLEDGE INFRASTRUCTURE</p><h1>Alpha Golden Path</h1><p>Result: <strong class="${this.value.result}">${this.value.result}</strong> · ${escapeHtml(this.value.commit)}</p><table><thead><tr><th>Check</th><th>Status</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table><h2>Release qualification</h2><p>Automated CI: ${this.value.release_qualification.automated_ci}<br>Signed artifacts: ${this.value.release_qualification.signed_artifacts}<br>Real devices: ${this.value.release_qualification.real_devices}</p>`);}
}
const escapeHtml=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));

export const REQUIRED_GOLDEN_CHECKS=["vault_created","node_ready","desktop_boundary","browser_capture","mobile_capture","duplicate_detection","retrieval","cited_answer","trace_complete","intelligence_routing","prompt_injection_quarantined","restart_persistence","sync_convergence","revocation","backup_verified","restore_verified","portable_export","state_digest"];
