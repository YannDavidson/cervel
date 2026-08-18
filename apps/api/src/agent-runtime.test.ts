import { describe,expect,test } from "@jest/globals";
import { validateAgentPermissions } from "./agent-runtime";
describe("agent knowledge runtime contract",()=>{
test("permission vocabulary is capability-oriented",()=>{expect(validateAgentPermissions(["memory:read","memory:write","claim:write","context:read","events:read","watch:read"])).toHaveLength(6);});
test("duplicate permissions collapse",()=>{expect(validateAgentPermissions(["memory:read","memory:read"])).toEqual(["memory:read"]);});
test("unknown permissions fail closed",()=>{expect(()=>validateAgentPermissions(["workspace:admin"])).toThrow("INVALID_AGENT_PERMISSION");});
});
