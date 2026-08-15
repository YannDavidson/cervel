# Contract tests

Validate fixtures against JSON Schema Draft 2020-12.

Must reject:
- non-v7 CKO ID
- invalid epistemic confidence
- unknown top-level CKO property outside `extensions`
- malformed CKURI
- CCP without authorization scope
