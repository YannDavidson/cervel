# CERVEL Mobile Life Memory

Mobile Life Memory turns the phone from a capture-only surface into an active embodiment of the canonical Life Corpus.

## Principle

There is no mobile-only memory database. Captures become canonical CKOs, pass through Life Corpus classification, and are recalled through permission-aware Life Corpus views.

## Views

- Today — recent visible Life knowledge across Memory, Personal Knowledge, Relationships, Travel, Goals, and Projects.
- Timeline — canonical Memory branch.
- People — Relationships & Family plus Memory context.
- Places — Travel, Home, and Memory context.
- Goals — Goals and Projects.
- Moments — Memory, Travel, Relationships, and Hobbies.

## Capture → memory

`Mobile capture → encrypted outbox → Local Node → canonical CKO + artifacts + provenance → Life Corpus auto-classification → Mobile Life Memory view`

A quick **Remember this** action deliberately titles the capture as a Memory and marks its intent as `remember`, allowing the existing Life classifier to file it without creating a second object.

## Privacy

The mobile endpoint uses the enrolled device capability and the device's bound principal/workspace. It reads through the canonical `getLifeCorpus` access policy. Sealed Life branches are additionally excluded from Mobile Life Memory Alpha even if a desktop sealed-access session happens to exist. A dedicated mobile sealed-unlock flow is deferred.

## Offline behavior

Memory capture remains offline-first through the encrypted SQLite outbox. Recall requires an authenticated Local Node connection in this alpha; previously fetched memory views are not persisted as a plaintext cache.

## Deferred

- encrypted offline memory-view cache
- dedicated mobile sealed-branch biometric unlock
- proactive resurfacing / anniversaries
- relationship and place graph visualization
- Life Memory notifications
- full natural-language personal-memory reasoning
