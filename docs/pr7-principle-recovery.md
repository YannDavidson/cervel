# Principle: recovery should close the health loop

The schema reserves resolved/recovered semantics so a later successful refresh or reconnect can close active health conditions without deleting their history. PR #7 establishes the model even though automatic recovery emission is a small follow-up.
