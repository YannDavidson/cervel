# Principle: failed refresh should be explicit state

A source whose latest synchronization failed becomes `error` and gets a durable failed run. The system does not leave it looking fresh merely because older synchronized knowledge still exists.
