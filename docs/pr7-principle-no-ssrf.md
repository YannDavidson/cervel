# Principle: connector fetch targets are fixed provider APIs

User-controlled source selection supplies opaque remote IDs, not arbitrary URLs. The runtime constructs requests only against known Google, Dropbox, or Microsoft API hosts, maintaining the SSRF boundary established by manual web capture.
