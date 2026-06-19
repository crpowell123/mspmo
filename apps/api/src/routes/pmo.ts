import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

// ── PORTFOLIO ─────────────────────────────────────────────────────────────────

export async function portfolioRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /api/v1/pmo/portfolio — aggregated view of all projects
  app.get('/', async (request, reply) => {
    const projects = await prisma.project.findMany({
      include: {
        risks:        { where: { status: { in: ['Open','Watching'] } } },
        statusReports:{ orderBy: { createdAt: 'desc' }, take: 1 },
        procurement:  true,
        phases:       true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = projects.map(p => {
      const openRisks   = p.risks.filter(r => r.status === 'Open').length;
      const critRisks   = p.risks.filter(r => r.probability * r.impact >= 15).length;
      const latestRAG   = p.statusReports[0]?.ragStatus || 'Green';
      const budgetPct   = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
      const pendingPOs  = p.procurement.filter(i => i.status === 'Pending PO').length;
      const totalPhases = p.phases.length;
      const donePhases  = p.phases.filter(ph => ph.status === 'Done').length;
      const phasePct    = totalPhases > 0 ? Math.round((donePhases / totalPhases) * 100) : 0;

      // Auto-derive RAG if no report exists
      let autoRAG = 'Green';
      if (critRisks > 0 || budgetPct > 95) autoRAG = 'Red';
      else if (openRisks > 2 || budgetPct > 80) autoRAG = 'Amber';

      return {
        id:          p.id,
        name:        p.name,
        company:     p.company,
        status:      p.status,
        phase:       p.phase,
        budget:      p.budget,
        spent:       p.spent,
        budgetPct:   Math.round(budgetPct),
        startDate:   p.startDate,
        endDate:     p.endDate,
        ragStatus:   p.statusReports[0] ? latestRAG : autoRAG,
        openRisks,
        critRisks,
        pendingPOs,
        phasePct,
        lastReport:  p.statusReports[0] || null,
      };
    });

    const totals = {
      totalProjects:   projects.length,
      activeProjects:  projects.filter(p => p.status === 'In Progress').length,
      totalBudget:     projects.reduce((s, p) => s + p.budget, 0),
      totalSpent:      projects.reduce((s, p) => s + p.spent, 0),
      redProjects:     summary.filter(p => p.ragStatus === 'Red').length,
      amberProjects:   summary.filter(p => p.ragStatus === 'Amber').length,
      greenProjects:   summary.filter(p => p.ragStatus === 'Green').length,
      totalOpenRisks:  summary.reduce((s, p) => s + p.openRisks, 0),
      totalPendingPOs: summary.reduce((s, p) => s + p.pendingPOs, 0),
    };

    return { data: { projects: summary, totals } };
  });
}

// ── INTAKE ────────────────────────────────────────────────────────────────────

const IntakeSchema = z.object({
  title:          z.string().min(1).max(300),
  requestedBy:    z.string().min(1),
  company:        z.string().min(1),
  priority:       z.enum(['Critical','High','Medium','Low']).optional(),
  estimatedValue: z.number().min(0).optional(),
  estimatedHours: z.number().min(0).optional(),
  description:    z.string().min(1),
  businessCase:   z.string().optional(),
});

const ReviewSchema = z.object({
  status:       z.enum(['Approved','Rejected','Deferred','Under Review']),
  reviewedBy:   z.string(),
  reviewNotes:  z.string().optional(),
  linkedProjectId: z.string().optional(),
});

export async function intakeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const { status } = request.query as { status?: string };
    const intakes = await prisma.projectIntake.findMany({
      where: status ? { status } : {},
      orderBy: [{ priority: 'asc' }, { submittedAt: 'desc' }],
    });
    return { data: intakes };
  });

  app.post('/', async (request, reply) => {
    const body = IntakeSchema.parse(request.body);
    const intake = await prisma.projectIntake.create({
      data: { ...body, businessCase: body.businessCase || '' },
    });
    return reply.status(201).send({ data: intake });
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = IntakeSchema.partial().parse(request.body);
    const intake = await prisma.projectIntake.update({
      where: { id: request.params.id },
      data: body,
    });
    return { data: intake };
  });

  // POST /review — approve/reject/defer
  app.post<{ Params: { id: string } }>('/:id/review', async (request, reply) => {
    const body = ReviewSchema.parse(request.body);
    const intake = await prisma.projectIntake.update({
      where: { id: request.params.id },
      data: {
        status:          body.status,
        reviewedBy:      body.reviewedBy,
        reviewNotes:     body.reviewNotes || '',
        linkedProjectId: body.linkedProjectId,
        reviewedAt:      new Date(),
      },
    });
    return { data: intake };
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await prisma.projectIntake.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}

// ── STATUS REPORTS ────────────────────────────────────────────────────────────

const ReportSchema = z.object({
  projectId:  z.string(),
  period:     z.string(),
  ragStatus:  z.enum(['Red','Amber','Green']),
  summary:    z.string().min(1),
  highlights: z.array(z.string()).optional(),
  issues:     z.array(z.string()).optional(),
  nextSteps:  z.array(z.string()).optional(),
  createdBy:  z.string(),
});

export async function statusReportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const { projectId } = request.query as { projectId?: string };
    const reports = await prisma.statusReport.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true, company: true } } },
    });
    return { data: reports };
  });

  app.post('/', async (request, reply) => {
    const body = ReportSchema.parse(request.body);
    const report = await prisma.statusReport.create({
      data: {
        ...body,
        highlights: body.highlights || [],
        issues:     body.issues     || [],
        nextSteps:  body.nextSteps  || [],
      },
    });
    return reply.status(201).send({ data: report });
  });

  // POST /generate — AI-generated status report
  app.post<{ Params: { projectId: string } }>('/generate/:projectId', async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const project = await prisma.project.findFirst({
      where: { id: request.params.projectId },
      include: {
        risks:       { where: { status: { in: ['Open','Watching'] } } },
        phases:      { orderBy: { startDate: 'asc' } },
        procurement: { where: { status: { in: ['Pending PO','On Order','In Transit'] } } },
        lessons:     { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });

    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const budgetPct = project.budget > 0
      ? Math.round((project.spent / project.budget) * 100)
      : 0;
    const currentPhase = project.phases.find(p => p.status === 'In Progress');
    const upcomingPhase = project.phases.find(p => p.status === 'Upcoming');

    const ctx = [
      `Project: ${project.name} for ${project.company}`,
      `Status: ${project.status} | Phase: ${project.phase}`,
      `Budget: $${project.spent.toLocaleString()} spent of $${project.budget.toLocaleString()} (${budgetPct}%)`,
      `Current phase: ${currentPhase?.phase || 'N/A'}`,
      `Next phase: ${upcomingPhase?.phase || 'N/A'} starting ${upcomingPhase?.startDate?.toString().slice(0,10) || 'TBD'}`,
      `Open risks: ${project.risks.length} (${project.risks.filter(r => r.probability * r.impact >= 15).length} critical)`,
      `Top risks: ${project.risks.slice(0,3).map(r => r.title).join(', ')}`,
      `Procurement: ${project.procurement.length} items pending/in-flight`,
    ].join('\n');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: 'You are a PMO analyst generating concise project status reports for MSP leadership. Output ONLY raw valid JSON. No markdown.',
        messages: [{
          role: 'user',
          content: `Generate a weekly status report for this project.\n\n${ctx}\n\nReturn JSON: { ragStatus: "Red"|"Amber"|"Green", summary: string (2-3 sentences), highlights: string[] (3 items), issues: string[] (2-3 items), nextSteps: string[] (3 items) }`,
        }],
      }),
    });

    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    const raw  = data.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
    const parsed = JSON.parse(raw.slice(start, end + 1));

    const now   = new Date();
    const week  = `${now.getFullYear()}-W${String(Math.ceil(now.getDate() / 7)).padStart(2,'0')}`;

    const report = await prisma.statusReport.create({
      data: {
        projectId:   project.id,
        period:      week,
        ragStatus:   parsed.ragStatus,
        summary:     parsed.summary,
        highlights:  parsed.highlights || [],
        issues:      parsed.issues     || [],
        nextSteps:   parsed.nextSteps  || [],
        aiGenerated: true,
        createdBy:   'MSPMO AI',
      },
    });

    return reply.status(201).send({ data: report });
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await prisma.statusReport.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}

