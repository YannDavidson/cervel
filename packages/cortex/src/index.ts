export type ContextRequest = {
  principalId: string;
  workspaceId?: string;
  query: string;
  profile: "qa" | "research" | "decision_support" | "agent_action" |
           "summarization" | "comparison" | "local_context" |
           "historical_reconstruction";
  asOf?: string;
};

export type RetrievalPlan = {
  lexical: boolean;
  semantic: boolean;
  graph: boolean;
  claims: boolean;
  currentOnly: boolean;
  officialFirst: boolean;
};

/**
 * Cortex boundary:
 * 1. interpret request
 * 2. resolve authorization
 * 3. build authorized search universe
 * 4. retrieve/rank
 * 5. assemble CCP
 *
 * Do NOT call model providers before authorization scope exists.
 */
export function defaultRetrievalPlan(profile: ContextRequest["profile"]): RetrievalPlan {
  return {
    lexical: true,
    semantic: true,
    graph: true,
    claims: true,
    currentOnly: profile !== "historical_reconstruction",
    officialFirst: profile === "qa" || profile === "decision_support"
  };
}
