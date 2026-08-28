import { createHash, randomBytes } from "node:crypto";

export const EMBODIMENT_PROTOCOL = "cervel-embodiment/v0.1" as const;
export const CAPTURE_PROTOCOL = "cervel-capture/v1" as const;
export const IPC_PROTOCOL = "cervel-ipc/v0.1" as const;

export const EMBODIMENT_KINDS = ["browser_extension","desktop","mobile","agent","api","machine"] as const;
export type CervelEmbodimentKind = typeof EMBODIMENT_KINDS[number];

export const EMBODIMENT_CAPABILITIES = [
  "capture.page","capture.selection","capture.image","capture.link","capture.pdf","capture.note","capture.voice","capture.scan","capture.file","capture.memory",
  "vault.read","vault.write","vault.search","graph.read","graph.write","cortex.ask","trace.read","sync.read","sync.write","device.pair","agent.invoke"
] as const;
export type EmbodimentCapability = typeof EMBODIMENT_CAPABILITIES[number];

export type EmbodimentScope = {
  vault_id: string;
  corpora?: string[];
  collections?: string[];
  projects?: string[];
  allow_sensitive?: boolean;
};

export type EmbodimentPermission = {
  capability: EmbodimentCapability;
  effect: "allow"|"deny"|"approval_required";
  scope?: EmbodimentScope;
};

export type CervelEmbodiment = {
  protocol: typeof EMBODIMENT_PROTOCOL;
  embodiment_id: string;
  device_id: string;
  kind: CervelEmbodimentKind;
  display_name: string;
  app_version?: string;
  platform?: string;
  capabilities: EmbodimentCapability[];
  permissions: EmbodimentPermission[];
  signing_public_key?: string;
  encryption_public_key?: string;
  enrolled_at: string;
  last_seen_at?: string;
  revoked_at?: string;
  metadata?: Record<string,string>;
};

export type EnrollmentRequest = {
  protocol: typeof EMBODIMENT_PROTOCOL;
  request_id: string;
  embodiment: Omit<CervelEmbodiment,"permissions"|"enrolled_at"|"revoked_at">;
  requested_permissions: EmbodimentPermission[];
  pairing_nonce: string;
  issued_at: string;
  expires_at: string;
};

export type EnrollmentDecision = {
  protocol: typeof EMBODIMENT_PROTOCOL;
  request_id: string;
  embodiment_id: string;
  device_id: string;
  approved: boolean;
  permissions: EmbodimentPermission[];
  decided_at: string;
  authorizer_id: string;
};

export type LocalNodeAdvertisement = {
  protocol: typeof EMBODIMENT_PROTOCOL;
  node_id: string;
  node_name: string;
  endpoint: string;
  transport: "loopback"|"lan"|"native_messaging"|"custom_scheme";
  vault_ids: string[];
  capabilities: EmbodimentCapability[];
  pairing_required: boolean;
  public_key_fingerprint?: string;
  advertised_at: string;
  expires_at: string;
};

export type PairingChallenge = {
  protocol: typeof EMBODIMENT_PROTOCOL;
  pairing_id: string;
  node_id: string;
  embodiment_id: string;
  challenge: string;
  issued_at: string;
  expires_at: string;
};

export type CaptureKind = "page"|"selection"|"image"|"link"|"pdf"|"note"|"voice"|"scan"|"file"|"memory";
export type CaptureArtifact = {
  kind: CaptureKind;
  mime_type?: string;
  source_url?: string;
  canonical_url?: string;
  title?: string;
  text?: string;
  content_base64?: string;
  file_name?: string;
  captured_at: string;
  metadata?: Record<string,string|number|boolean|null>;
};

export type CaptureIntent = {
  note?: string;
  tags?: string[];
  project_ref?: string;
  corpus_hint?: string;
  collection_hint?: string;
  privacy?: "default"|"private"|"sealed";
};

export type CaptureEnvelope = {
  protocol: typeof CAPTURE_PROTOCOL;
  capture_id: string;
  sync_id: string;
  embodiment_id: string;
  device_id: string;
  vault_id: string;
  artifact: CaptureArtifact;
  intent?: CaptureIntent;
  provenance: {
    acquired_by: CervelEmbodimentKind;
    trust: "user_authored"|"local_artifact"|"untrusted_external_content";
    instruction_policy: "never_execute";
  };
};

