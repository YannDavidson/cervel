# Shared CERVEL Experience Architecture

## Decision

The rich staging/demo workspace is the **reference product experience**, not a second product and not a source of production state. CERVEL clients converge on one shared experience architecture while preserving their runtime-specific responsibilities.

The governing question for every capability is:

> **Is this part of CERVEL, or merely part of one client?**

If a capability expresses CERVEL itself—Vault Explorer, Corpus, semantic views, capture/admission, Ask CERVEL, Search, Trace, Graph, provenance, Activity, Properties, Deliverables or Connections—its vocabulary, navigation identity and interaction contract belong in the shared CERVEL experience. Desktop, Web, Mobile and Extension adapt that capability to their form factor and authorized runtime.

## Architecture

```text
Shared CERVEL Experience
  ├─ product vocabulary + navigation
  ├─ design/semantic tokens
  ├─ experience contracts
  ├─ Vault Explorer / Corpus / semantic views
  ├─ Capture / Ask / Search
  ├─ Trace / Graph / provenance
  └─ Activity / Properties / Deliverables / Connections
             |
             +-- Desktop presentation + native Local Node/Vault lifecycle
             +-- Web presentation + authorized web/cloud runtime
             +-- Mobile presentation + capture/voice/camera/mobile runtime
             +-- Extension presentation + page capture/current-page context
             |
             v
      CERVEL Node/API + canonical knowledge substrate
```

The staging/demo workspace supplies the reference information architecture and interaction language. It does **not** supply production data behavior.

## Hard boundary: experience is shared; synthetic behavior is not

`packages/demo-experience` and `/demo` remain isolated demonstration infrastructure. Synthetic principals, CKOs, Vaults, grants, storage locations, deterministic demo reducers, reset behavior and fixture-only state MUST NOT be imported into production clients or the shared experience package.

Production embodiments bind shared experience contracts to real CERVEL capabilities through their authorized runtime. Shared UI code must not bypass the Local Node, Intelligence Gateway, permission-aware activation, admission, provenance or Trace boundaries.

## Capability ownership matrix

| Capability | Owner | Shared contract | Client adaptation |
| --- | --- | --- | --- |
| Vault Explorer | CERVEL | canonical Vault/CKO exploration | Desktop may additionally own local unlock/location controls |
| Corpus + semantic views | CERVEL | corpus selection, taxonomy, membership, zero-duplication semantics | layout may differ by screen size |
| Capture / Add knowledge | CERVEL | capture/admission intent and destination | Extension adds page/selection capture; Mobile adds camera/voice |
| Ask CERVEL | CERVEL | query, citations, answer boundary | client chooses presentation and input affordances |
| Search | CERVEL | retrieval/search intent and results | client-specific shortcuts and compact views allowed |
| Trace + provenance | CERVEL | answer-to-source and provenance inspection | detail depth adapts to device |
| Graph | CERVEL | knowledge relationships | rendering/gestures adapt to client |
| Activity + Properties | CERVEL | knowledge events and object metadata | inspector vs sheet/panel is client-specific |
| Deliverables | CERVEL | deliverable intent/result | export/share affordances are client-specific |
| Connections | CERVEL | gateway/connection identity and receipts | native credential/setup UX may be client-specific |
| Local Node lifecycle | Desktop client | native runtime lifecycle | not a universal product-navigation contract |
| system tray / filesystem integration | Desktop client | none | native Desktop responsibility |
| camera / share sheet / notifications | Mobile client | none | native Mobile responsibility |
| current-page selection / native messaging | Extension client | none | Extension responsibility |
| synthetic investor tour/reset | Demo only | none | must remain isolated |

## Reference workspace

The canonical workspace should preserve the strongest product concepts already proven in staging:

- persistent Vault identity and privacy state;
- Life / Enterprise Corpus switching as semantic organization over canonical CKOs;
- Mega Tabs / semantic views without knowledge duplication;
- a global Add knowledge entry point that can route to note, file and source capture rather than assuming file import;
- Ask CERVEL and Search as first-class knowledge operations;
- Trace, provenance, Activity and Properties as inspectable product surfaces;
- Local-first / node health and ownership state where the runtime can truthfully provide it.

These are product concepts. Demo copy, fixture identities, investor choreography and synthetic state are not.

## Migration rule

Do not rebuild the staging workspace independently inside Electron, Tauri, Web, Mobile and Extension. Extract shared contracts/tokens/components progressively, then make each embodiment consume them. The current Electron shell remains a compatibility/runtime proof while Tauri becomes the canonical Desktop embodiment; neither should become a second source of product information architecture.

PR #77 establishes the foundation and ownership contract. Subsequent rollouts can move visual tokens/shell components, unified capture, Corpus/Mega Tabs, privacy/authority, Vault Explorer, Ask/Search/Trace/Graph and the remaining surfaces into this shared layer without coupling production to demo state.
