# OneDrive behavior

Microsoft Graph item metadata provides eTag/cTag, last-modified time, and MIME information; content is downloaded through the item `/content` endpoint. PR #7 uses those fields for diagnostics and SHA-256 for the authoritative change decision.
