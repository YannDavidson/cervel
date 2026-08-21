import{createHash,randomBytes}from"node:crypto";
export type GatewayScope="retrieval:read"|"reasoning:execute"|"trace:read"|"write:propose"|"write:approve"|"audit:read";
export type ExternalClientKind="chatgpt"|"claude"|"gemini"|"ide"|"agent"|"mcp";
export type DisclosureBudget={max_fragments:number;max_bytes:number;max_sensitive_fragments:number;period:"request"|"day"|"month"};
export type AccessGrant={client_id:string;node_id:string;workspace_id?:string|null;principal_id:string;scopes:GatewayScope[];library_ids:string[];expires_at:string;revoked_at?:string|null;budget:DisclosureBudget};
export type DisclosureItem={id:string;bytes:number;sensitive:boolean;library_id?:string|null};
export type AccessDecision={allowed:boolean;code:string;disclosed_ids:string[];bytes:number;sensitive_count:number};
export const tokenDigest=(token:string)=>createHash("sha256").update(token).digest("hex");
export const issueOpaqueToken=()=>`cvl_${randomBytes(32).toString("base64url")}`;
export function authorize(grant:AccessGrant,scope:GatewayScope,items:DisclosureItem[]=[]):AccessDecision{
 if(grant.revoked_at)return{allowed:false,code:"GRANT_REVOKED",disclosed_ids:[],bytes:0,sensitive_count:0};
 if(Date.parse(grant.expires_at)<=Date.now())return{allowed:false,code:"GRANT_EXPIRED",disclosed_ids:[],bytes:0,sensitive_count:0};
 if(!grant.scopes.includes(scope))return{allowed:false,code:"SCOPE_DENIED",disclosed_ids:[],bytes:0,sensitive_count:0};
 const allowed=items.filter(x=>!x.library_id||!grant.library_ids.length||grant.library_ids.includes(x.library_id));let bytes=0,sensitive=0;const disclosed:string[]=[];
 for(const x of allowed){if(disclosed.length>=grant.budget.max_fragments||bytes+x.bytes>grant.budget.max_bytes||(x.sensitive&&sensitive>=grant.budget.max_sensitive_fragments))continue;disclosed.push(x.id);bytes+=x.bytes;if(x.sensitive)sensitive++;}
 return{allowed:true,code:disclosed.length<allowed.length?"BUDGET_PARTIAL":"ALLOWED",disclosed_ids:disclosed,bytes,sensitive_count:sensitive};
}
export type WriteProposal={id:string;grant_id:string;tool:string;arguments:unknown;input_digest:string;status:"pending"|"approved"|"rejected"|"executed"|"expired"};
export function proposeWrite(input:{id:string;grant_id:string;tool:string;arguments:unknown}):WriteProposal{return{...input,input_digest:tokenDigest(JSON.stringify({tool:input.tool,arguments:input.arguments})),status:"pending"};}
export function approveWrite(proposal:WriteProposal,approvedDigest:string):WriteProposal{if(proposal.status!=="pending")throw new Error("PROPOSAL_NOT_PENDING");if(proposal.input_digest!==approvedDigest)throw new Error("PROPOSAL_CHANGED_AFTER_REVIEW");return{...proposal,status:"approved"};}
export const MCP_TOOLS=[
 {name:"cervel_search",description:"Permission-scoped retrieval from a CERVEL Vault",required_scope:"retrieval:read",read_only:true,inputSchema:{type:"object",required:["query"],properties:{query:{type:"string"},limit:{type:"integer",minimum:1,maximum:50}}}},
 {name:"cervel_reason",description:"Run cited CERVEL reasoning over an approved retrieval scope",required_scope:"reasoning:execute",read_only:true,inputSchema:{type:"object",required:["query"],properties:{query:{type:"string"},max_evidence_items:{type:"integer",minimum:1,maximum:50}}}},
 {name:"cervel_trace",description:"Inspect an Answer provenance and reasoning trace",required_scope:"trace:read",read_only:true,inputSchema:{type:"object",required:["answer_id"],properties:{answer_id:{type:"string"}}}},
 {name:"cervel_propose_write",description:"Propose a Vault mutation for human approval; never writes directly",required_scope:"write:propose",read_only:false,inputSchema:{type:"object",required:["operation","payload"],properties:{operation:{type:"string"},payload:{type:"object"}}}}
]as const;
export function mcpCapabilities(){return{protocolVersion:"2025-06-18",serverInfo:{name:"cervel-mcp",version:"0.1.0"},capabilities:{tools:{listChanged:false}}};}
