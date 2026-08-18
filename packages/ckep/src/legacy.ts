import { mapKnowledgeEventToCkep, type CkepEnvelope, type LegacyImpactRow, type LegacyKnowledgeEventRow } from "./index";

export interface ScopedLegacyKnowledgeEventRow extends LegacyKnowledgeEventRow {
  node_id: string;
  workspace_id: string;
}

export function mapScopedKnowledgeEventToCkep(input:{
  authority:string;
  nodeId:string;
  workspaceId:string;
  row:ScopedLegacyKnowledgeEventRow;
  impacts?:LegacyImpactRow[];
  sequence:number;
  previousEventId?:string|null;
  causedBy?:string[];
}):CkepEnvelope {
  if(input.row.node_id!==input.nodeId)throw Object.assign(new Error("CKEP_NODE_SCOPE_MISMATCH"),{code:"CKEP_NODE_SCOPE_MISMATCH"});
  if(input.row.workspace_id!==input.workspaceId)throw Object.assign(new Error("CKEP_WORKSPACE_SCOPE_MISMATCH"),{code:"CKEP_WORKSPACE_SCOPE_MISMATCH"});
  return mapKnowledgeEventToCkep(input);
}
