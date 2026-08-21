# CERVEL Alpha Demo Experience

The Alpha Demo Experience packages the proven Alpha Golden Path into a shareable browser interface for investors, partners, and selected users.

## Experience

The guided story is **Capture → Ask → Verify → Organize → Create → Connect → Recover**. Visitors can capture synthetic evidence, generate a cited answer, inspect the Answer-to-source Trace chain, compile a conversation into knowledge classes, render consistent deliverables, inspect an MCP disclosure receipt, toggle offline mode, and verify backup/recovery.

The UI is served at `/demo`; `/v1/demo/health` provides a deployment probe. Browser sessions are resettable and use synthetic state only. No demo action can address a real CKO, principal, Vault, grant, or storage location.

## Honest environment boundary

The page explicitly states that it is a hosted, isolated demonstration of the CERVEL Local Node architecture. It does not claim that a visitor's data is running locally. The full ownership proof remains the downloadable Desktop + Local Node Alpha.

Recommended exposure:

- `demo.cervel.ai` or the Cloud Run service `/demo` for the hosted tour;
- invitation controls at the edge for investor sessions;
- the Desktop download for a true on-device Alpha trial.

## Operational safety

- synthetic sources and deterministic results;
- no production database writes;
- no external model calls or provider tokens;
- browser-local session persistence and one-click reset;
- `Cache-Control: no-store` on the demo shell;
- staging smoke checks for both the health contract and rendered page;
- deterministic reducer tests covering the entire narrative.
