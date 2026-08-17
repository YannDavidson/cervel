# Source locking

A watched-source row lock serializes sync attempts for the same source. This protects the changed/unchanged decision and revision creation from duplicate concurrent writers during the Alpha implementation.
