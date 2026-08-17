# Production secret handling

Store connector encryption, scheduler, and provider client secrets in the deployment secret manager and inject them at runtime. Do not use `.env.example` placeholder values in production and do not place secrets in GitHub workflow YAML or PR comments.