export type OfflineCaptureEnvelope = {
  protocol: typeof CAPTURE_PROTOCOL;
  queue_id: string;
  sequence: number;
  capture: CaptureEnvelope;
  queued_at: string;
  retry_count: number;
  next_attempt_at?: string;
};

export type IpcRequest<T=unknown> = {
  protocol: typeof IPC_PROTOCOL;
  request_id: string;
  embodiment_id: string;
  method: string;
  params?: T;
  issued_at: string;
};
export type IpcResponse<T=unknown> = {
  protocol: typeof IPC_PROTOCOL;
  request_id: string;
  ok: boolean;
  result?: T;
  error?: { code:string; message:string };
  completed_at: string;
};

export const CERVEL_UI_TOKENS = {
  color: {
    ink:"#071A35", blue:"#087BC1", cyan:"#13C9CF", violet:"#7B2BE2", gradientMid:"#11BDC8",
    background:"#FFFFFF", surfaceSoft:"#F5F7FA", surfaceProduct:"#F6F8FB", textSecondary:"#68778A", textTertiary:"#8794A5",
    surfaceDark:"#06172F", surfaceWorld:"#030D1C"
  },
  radius: { sm:10, md:18, lg:26, pill:999 },
  motion: { fastMs:180, standardMs:240, largeMs:550, easing:"cubic-bezier(.22,.61,.36,1)" }
} as const;

const clean=(value:string,max:number)=>value.normalize("NFKC").replace(/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,"").trim().slice(0,max);
const opaqueId=(prefix:string,seed?:string)=>`${prefix}_${createHash("sha256").update(seed??randomBytes(32)).digest("base64url").slice(0,32)}`;
export const createEmbodimentId=(seed?:string)=>opaqueId("emb",seed);
export const createDeviceId=(seed?:string)=>opaqueId("dev",seed);
export const createCaptureId=(seed?:string)=>opaqueId("cap",seed);
export const createSyncReadyId=(seed?:string)=>opaqueId("sync",seed);
export const createQueueId=(seed?:string)=>opaqueId("queue",seed);

export function validateEmbodiment(input:CervelEmbodiment):CervelEmbodiment{
  if(input.protocol!==EMBODIMENT_PROTOCOL||!EMBODIMENT_KINDS.includes(input.kind))throw new Error("EMBODIMENT_PROTOCOL_INVALID");
  if(!/^emb_[A-Za-z0-9_-]{20,64}$/.test(input.embodiment_id)||!/^dev_[A-Za-z0-9_-]{20,64}$/.test(input.device_id))throw new Error("EMBODIMENT_ID_INVALID");
  const capabilities=[...new Set(input.capabilities)].filter((x):x is EmbodimentCapability=>EMBODIMENT_CAPABILITIES.includes(x));
  if(capabilities.length!==input.capabilities.length)throw new Error("EMBODIMENT_CAPABILITY_INVALID");
  const permissions=input.permissions.map(permission=>{
    if(!EMBODIMENT_CAPABILITIES.includes(permission.capability))throw new Error("EMBODIMENT_PERMISSION_INVALID");
    if(!["allow","deny","approval_required"].includes(permission.effect))throw new Error("EMBODIMENT_PERMISSION_EFFECT_INVALID");
    return {...permission,scope:permission.scope?{...permission.scope,vault_id:clean(permission.scope.vault_id,120),corpora:permission.scope.corpora?.slice(0,64).map(v=>clean(v,120)),collections:permission.scope.collections?.slice(0,64).map(v=>clean(v,120)),projects:permission.scope.projects?.slice(0,64).map(v=>clean(v,120))}:undefined};
  });
  return {...input,display_name:clean(input.display_name,200),app_version:input.app_version?clean(input.app_version,80):undefined,platform:input.platform?clean(input.platform,120):undefined,capabilities,permissions,enrolled_at:new Date(input.enrolled_at).toISOString(),last_seen_at:input.last_seen_at?new Date(input.last_seen_at).toISOString():undefined,revoked_at:input.revoked_at?new Date(input.revoked_at).toISOString():undefined};
}

