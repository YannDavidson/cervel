# CERVEL Enterprise Corpus Runtime v1

The Enterprise Corpus organizes canonical CKOs into eighteen semantic branches: Organization, People, Strategy, Operations, Projects, Products, Customers, Sales, Marketing, Finance, Legal / Risk / Compliance, Research, Institutional Knowledge, Technology, Data, AI / Agents, Enterprise Memory, and External Ecosystem.

Every Enterprise membership belongs to an explicit tenant and may belong to a hierarchical organization, business-unit, team, project, product, customer, data-domain, or external scope. Tenant members have viewer, contributor, manager, or authority roles. The generic Corpus Engine view enforces tenant membership, while generic classification and filing reject Enterprise operations once the tenant runtime exists. This prevents a less-specific endpoint from bypassing tenant isolation.

Authority is first-class. Automated classification is always `inferred`; it may record the branch's target authority but never upgrades itself. Manual assertions record actor, time, method metadata, and require manager privileges for `approved` or the tenant authority role for `official`. Scope records carry their own authority state and metadata.

Enterprise memberships contain semantic coordinates, tenant/scope references, authority, confidence, and policy only. CKO content, files, artifacts, claims, provenance, and versions remain canonical and are never copied.

The API supports tenant bootstrap, member grants, hierarchical scopes, classification, filing/authority assertion, and tenant-filtered semantic views. Automatic classification only targets one explicitly designated default tenant and only when the principal has contributor-or-higher access; ambiguous tenant contexts fail closed.
