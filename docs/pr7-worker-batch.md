# Worker batch bounds

The standalone worker defaults to 20 due sources per execution and can be configured with `CERVEL_SYNC_BATCH_SIZE`. The protected HTTP dispatcher caps a requested limit at 100. This prevents one scheduler invocation from becoming an unbounded account-wide sync.
