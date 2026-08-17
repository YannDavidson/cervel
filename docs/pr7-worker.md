# Source-sync worker

`npm run sync:sources` executes one bounded due-source batch and exits, making it suitable for Cloud Run Jobs, cron, Kubernetes CronJob, or another trusted scheduler. It shares the same provider-neutral synchronization engine as manual/API-triggered sync.
