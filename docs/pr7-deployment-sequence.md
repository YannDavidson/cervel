# Deployment sequence

1. Apply migrations 012-015.
2. Deploy API/worker with encryption + automation secrets.
3. Configure one provider OAuth app at a time.
4. Smoke-test that provider.
5. Enable its product connector.
6. Configure the five-minute scheduler after at least one source has synced successfully.
7. Observe sync-run and Knowledge Health state before broad enablement.
