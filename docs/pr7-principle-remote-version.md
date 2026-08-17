# Principle: remote versions are diagnostics, not truth

Provider revision/eTag/version values help explain upstream behavior and can optimize future delta sync, but CERVEL does not create a knowledge revision unless the synchronized content hash actually changes.
