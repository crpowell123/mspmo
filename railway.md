# Railway deployment configuration
# Deploy each service separately from this monorepo

# ── API SERVICE ───────────────────────────────────────────────────────────────
# Service name: mspmo-api
# Root directory: apps/api
# Build command: pnpm install && pnpm --filter @mspmo/api build
# Start command: node dist/index.js
# Health check: GET /health

# ── WORKER SERVICE ────────────────────────────────────────────────────────────
# Service name: mspmo-worker
# Root directory: apps/worker
# Build command: pnpm install && pnpm --filter @mspmo/worker build
# Start command: node dist/index.js

# ── ENVIRONMENT VARIABLES (set in Railway dashboard) ─────────────────────────
# DATABASE_URL        (from Railway Postgres plugin)
# REDIS_URL           (from Railway Redis plugin or Upstash)
# CLERK_SECRET_KEY
# CLERK_WEBHOOK_SECRET
# ANTHROPIC_API_KEY
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
# STRIPE_STARTER_PRICE_ID
# STRIPE_GROWTH_PRICE_ID
# STRIPE_ENTERPRISE_PRICE_ID
# ENCRYPTION_KEY      (generate: openssl rand -hex 32)
# WEB_URL             https://app.mspmo.io
# NODE_ENV            production
