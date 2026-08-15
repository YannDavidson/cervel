export type ParsedCKURI = {
  authority: string;
  canonicalId?: string;
  aliasPath?: string;
  fragment?: { kind: "frag" | "claim" | "convenience"; value: string };
};

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function parseCKURI(input: string): ParsedCKURI {
  const url = new URL(input);
  if (url.protocol !== "cervel:") throw new Error("CKURI_SCHEME_INVALID");

  const authority = url.hostname.toLowerCase();
  if (!authority) throw new Error("CKURI_AUTHORITY_REQUIRED");

  const path = url.pathname.replace(/^\/+/, "");
  const parts = path.split("/").filter(Boolean);

  let canonicalId: string | undefined;
  let aliasPath: string | undefined;

  if (parts[0] === "cko" && parts[1]) {
    canonicalId = parts[1].toLowerCase();
    if (!UUID_V7.test(canonicalId)) throw new Error("CKURI_CKO_ID_INVALID");
  } else {
    aliasPath = parts.join("/");
    if (!aliasPath) throw new Error("CKURI_PATH_REQUIRED");
  }

  let fragment: ParsedCKURI["fragment"];
  const hash = url.hash.replace(/^#/, "");
  if (hash) {
    const [kind, ...rest] = hash.split("/");
    const value = rest.join("/");
    if ((kind === "frag" || kind === "claim") && UUID_V7.test(value)) {
      fragment = { kind, value };
    } else {
      fragment = { kind: "convenience", value: hash };
    }
  }

  return { authority, canonicalId, aliasPath, fragment };
}

export function canonicalCKURI(authority: string, ckoId: string): string {
  const normalized = ckoId.toLowerCase();
  if (!UUID_V7.test(normalized)) throw new Error("CKURI_CKO_ID_INVALID");
  return `cervel://${authority.toLowerCase()}/cko/${normalized}`;
}
