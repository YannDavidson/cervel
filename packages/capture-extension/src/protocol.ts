import { createHash } from "node:crypto";

export const CAPTURE_PROTOCOL = "cervel-capture/v0.1" as const;
export const CAPTURE_TYPES = ["page","selection","image","link","pdf"] as const;
export type CaptureType = typeof CAPTURE_TYPES[number];

export type BrowserEvidence = {
  protocol: typeof CAPTURE_PROTOCOL;
  request_id: string;
  capture_type: CaptureType;
  source_url: string;
  canonical_url: string;
  title: string;
  author?: string;
  published_at?: string;
  captured_at: string;
  content_text?: string;
  content_base64?: string;
  mime_type: string;
  selection_context?: { before?: string; selected: string; after?: string };
  image?: { source_url: string; alt?: string; width?: number; height?: number };
  user: { note?: string; tags?: string[]; capture_intent?: string; project_ref?: string };
  provenance: { acquisition: "browser_extension"; browser: string; page_language?: string; referrer?: string; trust: "untrusted_web_content"; instruction_policy: "never_execute" };
};

const clean=(value:string,max:number)=>value.normalize("NFKC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,"").trim().slice(0,max);
export function canonicalizeUrl(value:string):string { const url=new URL(value);if(!["http:","https:"].includes(url.protocol))throw new Error("CAPTURE_URL_PROTOCOL_INVALID");url.hash="";for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key))url.searchParams.delete(key);url.hostname=url.hostname.toLowerCase();return url.toString(); }
export function validateEvidence(input:BrowserEvidence):BrowserEvidence {
  if(input.protocol!==CAPTURE_PROTOCOL||!CAPTURE_TYPES.includes(input.capture_type))throw new Error("CAPTURE_PROTOCOL_INVALID");
  const source=canonicalizeUrl(input.source_url),canonical=canonicalizeUrl(input.canonical_url||source);
  if(new URL(source).origin!==new URL(canonical).origin)throw new Error("CAPTURE_CANONICAL_ORIGIN_MISMATCH");
  if(!input.request_id||input.request_id.length>100)throw new Error("CAPTURE_REQUEST_ID_INVALID");
  const text=input.content_text===undefined?undefined:clean(input.content_text,2_000_000),bytes=input.content_base64?Buffer.from(input.content_base64,"base64"):null;
  if(bytes&&bytes.length>15*1024*1024)throw new Error("CAPTURE_CONTENT_TOO_LARGE");
  if(!text&&!bytes&&!input.image?.source_url&&input.capture_type!=="link"&&input.capture_type!=="pdf")throw new Error("CAPTURE_CONTENT_REQUIRED");
  const tags=[...new Set((input.user?.tags??[]).map(tag=>clean(tag,64).toLowerCase()).filter(Boolean))].slice(0,32);
  return {...input,source_url:source,canonical_url:canonical,title:clean(input.title||new URL(source).hostname,500),author:input.author?clean(input.author,300):undefined,content_text:text,mime_type:clean(input.mime_type||"text/plain",200),captured_at:new Date(input.captured_at).toISOString(),published_at:input.published_at?new Date(input.published_at).toISOString():undefined,user:{note:input.user?.note?clean(input.user.note,20_000):undefined,tags,capture_intent:input.user?.capture_intent?clean(input.user.capture_intent,500):undefined,project_ref:input.user?.project_ref?clean(input.user.project_ref,200):undefined},provenance:{acquisition:"browser_extension",browser:clean(input.provenance?.browser||"unknown",120),page_language:input.provenance?.page_language?clean(input.provenance.page_language,32):undefined,referrer:input.provenance?.referrer?canonicalizeUrl(input.provenance.referrer):undefined,trust:"untrusted_web_content",instruction_policy:"never_execute"}};
}
export function evidenceHashes(input:BrowserEvidence){const content=Buffer.from(input.content_base64??input.content_text??input.image?.source_url??input.canonical_url,input.content_base64?"base64":"utf8"),content_sha256=createHash("sha256").update(content).digest("hex"),fingerprint=createHash("sha256").update([input.capture_type,input.canonical_url,content_sha256].join("\0")).digest("hex");return {content,content_sha256,fingerprint};}
