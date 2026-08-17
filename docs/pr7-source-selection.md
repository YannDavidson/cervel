# Source selection boundary

The current API accepts a provider remote ID after connection; a production picker UI should obtain that ID through provider-authorized listing/search rather than asking users to type opaque IDs. The watch endpoint still validates CERVEL connection/Library scope, while the provider verifies the remote ID on first sync.