// ── CAPACITY ──────────────────────────────────────────────────────────────────

export async function capacityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // GET /api/v1/pmo/capacity — org-wide capacity overview
  app.get('/', async (request) => {
    const engineers = await prisma.engineer.findMany({
      where: { isActive: true },
      include: {
        allocations: {
          include: { project: { select: { id: true, name: true, status: true } } },
        },
      },
    });

    const projects = await prisma.project.findMany({
      where: { status: { in: ['Planning','In Progress'] } },
      select: { id: true, name: true, company: true, status: true },
    });

    const capacity = engineers.map(eng => {
      const allocated = eng.allocations.reduce((s, a) => s + a.hoursPerWeek, 0);
      const available = eng.capacityHoursPerWeek - allocated;
      const utilPct   = Math.round((allocated / eng.capacityHoursPerWeek) * 100);
      return {
        id:           eng.id,
        name:         eng.name,
        role:         eng.role,
        color:        eng.color,
        capacityHours: eng.capacityHoursPerWeek,
        allocatedHours: allocated,
        availableHours: Math.max(available, 0),
        utilizationPct: utilPct,
        overAllocated:  allocated > eng.capacityHoursPerWeek,
        allocations:  eng.allocations.map(a => ({
          projectId:    a.projectId,
          projectName:  a.project.name,
          hoursPerWeek: a.hoursPerWeek,
          role:         a.role,
        })),
      };
    });

    const totals = {
      totalEngineers:    engineers.length,
      overAllocated:     capacity.filter(e => e.overAllocated).length,
      avgUtilization:    Math.round(capacity.reduce((s, e) => s + e.utilizationPct, 0) / (capacity.length || 1)),
      totalAvailableHours: capacity.reduce((s, e) => s + e.availableHours, 0),
      totalCapacityHours:  capacity.reduce((s, e) => s + e.capacityHours, 0),
      totalAllocatedHours: capacity.reduce((s, e) => s + e.allocatedHours, 0),
    };

    return { data: { engineers: capacity, projects, totals } };
  });
}
