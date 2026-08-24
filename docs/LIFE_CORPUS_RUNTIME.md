# CERVEL Life Corpus Runtime v1

The Life Corpus is the first reference implementation of the Corpus Engine. It organizes a person's canonical CKOs into seventeen semantic branches: Personal; Relationships & Family; Health; Work & Career; Education; Projects; Finance; Home; Memory; Personal Knowledge; Digital Life; Travel; Hobbies; Goals; Civic / Community; Legal / Administrative; and Legacy.

Life Corpus membership never copies content, files, artifacts, claims, or fragments. It stores only the CKO identifier, taxonomy coordinate, classification reason, confidence, and branch policy. One CKO may appear in several Life branches and other corpora while retaining one identity and version history.

Every Life branch is private by default. Work, education, projects, hobbies, civic activity, and personal knowledge default to internal or confidential sensitivity. Identity, health, finance, digital accounts, legal/administrative, and legacy branches default to restricted or confidential. High-risk subtabs—including identity documents, medical records, medications, financial accounts and taxes, home security, digital credentials, travel identity documents, legal cases/contracts, and estate records—are sealed.

Sealed views fail closed. They require a short-lived access session backed by an already verified Local Vault unlock, biometric check, device reauthentication, or recovery key proof reference. CERVEL stores only a SHA-256 proof reference, caps access at fifteen minutes, and records the grant. Generic corpus views apply the same sealed filter, preventing bypass through a lower-level endpoint.

`POST /v1/life/bootstrap` installs the reference taxonomy and policies. `POST /v1/life/classify/:ckoId` classifies an existing CKO. `PUT /v1/life/file/:ckoId` files a CKO into a chosen branch/subtab with the correct default policy. `POST /v1/life/sealed/unlock` creates short-lived sealed access. `GET /v1/life` returns the permitted semantic view.
