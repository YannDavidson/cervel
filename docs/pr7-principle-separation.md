# Principle: separate authorization, synchronization, and knowledge state

Account authorization health, source synchronization health, execution history, and CKO knowledge history solve different problems. PR #7 keeps them in separate records so one failure domain does not corrupt the meaning of another.
