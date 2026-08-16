# Principle: reusable provider credentials require authenticated encryption

PR #7 uses AES-256-GCM for stored access/refresh tokens so ciphertext tampering is detected as well as confidentiality provided. The encryption key remains deployment-only.
