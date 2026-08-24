import { createHash } from "node:crypto";

export const KERNEL_VERSION="1.0" as const;
export const KERNEL_KINDS=["cko","entity","claim","relationship","event","state","memory","provenance","authority","permission"] as const;
export const LIFECYCLE_STATES=["active","archived","superseded","tombstoned"] as const;
export const SENSITIVITY_LEVELS=["public","internal","confidential","restricted","sealed"] as const;
export const AUTHORITY_STATES=["observed","reported","inferred","verified","approved","official","disputed","superseded","hypothetical"] as const;
export const PERMISSION_OPERATIONS=["discover","read","retrieve","reason","derive","write","export","admin"] as const;

export type KernelKind=typeof KERNEL_KINDS[number];
export type LifecycleState=typeof LIFECYCLE_STATES[number];
export type SensitivityLevel=typeof SENSITIVITY_LEVELS[number];
export type AuthorityState=typeof AUTHORITY_STATES[number];
export type PermissionOperation=typeof PERMISSION_OPERATIONS[number];
export type KernelRef={kind:KernelKind;id:string;uri?:string};
export type SemanticKernelRecord={
 kernel_version:typeof KERNEL_VERSION;id:string;node_id:string;workspace_id:string;kind:KernelKind;canonical_uri:string;
 lifecycle:LifecycleState;sensitivity:SensitivityLevel;authority:AuthorityState;confidence:number|null;
 payload:Record<string,unknown>;observed_at:string;effective_from:string|null;effective_until:string|null;
 supersedes_id:string|null;policy_id:string|null;provenance_event_id:string|null;created_by:string|null;created_at:string;updated_at:string;
};
export type KernelRecordInput=Omit<SemanticKernelRecord,"kernel_version"|"canonical_uri"|"created_at"|"updated_at">;

const UUID_V7=/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REQUIRED:Record<KernelKind,string[]>={
 cko:["title","object_type"],entity:["name","entity_type"],claim:["subject","predicate","object"],relationship:["source","predicate","target"],
 event:["event_type","participants","occurred_at"],state:["subject","predicate","value","effective_from"],memory:["memory_type","title","source_event_ids"],
 provenance:["event_type","outputs"],authority:["subject","status","source_refs"],permission:["effect","operations","principal_ref","resource_ref"]
};
const transitions:Record<LifecycleState,readonly LifecycleState[]>={active:["archived","superseded","tombstoned"],archived:["active","tombstoned"],superseded:["tombstoned"],tombstoned:[]};

function member<T extends readonly string[]>(values:T,value:unknown):value is T[number]{return typeof value==="string"&&(values as readonly string[]).includes(value);}
function date(value:unknown){return typeof value==="string"&&!Number.isNaN(Date.parse(value));}
function fail(code:string):never{throw Object.assign(new Error(code),{statusCode:400});}
export function validateLifecycleTransition(from:LifecycleState,to:LifecycleState){if(from===to)return;if(!transitions[from].includes(to))fail("KERNEL_LIFECYCLE_TRANSITION_INVALID");}
export function sensitivityRank(value:SensitivityLevel){return SENSITIVITY_LEVELS.indexOf(value);}
export function canDisclose(record:SensitivityLevel,ceiling:SensitivityLevel){return sensitivityRank(record)<=sensitivityRank(ceiling);}
export function authorityRank(value:AuthorityState){return({hypothetical:0,inferred:1,reported:2,observed:3,disputed:3,verified:4,approved:5,official:6,superseded:-1}as Record<AuthorityState,number>)[value];}
export function stableKernelDigest(value:unknown){const normalize=(v:any):any=>Array.isArray(v)?v.map(normalize):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;return createHash("sha256").update(JSON.stringify(normalize(value))).digest("hex");}

export function validateKernelRecord(input:KernelRecordInput){
 if(!input||typeof input!=="object")fail("KERNEL_RECORD_REQUIRED");
 for(const [name,value] of [["ID",input.id],["NODE_ID",input.node_id],["WORKSPACE_ID",input.workspace_id]] as const)if(!UUID_V7.test(value))fail(`KERNEL_${name}_INVALID`);
 if(!member(KERNEL_KINDS,input.kind))fail("KERNEL_KIND_INVALID");
 if(!member(LIFECYCLE_STATES,input.lifecycle))fail("KERNEL_LIFECYCLE_INVALID");
 if(!member(SENSITIVITY_LEVELS,input.sensitivity))fail("KERNEL_SENSITIVITY_INVALID");
 if(!member(AUTHORITY_STATES,input.authority))fail("KERNEL_AUTHORITY_INVALID");
 if(input.confidence!==null&&(!Number.isFinite(input.confidence)||input.confidence<0||input.confidence>1))fail("KERNEL_CONFIDENCE_INVALID");
 if(!input.payload||typeof input.payload!=="object"||Array.isArray(input.payload))fail("KERNEL_PAYLOAD_INVALID");
 for(const key of REQUIRED[input.kind])if(!(key in input.payload))fail(`KERNEL_PAYLOAD_${key.toUpperCase()}_REQUIRED`);
 if(!date(input.observed_at))fail("KERNEL_OBSERVED_AT_INVALID");
 if(input.effective_from!==null&&!date(input.effective_from))fail("KERNEL_EFFECTIVE_FROM_INVALID");
 if(input.effective_until!==null&&!date(input.effective_until))fail("KERNEL_EFFECTIVE_UNTIL_INVALID");
 if(input.effective_from&&input.effective_until&&new Date(input.effective_until)<new Date(input.effective_from))fail("KERNEL_EFFECTIVE_INTERVAL_INVALID");
 if(input.supersedes_id!==null&&!UUID_V7.test(input.supersedes_id))fail("KERNEL_SUPERSEDES_ID_INVALID");
 if(input.kind==="permission"){
  const p=input.payload as any;if(!["allow","deny"].includes(p.effect)||!Array.isArray(p.operations)||p.operations.some((x:unknown)=>!member(PERMISSION_OPERATIONS,x)))fail("KERNEL_PERMISSION_INVALID");
 }
 return input;
}
