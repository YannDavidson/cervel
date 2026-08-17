# Scale follow-up

At higher volume, split provider fetch from the database mutation transaction using leases/queues, add provider-native delta cursors/webhooks, enforce per-provider concurrency/rate budgets, stream large downloads instead of buffering, and add extraction workers for binary formats. The PR #7 persistence contracts are designed to survive that evolution.
