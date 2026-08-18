# Operational model

Agent Runtime v0.1 is request-driven. Writes happen inside database transactions; CCP assembly uses existing retrieval; signal consumption is bounded polling with durable cursors and receipts.

This makes failure and cost behavior explicit. Continuous workers, webhooks, queues, and push delivery can later call the same runtime functions without changing the knowledge contract.
