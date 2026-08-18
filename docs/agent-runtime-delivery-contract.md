# Agent delivery contract

Polling returns eligible signals in ascending occurrence order and records a receipt for each Event or Watch alert. Receipts are unique per subscription and source signal. The cursor advances only after the batch is persisted inside the same transaction.

Acknowledgement sets the receipt timestamp once and is scoped to the owning agent principal.
