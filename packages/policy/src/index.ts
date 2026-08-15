export const HUMAN_PERMISSIONS = [
  "DISCOVER","READ","CREATE","EDIT","DELETE","SHARE","EXPORT","ADMINISTER","VERIFY"
] as const;

export const AI_PERMISSIONS = [
  "AI_DISCOVER","AI_READ","AI_RETRIEVE","AI_SUMMARIZE",
  "AI_REASON","AI_EMBED","AI_DERIVE","AI_EXPORT","AI_TRAIN"
] as const;

export type Permission =
  | typeof HUMAN_PERMISSIONS[number]
  | typeof AI_PERMISSIONS[number];

export type AuthorizationDecision = {
  allowed: boolean;
  matchedPolicyIds: string[];
  snapshotHash: string;
  reason?: string;
};

// v0.1 rule: deny by default.
// Retrieval code MUST obtain an allow decision before querying protected content.
export function denyByDefault(): AuthorizationDecision {
  return { allowed: false, matchedPolicyIds: [], snapshotHash: "", reason: "DEFAULT_DENY" };
}
