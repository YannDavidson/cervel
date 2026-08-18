import { CKEP_EVENT_TYPES, canonicalEventUri, computeCkepHash, computeIdempotencyKey, mapKnowledgeEventToCkep, validateCkep } from "../../packages/ckep/src";

describe("CKEP v0.1",()=>{
  test("canonical event identity is Workspace scoped",()=>{
    expect(canonicalEventUri("acme","launch","019abc")).toBe("cke://acme/workspaces/launch/events/019abc");
  });

  test("legacy knowledge_events map to a valid immutable envelope",()=>{
    const event=mapKnowledgeEventToCkep({
      authority:"acme",nodeId:"019node",workspaceId:"019workspace",sequence:2,previousEventId:"019prev",
      row:{id:"019event",event_type:"CLAIM_SUPERSEDED",subject_type:"claim",subject_id:"019claim",cko_id:"019cko",previous_claim_id:"019old",current_claim_id:"019new",knowledge_diff_id:"019diff",summary:"Launch moved",details:{reason:"contract"},confidence:.94,observed_at:"2026-08-18T20:00:00.000Z",effective_at:"2026-10-15T00:00:00.000Z"},
      impacts:[{impacted_type:"decision",impacted_id:"019decision",impact_kind:"requires_review",confidence:.88}]
    });
    expect(event.event.id).toBe("cke://acme/workspaces/019workspace/events/019event");
    expect(event.transition?.previous?.uri).toBe("ck://acme/claims/019old");
    expect(event.transition?.current?.uri).toBe("ck://acme/claims/019new");
    expect(event.temporal.observed_at).not.toBe(event.temporal.effective_at);
    expect(event.impact?.[0].severity).toBe("high");
    expect(validateCkep(event)).toEqual({ok:true,event});
  });

  test("hash detects envelope mutation",()=>{
    const event=mapKnowledgeEventToCkep({authority:"acme",nodeId:"n",workspaceId:"w",sequence:1,row:{id:"e",event_type:"RISK_DETECTED",subject_type:"project",subject_id:"p",summary:"risk",confidence:.8,observed_at:"2026-08-18T20:00:00Z"}});
    event.epistemics.confidence=.1;
    const result=validateCkep(event);
    expect(result.ok).toBe(false);
    if(!result.ok)expect(result.errors).toContain("CKEP_HASH_MISMATCH");
  });

  test("sequence greater than one requires previous event",()=>{
    const event=mapKnowledgeEventToCkep({authority:"acme",nodeId:"n",workspaceId:"w",sequence:1,row:{id:"e",event_type:"RISK_DETECTED",subject_type:"project",subject_id:"p",summary:"risk",confidence:.8,observed_at:"2026-08-18T20:00:00Z"}});
    event.integrity.sequence=2; event.integrity.hash=computeCkepHash(event);
    const result=validateCkep(event);
    expect(result.ok).toBe(false);
    if(!result.ok)expect(result.errors).toContain("CKEP_PREVIOUS_EVENT_REQUIRED");
  });

  test("idempotency key is deterministic across object key ordering",()=>{
    const a=computeIdempotencyKey({scope:{node:"ck://acme/nodes/n",workspace:"ck://acme/workspaces/w"},eventType:"CLAIM_MODIFIED",subject:{uri:"ck://acme/claims/c",type:"claim"},observedAt:"2026-08-18T20:00:00Z",transition:{current:{value:{a:1,b:2}}}});
    const b=computeIdempotencyKey({scope:{workspace:"ck://acme/workspaces/w",node:"ck://acme/nodes/n"},eventType:"CLAIM_MODIFIED",subject:{type:"claim",uri:"ck://acme/claims/c"},observedAt:"2026-08-18T20:00:00Z",transition:{current:{value:{b:2,a:1}}}});
    expect(a).toBe(b);
  });

  test("taxonomy has no duplicate event types",()=>expect(new Set(CKEP_EVENT_TYPES).size).toBe(CKEP_EVENT_TYPES.length));
});
