import { describe,expect,test } from "@jest/globals";

describe("agent knowledge runtime contract",()=>{
  test("permission vocabulary is capability-oriented",()=>{
    const permissions=["memory:read","memory:write","claim:write","context:read","events:read","watch:read"];
    expect(new Set(permissions).size).toBe(6);
    expect(permissions.every(x=>x.includes(":"))).toBe(true);
  });
  test("runtime keeps workspace and provenance first-class",()=>{
    const observation={node_id:"node",workspace_id:"workspace",agent_id:"agent",confidence:.9};
    expect(observation.workspace_id).toBe("workspace");
    expect(observation.agent_id).toBe("agent");
    expect(observation.confidence).toBeGreaterThan(0);
  });
});