export function isAllowed(embodiment:CervelEmbodiment,capability:EmbodimentCapability,vaultId:string):"allow"|"deny"|"approval_required"{
  if(embodiment.revoked_at)return "deny";
  const matches=embodiment.permissions.filter(p=>p.capability===capability&&(!p.scope||p.scope.vault_id===vaultId));
  if(matches.some(p=>p.effect==="deny"))return "deny";
  if(matches.some(p=>p.effect==="approval_required"))return "approval_required";
  return matches.some(p=>p.effect==="allow")?"allow":"deny";
}

export function validateCapture(input:CaptureEnvelope):CaptureEnvelope{
  if(input.protocol!==CAPTURE_PROTOCOL)throw new Error("CAPTURE_PROTOCOL_INVALID");
  if(!/^cap_[A-Za-z0-9_-]{20,64}$/.test(input.capture_id)||!/^sync_[A-Za-z0-9_-]{20,64}$/.test(input.sync_id))throw new Error("CAPTURE_ID_INVALID");
  if(!/^emb_[A-Za-z0-9_-]{20,64}$/.test(input.embodiment_id)||!/^dev_[A-Za-z0-9_-]{20,64}$/.test(input.device_id))throw new Error("CAPTURE_EMBODIMENT_INVALID");
  const artifact={...input.artifact,title:input.artifact.title?clean(input.artifact.title,500):undefined,text:input.artifact.text?clean(input.artifact.text,2_000_000):undefined,file_name:input.artifact.file_name?clean(input.artifact.file_name,500):undefined,captured_at:new Date(input.artifact.captured_at).toISOString()};
  if(artifact.content_base64&&Buffer.from(artifact.content_base64,"base64").length>16*1024*1024)throw new Error("CAPTURE_CONTENT_TOO_LARGE");
  if(!artifact.text&&!artifact.content_base64&&!artifact.source_url)throw new Error("CAPTURE_CONTENT_REQUIRED");
  return {...input,artifact,provenance:{...input.provenance,instruction_policy:"never_execute"}};
}

export function createOfflineEnvelope(capture:CaptureEnvelope,sequence:number,now=new Date()):OfflineCaptureEnvelope{
  if(!Number.isSafeInteger(sequence)||sequence<1)throw new Error("OFFLINE_SEQUENCE_INVALID");
  return {protocol:CAPTURE_PROTOCOL,queue_id:createQueueId(`${capture.capture_id}:${sequence}`),sequence,capture:validateCapture(capture),queued_at:now.toISOString(),retry_count:0};
}

export function validateAdvertisement(input:LocalNodeAdvertisement,now=Date.now()):LocalNodeAdvertisement{
  if(input.protocol!==EMBODIMENT_PROTOCOL)throw new Error("DISCOVERY_PROTOCOL_INVALID");
  if(!input.endpoint||!new URL(input.endpoint))throw new Error("DISCOVERY_ENDPOINT_INVALID");
  if(new Date(input.expires_at).getTime()<=now)throw new Error("DISCOVERY_ADVERTISEMENT_EXPIRED");
  return {...input,node_id:clean(input.node_id,120),node_name:clean(input.node_name,200),vault_ids:input.vault_ids.slice(0,32).map(v=>clean(v,120)),advertised_at:new Date(input.advertised_at).toISOString(),expires_at:new Date(input.expires_at).toISOString()};
}

export function createPairingChallenge(nodeId:string,embodimentId:string,ttlMs=120_000,now=new Date()):PairingChallenge{
  if(ttlMs<10_000||ttlMs>10*60_000)throw new Error("PAIRING_TTL_INVALID");
  return {protocol:EMBODIMENT_PROTOCOL,pairing_id:opaqueId("pair",`${nodeId}:${embodimentId}:${now.toISOString()}`),node_id:nodeId,embodiment_id:embodimentId,challenge:randomBytes(32).toString("base64url"),issued_at:now.toISOString(),expires_at:new Date(now.getTime()+ttlMs).toISOString()};
}
