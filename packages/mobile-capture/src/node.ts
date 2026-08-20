import { createHash } from "node:crypto";
import type { MobileCapture } from "./protocol";

export function mobileFingerprint(input:MobileCapture){const body=input.content_base64?Buffer.from(input.content_base64,"base64"):Buffer.from(input.text??input.source_url??"");return createHash("sha256").update(input.capture_type).update("\0").update(body).digest("hex");}
export function mobileOriginalSha256(input:MobileCapture){return input.content_base64?createHash("sha256").update(Buffer.from(input.content_base64,"base64")).digest("hex"):undefined;}
