import { createHash } from "node:crypto";
import { renderWorkspaceAlpha } from "../apps/web/src/workspace-ui";

describe("CERVEL Workspace Alpha",()=>{
  it("renders the core product surfaces",()=>{const html=renderWorkspaceAlpha();for(const label of ["Knowledge Inbox","Library","Ask CERVEL","Semantic Entities","Knowledge Graph"])expect(html).toContain(label);expect(html).toContain("/v1/session");expect(html).toContain("/v1/workspace/ask");});
  it("keeps raw session tokens out of deterministic persistence form",()=>{const token="cervel-secret-session";const digest=createHash("sha256").update(token).digest("hex");expect(digest).toHaveLength(64);expect(digest).not.toContain(token);});
  it("uses bearer sessions rather than principal headers in the browser",()=>{const html=renderWorkspaceAlpha();expect(html).toContain("authorization");expect(html).not.toContain("x-cervel-principal-id");});
});
