import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import 'dotenv/config';

// Routes
import { tenantRoutes, lessonRoutes, scheduleRoutes, procurementRoutes, checklistRoutes } from './routes/crud';
import { projectRoutes } from './routes/projects';
import { engineerRoutes } from './routes/engineers';
import { resourceRoutes } from './routes/resources';
import { riskRoutes } from './routes/risks';
import { regulatoryRoutes } from './routes/regulatory';
import { cwRoutes } from './routes/connectwise';
import { portfolioRoutes, intakeRoutes, statusReportRoutes, capacityRoutes } from './routes/pmo';
import { billingRoutes } from './routes/billing';
import { webhookRoutes } from './routes/webhooks';

// ── INIT CLIENTS ──────────────────────────────────────────────────────────────

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('error', () => {
  // Redis optional in dev — queues won't work but API runs fine
});

// ── BUILD SERVER ──────────────────────────────────────────────────────────────

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
    trustProxy: true,
  });

  // ── PLUGINS ────────────────────────────────────────────────────────────────

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: [
      process.env.WEB_URL!,
      'https://app.mspmo.io',
      'https://mspmo.io',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
  });

  // ── HEALTH ─────────────────────────────────────────────────────────────────

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  }));

  // ── ROUTES ─────────────────────────────────────────────────────────────────

  // Webhooks must be registered before auth middleware (need raw body)
  await app.register(webhookRoutes, { prefix: '/webhooks' });

  // Authenticated routes
  const apiPrefix = '/api/v1';
  await app.register(tenantRoutes,     { prefix: `${apiPrefix}/tenants` });
  await app.register(projectRoutes,    { prefix: `${apiPrefix}/projects` });
  await app.register(engineerRoutes,   { prefix: `${apiPrefix}/engineers` });
  await app.register(resourceRoutes,   { prefix: `${apiPrefix}/resources` });
  await app.register(riskRoutes,       { prefix: `${apiPrefix}/risks` });
  await app.register(regulatoryRoutes, { prefix: `${apiPrefix}/regulatory` });
  await app.register(lessonRoutes,     { prefix: `${apiPrefix}/lessons` });
  await app.register(scheduleRoutes,   { prefix: `${apiPrefix}/schedule` });
  await app.register(procurementRoutes,{ prefix: `${apiPrefix}/procurement` });
  await app.register(checklistRoutes,  { prefix: `${apiPrefix}/checklist` });
  await app.register(cwRoutes,         { prefix: `${apiPrefix}/connectwise` });
  await app.register(portfolioRoutes,   { prefix: `${apiPrefix}/pmo/portfolio` });
  await app.register(intakeRoutes,      { prefix: `${apiPrefix}/pmo/intake` });
  await app.register(statusReportRoutes,{ prefix: `${apiPrefix}/pmo/reports` });
  await app.register(capacityRoutes,    { prefix: `${apiPrefix}/pmo/capacity` });
  await app.register(billingRoutes,    { prefix: `${apiPrefix}/billing` });

  return app;
}

// ── START ─────────────────────────────────────────────────────────────────────

async function start() {
  try {
    // Redis is optional — connect if available, skip if not
    try { await redis.connect(); } catch { console.warn('Redis unavailable - queue features disabled'); }
    const app = await buildServer();
    const port = parseInt(process.env.API_PORT || '3001', 10);
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`MSPMO API running on port ${port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
