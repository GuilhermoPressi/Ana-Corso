import type { FastifyInstance } from "fastify"
import { ClinicStatus, LeadStage, PatientReturnStatus } from "@prisma/client"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

export async function recoveryRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica ativa vinculada à sessão." },
      })
    }
    if (request.clinic.status === ClinicStatus.BLOCKED) {
      return reply.status(403).send({
        error: { code: "CLINIC_BLOCKED", message: "Acesso da clínica temporariamente suspenso." },
      })
    }
  })

  // GET /api/recovery/summary
  fastify.get("/recovery/summary", async (request) => {
    const clinicId = request.clinic!.id
    const now = new Date()

    // 1. Toxina vencendo (applications performed > 4 months / 120 days ago)
    const toxinaThreshold = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000)

    const toxinaPatients = await prisma.patient.findMany({
      where: {
        clinicId,
        archivedAt: null,
        procedureRecords: {
          some: {
            procedureName: { contains: "toxina", mode: "insensitive" },
            performedAt: { lte: toxinaThreshold },
          },
        },
      },
      include: {
        procedureRecords: {
          where: { procedureName: { contains: "toxina", mode: "insensitive" } },
          orderBy: { performedAt: "desc" },
          take: 1,
        },
      },
    })

    // 2. Retorno pendente (PatientReturn where status == PENDING or OVERDUE)
    const pendingReturns = await prisma.patientReturn.findMany({
      where: {
        clinicId,
        status: { in: [PatientReturnStatus.PENDING, PatientReturnStatus.OVERDUE] },
        dueAt: { lte: now },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    })

    // 3. Orçamento parado (Leads in PROPOSAL_SENT stage > 3 days)
    const openProposals = await prisma.lead.findMany({
      where: {
        clinicId,
        archivedAt: null,
        stage: LeadStage.PROPOSAL_SENT,
      },
      orderBy: { updatedAt: "desc" },
    })

    // 4. Sem atendimento (no procedures in > 180 days)
    const inactiveThreshold = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
    const inactivePatients = await prisma.patient.findMany({
      where: {
        clinicId,
        archivedAt: null,
        procedureRecords: {
          none: {
            performedAt: { gte: inactiveThreshold },
          },
        },
      },
      include: {
        procedureRecords: { orderBy: { performedAt: "desc" }, take: 1 },
      },
    })

    const toxinaPotential = toxinaPatients.reduce((sum, p) => sum + Number(p.procedureRecords[0]?.value || 1800), 0)
    const retornoPotential = pendingReturns.reduce((sum, r) => sum + 1800, 0)
    const proposalPotential = openProposals.reduce((sum, l) => sum + Number(l.value || 0), 0)
    const inactivePotential = inactivePatients.reduce((sum, p) => sum + Number(p.procedureRecords[0]?.value || 1500), 0)

    return {
      summary: {
        toxinaCount: toxinaPatients.length,
        toxinaPotential,
        retornoCount: pendingReturns.length,
        retornoPotential,
        proposalCount: openProposals.length,
        proposalPotential,
        inactiveCount: inactivePatients.length,
        inactivePotential,
        totalPotential: toxinaPotential + retornoPotential + proposalPotential + inactivePotential,
      },
      targets: {
        toxina: toxinaPatients.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          lastActivity: p.procedureRecords[0]?.performedAt,
          potential: Number(p.procedureRecords[0]?.value || 1800),
          procedure: p.procedureRecords[0]?.procedureName || "Toxina botulínica",
        })),
        retorno: pendingReturns.map((r) => ({
          id: r.id,
          name: r.patient.name,
          phone: r.patient.phone,
          lastActivity: r.dueAt,
          potential: 1800,
          reason: r.reason,
        })),
        proposal: openProposals.map((l) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          lastActivity: l.updatedAt,
          potential: Number(l.value || 0),
          procedure: l.interest,
        })),
        inactive: inactivePatients.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          lastActivity: p.procedureRecords[0]?.performedAt || p.createdAt,
          potential: Number(p.procedureRecords[0]?.value || 1500),
          procedure: p.mainProcedure || "Procedimento",
        })),
      },
    }
  })
}
