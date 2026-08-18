import { describe,expect,test } from "@jest/globals";
import { canonicalEventUri,mapKnowledgeEventToCkep,validateCkep } from "../../packages/ckep/src";

describe("CKEP event runtime contract",()=>{
  test("canonical journal identity remains Workspace scoped",()=>expect(canonicalEventUri("local","workspace-1","event-1")).toBe("cke://local/workspaces/workspace-1/events/event-1"));
  test("publisher envelope remains valid after runtime-facing construction",()=>{const event=mapKnowledgeEventToCkep({authority:"local",nodeId:"node-1",workspaceId:"workspace-1",sequence:1,row:{id:"event-1",event_type:"RISK_DETECTED",subject_type:"project",subject_id:"project-1",summary:"risk",confidence:.9,observed_at:"2026-08-18T20:00:00Z"}});expect(validateCkep(event).ok).toBe(true);});
});
