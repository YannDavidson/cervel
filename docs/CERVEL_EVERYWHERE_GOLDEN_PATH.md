# PR #65 — CERVEL Everywhere Golden Path

## Goal
Prove the embodiment thesis with one canonical knowledge object:

`Capture webpage on Chrome → appears on Desktop → ask Cortex → see Trace → view on phone`

The test is specifically about continuity. It must never pass by creating embodiment-specific copies of the knowledge.

## Golden path
1. **Chrome capture** submits browser evidence through `/v1/local/captures` with browser provenance, `untrusted_web_content`, and `never_execute`.
2. **Desktop visibility** resolves the resulting CKO through `/v1/local/objects`. The object ID must equal the browser-created CKO ID.
3. **Cortex** asks a question whose answer depends on the captured evidence through `/v1/reason`.
4. **Trace** loads `/v1/answers/:id/trace` and must contain an answer-to-source chain whose `source.cko_id` is the original browser CKO.
5. **Phone visibility** retrieves through the enrolled mobile capability and `/v1/mobile/retrieve`; the returned `ckoId` must again equal the browser CKO.

## Continuity invariant
The same CKO ID must be observed in all five stages. A divergent object ID is a hard failure (`EVERYWHERE_CKO_ID_DIVERGED`). Cortex and Trace must also agree on the same answer ID.

## Security/privacy invariants
- Browser material remains untrusted evidence and cannot become executable instructions.
- Desktop uses the Local Node boundary; no renderer-to-provider bypass is introduced.
- Cortex uses the canonical reasoning route and its existing permission-aware retrieval scope.
- Trace must reach a real artifact hash and source CKO, not merely cite a title or URL.
- Phone access uses a scoped mobile capability; the temporary CI device is revoked after the test.
- Mobile retrieval uses canonical hybrid retrieval; there is no mobile-specific knowledge copy.

## Qualification boundary
CI proves the complete **automated API embodiment path**. It does not claim that a physical Chrome extension, signed/package-distributed Desktop build, or physical iOS/Android device has been exercised in that run. Those three qualifications remain `pending` until a dedicated hardware/distribution run validates them.

## Why this matters
This is the first cross-embodiment proof of the CERVEL architecture: capture happens in one embodiment, but the durable asset is the persistent semantic object beneath every embodiment. Chrome, Desktop, Cortex, Trace, and Mobile are different interfaces to the same knowledge—not separate memory silos.
