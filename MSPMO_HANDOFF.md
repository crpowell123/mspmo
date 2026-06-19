# MSPMO — Project Handoff

## What we are building
**MSPMO** (`mspmo.io`) is a full PMO SaaS platform built for MSPs.
Tagline: "Your PMO, for your MSP."

## Modules
### PMO Layer (portfolio-wide)
1. **Portfolio Dashboard** — all projects, RAG health, budget, risk summary
2. **Intake & Demand** — new work requests, priority scoring, approval workflow
3. **Status Reporting** — RAG reports, AI-generated weekly summaries
4. **Capacity Planning** — org-wide engineer utilization, hiring signals

### Project Layer (per-project)
5. **Resource Management (RMS)** — draggable calendar, heatmap, allocation matrix
6. **Risk Register + Regulatory Planner** — risk matrix, AI compliance analysis
7. **Lessons Learned** — categorized knowledge base
8. **Schedule & Dependencies** — Gantt chart with milestones
9. **Procurement** — PO tracking
10. **Material & Tool Checklist** — project readiness tracker

## Stack
| Layer       | Tech                            | Host    |
|-------------|----------------------------------|---------|
| Frontend    | React + Vite + Tailwind          | Vercel  |
| API         | Node.js + Fastify + Prisma       | Railway |
| Worker      | BullMQ                           | Railway |
| Database    | PostgreSQL                       | Neon    |
| Auth        | Clerk                            | -       |
| Billing     | Stripe                           | -       |
| AI          | Anthropic claude-sonnet-4        | -       |

## Pricing
| Plan       | Price    | Limits                                          |
|------------|----------|-------------------------------------------------|
| Starter    | $149/mo  | 3 engineers, 10 projects, core modules          |
| Growth     | $349/mo  | 10 engineers, AI + Regulatory                   |
| Enterprise | $799/mo  | Unlimited, SSO, SLA, API, white-label           |

## Run locally
```bash
# Terminal 1 - API
cd apps/api && npm install && npm run dev

# Terminal 2 - Frontend
cd apps/web && npm install && npm run dev
```

## Env vars needed
### apps/web/.env.local
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001/api/v1
```

### apps/api/.env
```
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
CLERK_SECRET_KEY=sk_test_...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
ENCRYPTION_KEY=<32-byte hex>
NODE_ENV=development
API_PORT=3001
WEB_URL=http://localhost:5173
```

## GitHub
https://github.com/crpowell123/fieldops  ← rename to mspmo recommended
