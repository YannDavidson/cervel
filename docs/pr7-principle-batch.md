# Principle: background batches need explicit ceilings

Even a trusted scheduler should not create unbounded work from one request. PR #7 caps worker/API due-source batches so operational load remains controllable as source count grows.
