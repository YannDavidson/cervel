import{compileConversation}from"../../packages/knowledge-compiler/src";

describe("CERVEL Knowledge Compiler",()=>{
 const turns=[
  {role:"user"as const,content:"For project CERVEL, we decided to keep the Local Node authoritative. Action item: build deterministic compilation. What remains unresolved?"},
  {role:"assistant"as const,content:"Insight: encrypted local knowledge reduces cloud disclosure. The CERVEL API is a software runtime. The CERVEL API is a software runtime."}
 ];
 test("classifies topics, projects, verticals, entities, and intent",()=>{const p=compileConversation(turns);expect(p.classification.projects.join(" ")).toMatch(/CERVEL/i);expect(p.classification.verticals).toContain("software");expect(p.classification.intents).toEqual(expect.arrayContaining(["decide","create","question"]));});
 test("extracts durable knowledge kinds and collapses exact duplicates",()=>{const p=compileConversation(turns);expect(new Set(p.candidates.map(x=>x.kind))).toEqual(new Set(["decision","task","unresolved_question","insight","claim"]));expect(p.candidates.find(x=>x.text.includes("software runtime"))?.duplicate_count).toBe(1);});
 test("detects opposite-polarity contradictions deterministically",()=>{const p=compileConversation([{role:"user",content:"CERVEL is authoritative."},{role:"assistant",content:"CERVEL is not authoritative."}]);expect(p.contradictions).toHaveLength(1);expect(p.input_digest).toHaveLength(64);});
 test("emits non-proprietary filing proposals",()=>{const p=compileConversation(turns);expect(p.filing_suggestions[0]).toMatchObject({path:expect.stringMatching(/^Knowledge\//),reason:expect.any(String)});});
});
