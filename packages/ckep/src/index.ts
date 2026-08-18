import { createHash } from "node:crypto";

export const CKEP_VERSION = "0.1" as const;
export const CKEP_EVENT_TYPES = [
  "OBJECT_CREATED","OBJECT_UPDATED","OBJECT_DELETED","ARTIFACT_VERSIONED",
  "CLAIM_INTRODUCED","CLAIM_CONFIRMED","CLAIM_ASSERTED","CLAIM_MODIFIED","CLAIM_CONTRADICTED","CLAIM_CHALLENGED","CLAIM_SUPERSEDED","CLAIM_WITHDRAWN","CLAIM_RETRACTED",
  "CONTRADICTION_DETECTED","CONTRADICTION_RESOLVED","RELATIONSHIP_CREATED","RELATIONSHIP_REMOVED",
  "DECISION_CREATED","DECISION_CHANGED","DEADLINE_CHANGED","ENTITY_ADDED",
  "SOURCE_CONNECTED","SOURCE_CHANGED","SOURCE_DELETED","SOURCE_STALE","SOURCE_RECOVERED",
  "KNOWLEDGE_BECAME_STALE","KNOWLEDGE_HEALTH_DEGRADED","KNOWLEDGE_HEALTH_RECOVERED","RISK_DETECTED"
] as const;
export type CkepEventType = typeof CKEP_EVENT_TYPES[number];
export type CkepUri = `cke://${string}`;
export type CkUri = `ck://${string}`;
export interface CkepResourceRef { uri:CkUri; type:string }
export interface CkepStateRef { uri?:CkUri; value?:unknown; version?:number }
export interface CkepImpact { uri:CkUri; relationship?:string; severity?:"info"|"low"|"medium"|"high"|"critical"; confidence?:number }
export interface CkepProvenance { actor?:{type:string;uri?:CkUri}; method:string; derived_from?:CkUri[]; artifact?:CkUri; artifact_version?:number; fragments?:CkUri[]; metadata?:Record<string,unknown> }
export interface CkepCausality { caused_by?:CkepUri[]; correlation_id?:string; root_event?:CkepUri }
export interface CkepIntegrity { sequence:number; previous_event?:CkepUri|null; idempotency_key:string; hash:string }
export interface CkepEnvelope {
  ckep:typeof CKEP_VERSION; event:{id:CkepUri;type:CkepEventType}; scope:{node:CkUri;workspace:CkUri}; subject:CkepResourceRef;
  transition?:{previous?:CkepStateRef|null;current?:CkepStateRef|null}; temporal:{observed_at:string;effective_at?:string|null};
  evidence?:{sources?:CkUri[];artifact?:CkUri;artifact_version?:number;fragments?:CkUri[]}; epistemics:{confidence:number;status?:string};
  impact?:CkepImpact[]; provenance:CkepProvenance; causality?:CkepCausality; integrity:CkepIntegrity; extensions?:Record<string,unknown>;
}

const EVENT_SET=new Set<string>(CKEP_EVENT_TYPES);
const CK_RE=/^ck:\/\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%-]+)+$/;
const CKE_RE=/^cke:\/\/[A-Za-z0-9._~-]+\/workspaces\/[A-Za-z0-9._~%-]+\/events\/[A-Za-z0-9._~%-]+$/;
const iso=(value:string)=>!Number.isNaN(Date.parse(value))&&/^\d{4}-\d{2}-\d{2}T/.test(value);
const confidence=(value:number)=>Number.isFinite(value)&&value>=0&&value<=1;
const streamPrefixFromScope=(scope:CkepEnvelope["scope"]):string|null=>{
  const node=/^ck:\/\/([^/]+)\/nodes\/[^/]+$/.exec(scope.node);
  const workspace=/^ck:\/\/([^/]+)\/workspaces\/([^/]+)$/.exec(scope.workspace);
  if(!node||!workspace||node[1]!==workspace[1])return null;
  return `cke://${node[1]}/workspaces/${workspace[2]}/events/`;
};
const inStream=(uri:string,prefix:string|null)=>!!prefix&&uri.startsWith(prefix)&&CKE_RE.test(uri);

export function canonicalEventUri(authority:string,workspace:string,eventId:string):CkepUri {
  const valid=/^[A-Za-z0-9._~-]+$/;
  for(const [name,value] of [["authority",authority],["workspace",workspace],["event",eventId]] as const){if(!value.trim())throw new Error("CKEP_ID_COMPONENT_REQUIRED");if(!valid.test(value.trim()))throw new Error(`CKEP_ID_COMPONENT_INVALID:${name}`);}
  return `cke://${authority.trim()}/workspaces/${workspace.trim()}/events/${eventId.trim()}` as CkepUri;
}
function sortValue(value:unknown):unknown {if(Array.isArray(value))return value.map(sortValue);if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,sortValue(v)]));return value;}
export function canonicalJson(value:unknown):string{return JSON.stringify(sortValue(value));}
export function computeCkepHash(event:Omit<CkepEnvelope,"integrity">&{integrity:Omit<CkepIntegrity,"hash">|CkepIntegrity}):string{const copy=JSON.parse(JSON.stringify(event));if(copy.integrity)delete copy.integrity.hash;return createHash("sha256").update(canonicalJson(copy)).digest("hex");}
export function computeIdempotencyKey(input:{scope:CkepEnvelope["scope"];eventType:CkepEventType;subject:CkepResourceRef;observedAt:string;transition?:CkepEnvelope["transition"]}):string{return createHash("sha256").update(canonicalJson(input)).digest("hex");}

