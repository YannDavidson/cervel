# Principle: reserve delta optimization without coupling core semantics

Provider cursor/state fields exist so future delta APIs can reduce work, but correctness does not depend on them. The stable source mapping and content-hash gate remain valid whether synchronization is polling, delta-based, or webhook-triggered.
