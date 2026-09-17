# CERVEL Web Deployment Convergence

CERVEL Web is the same product experience as Desktop. Deployment differences are expressed through runtime capabilities, not through forked navigation, duplicated knowledge models, or alternate UI products.

## Canonical experience

Web consumes the shared CERVEL surface contracts for Home, Vault Explorer, Corpus, Add Knowledge, Ask CERVEL, Search, Trace, Graph, Activity, Properties, Deliverables, and Connections where supported by the web client.

`local`, `cloud`, `hybrid`, `staging`, and `demo` are runtime modes. The mode selects transport and capabilities; it does not redefine CKO identity, corpus semantics, permissions, provenance, retrieval, reasoning, or the application shell.

## Runtime capability boundary

- `local`: Local Node transport.
- `cloud`: cloud API transport.
- `hybrid`: local + cloud transport.
- `staging`: cloud transport plus staging diagnostics.
- `demo`: cloud transport plus explicitly marked demo seed data.

Synthetic demo data is allowed only when the runtime advertises `demoSeedData=true`. Staging is not implicitly demo state.

## Offline and recovery

The web experience keeps the canonical product shell visible while runtime connectivity changes. The shared recovery states are `online`, `degraded`, `offline`, and `recovering`.

Offline/recovery capability describes whether cached knowledge can remain readable and whether supported writes can be queued for later reconciliation. It does not create a second Vault, a second CKO model, or a second product experience.

## Security and provenance

Runtime transport selection never weakens the existing permission/provenance boundary. Cloud and hybrid clients must use authenticated APIs. Local mode uses the Local Node boundary. Cached/offline material must remain scoped to the same authorized knowledge context that produced it.

The convergence rule is:

**one product contract → runtime capabilities → local/cloud/hybrid transport**

not:

**desktop product + web product + demo product + staging product**.