export function validateCkep(input:unknown):{ok:true;event:CkepEnvelope}|{ok:false;errors:string[]}{
  const e=input as Partial<CkepEnvelope>,errors:string[]=[];if(!e||typeof e!=="object")return{ok:false,errors:["CKEP_OBJECT_REQUIRED"]};
  if(e.ckep!==CKEP_VERSION)errors.push("CKEP_VERSION_UNSUPPORTED");if(!e.event||!CKE_RE.test(String(e.event.id??"")))errors.push("CKEP_EVENT_ID_INVALID");if(!e.event||!EVENT_SET.has(String(e.event.type??"")))errors.push("CKEP_EVENT_TYPE_INVALID");
  if(!e.scope||!CK_RE.test(String(e.scope.node??""))||!CK_RE.test(String(e.scope.workspace??"")))errors.push("CKEP_SCOPE_INVALID");
  const prefix=e.scope?streamPrefixFromScope(e.scope as CkepEnvelope["scope"]):null;if(e.scope&&!prefix)errors.push("CKEP_SCOPE_AUTHORITY_MISMATCH");if(e.event&&prefix&&!inStream(String(e.event.id),prefix))errors.push("CKEP_EVENT_SCOPE_MISMATCH");
  if(!e.subject||!CK_RE.test(String(e.subject.uri??""))||!String(e.subject.type??"").trim())errors.push("CKEP_SUBJECT_INVALID");
  if(!e.temporal||!iso(String(e.temporal.observed_at??"")))errors.push("CKEP_OBSERVED_AT_INVALID");if(e.temporal?.effective_at!=null&&!iso(String(e.temporal.effective_at)))errors.push("CKEP_EFFECTIVE_AT_INVALID");
  if(!e.epistemics||!confidence(Number(e.epistemics.confidence)))errors.push("CKEP_CONFIDENCE_INVALID");if(!e.provenance||!String(e.provenance.method??"").trim())errors.push("CKEP_PROVENANCE_METHOD_REQUIRED");
  if(!e.integrity||!Number.isSafeInteger(e.integrity.sequence)||Number(e.integrity.sequence)<1)errors.push("CKEP_SEQUENCE_INVALID");if(!e.integrity||!/^[a-f0-9]{64}$/i.test(String(e.integrity.idempotency_key??"")))errors.push("CKEP_IDEMPOTENCY_KEY_INVALID");if(!e.integrity||!/^[a-f0-9]{64}$/i.test(String(e.integrity.hash??"")))errors.push("CKEP_HASH_INVALID");
  if(e.integrity?.sequence===1&&e.integrity.previous_event)errors.push("CKEP_FIRST_EVENT_PREVIOUS_FORBIDDEN");if(e.integrity?.sequence&&e.integrity.sequence>1&&!e.integrity.previous_event)errors.push("CKEP_PREVIOUS_EVENT_REQUIRED");if(e.integrity?.previous_event&&(!CKE_RE.test(String(e.integrity.previous_event))||!inStream(String(e.integrity.previous_event),prefix)))errors.push("CKEP_PREVIOUS_EVENT_SCOPE_MISMATCH");
  for(const uri of e.causality?.caused_by??[])if(!CKE_RE.test(String(uri))||!inStream(String(uri),prefix))errors.push("CKEP_CAUSE_SCOPE_MISMATCH");if(e.causality?.root_event&&(!CKE_RE.test(String(e.causality.root_event))||!inStream(String(e.causality.root_event),prefix)))errors.push("CKEP_ROOT_EVENT_SCOPE_MISMATCH");
  for(const item of e.impact??[]){if(!CK_RE.test(String(item.uri)))errors.push("CKEP_IMPACT_URI_INVALID");if(item.confidence!=null&&!confidence(Number(item.confidence)))errors.push("CKEP_IMPACT_CONFIDENCE_INVALID");}
  for(const uri of [...(e.evidence?.sources??[]),...(e.evidence?.fragments??[]),...(e.provenance?.derived_from??[])])if(!CK_RE.test(String(uri)))errors.push("CKEP_EVIDENCE_URI_INVALID");if(e.evidence?.artifact&&!CK_RE.test(String(e.evidence.artifact)))errors.push("CKEP_ARTIFACT_URI_INVALID");
  if(errors.length===0&&e.integrity&&computeCkepHash(e as CkepEnvelope)!==e.integrity.hash)errors.push("CKEP_HASH_MISMATCH");return errors.length?{ok:false,errors}:{ok:true,event:e as CkepEnvelope};
}

