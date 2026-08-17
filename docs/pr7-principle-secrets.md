# Principle: credentials are infrastructure, not product data

Provider client secrets, reusable provider tokens, encryption keys, and scheduler secrets stay outside CKO content, Library metadata, browser storage, CI fixtures, and public API responses. They exist only in deployment secret configuration or encrypted credential columns.
