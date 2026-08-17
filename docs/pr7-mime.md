# MIME handling

Provider MIME metadata is preserved on the artifact. Existing CERVEL ingestion determines whether fragments can be extracted. This separation prevents connector code from pretending binary content is text and keeps future extraction adapters modular.