export interface LegacyKnowledgeEventRow{id:string;event_type:string;subject_type:string;subject_id:string;cko_id?:string|null;previous_claim_id?:string|null;current_claim_id?:string|null;knowledge_diff_id?:string|null;summary:string;details?:Record<string,unknown>;confidence:number;observed_at:string|Date;effective_at?:string|Date|null}
export interface LegacyImpactRow{impacted_type:string;impacted_id:string;impact_kind:string;confidence:number;details?:Record<string,unknown>}
const LEGACY_TYPE_MAP:Record<string,CkepEventType>={CLAIM_INTRODUCED:"CLAIM_INTRODUCED",CLAIM_CONFIRMED:"CLAIM_CONFIRMED",CLAIM_MODIFIED:"CLAIM_MODIFIED",CLAIM_CONTRADICTED:"CLAIM_CONTRADICTED",CLAIM_SUPERSEDED:"CLAIM_SUPERSEDED",CLAIM_WITHDRAWN:"CLAIM_WITHDRAWN",SOURCE_CHANGED:"SOURCE_CHANGED",SOURCE_DELETED:"SOURCE_DELETED",DECISION_CHANGED:"DECISION_CHANGED",DEADLINE_CHANGED:"DEADLINE_CHANGED",ENTITY_ADDED:"ENTITY_ADDED",RISK_DETECTED:"RISK_DETECTED"};
export function mapKnowledgeEventToCkep(input:{authority:string;workspaceId:string;nodeId:string;row:LegacyKnowledgeEventRow;impacts?:LegacyImpactRow[];sequence:number;previousEventId?:string|null;causedBy?:string[]}):CkepEnvelope{
  const type=LEGACY_TYPE_MAP[input.row.event_type];if(!type)throw new Error(`CKEP_LEGACY_EVENT_TYPE_UNMAPPED:${input.row.event_type}`);if(input.sequence===1&&input.previousEventId)throw new Error("CKEP_FIRST_EVENT_PREVIOUS_FORBIDDEN");if(input.sequence>1&&!input.previousEventId)throw new Error("CKEP_PREVIOUS_EVENT_REQUIRED");
  const node=`ck://${input.authority}/nodes/${input.nodeId}` as CkUri,workspace=`ck://${input.authority}/workspaces/${input.workspaceId}` as CkUri,subject=`ck://${input.authority}/${input.row.subject_type}/${input.row.subject_id}` as CkUri,eventId=canonicalEventUri(input.authority,input.workspaceId,input.row.id),observedAt=new Date(input.row.observed_at).toISOString();
  const transition=input.row.previous_claim_id||input.row.current_claim_id?{previous:input.row.previous_claim_id?{uri:`ck://${input.authority}/claims/${input.row.previous_claim_id}` as CkUri}:null,current:input.row.current_claim_id?{uri:`ck://${input.authority}/claims/${input.row.current_claim_id}` as CkUri}:null}:undefined;
  const base:Omit<CkepEnvelope,"integrity">={ckep:CKEP_VERSION,event:{id:eventId,type},scope:{node,workspace},subject:{uri:subject,type:input.row.subject_type},transition,temporal:{observed_at:observedAt,effective_at:input.row.effective_at?new Date(input.row.effective_at).toISOString():null},epistemics:{confidence:Number(input.row.confidence)},impact:(input.impacts??[]).map(x=>({uri:`ck://${input.authority}/${x.impacted_type}/${x.impacted_id}` as CkUri,relationship:x.impact_kind,severity:x.impact_kind==="invalidated"?"critical":x.impact_kind==="requires_review"?"high":x.impact_kind==="stale"?"medium":"low",confidence:Number(x.confidence)})),provenance:{method:"legacy_knowledge_events_mapping",derived_from:[...(input.row.cko_id?[`ck://${input.authority}/cko/${input.row.cko_id}` as CkUri]:[]),...(input.row.knowledge_diff_id?[`ck://${input.authority}/knowledge-diffs/${input.row.knowledge_diff_id}` as CkUri]:[])],metadata:{legacy_summary:input.row.summary,legacy_details:input.row.details??{}}},causality:input.causedBy?.length?{caused_by:input.causedBy.map(id=>canonicalEventUri(input.authority,input.workspaceId,id)),root_event:canonicalEventUri(input.authority,input.workspaceId,input.causedBy[0])}:undefined};
  const idempotency_key=computeIdempotencyKey({scope:base.scope,eventType:type,subject:base.subject,observedAt,transition}),integrityNoHash={sequence:input.sequence,previous_event:input.previousEventId?canonicalEventUri(input.authority,input.workspaceId,input.previousEventId):null,idempotency_key};const envelope={...base,integrity:{...integrityNoHash,hash:""}} as CkepEnvelope;envelope.integrity.hash=computeCkepHash(envelope);return envelope;
}
