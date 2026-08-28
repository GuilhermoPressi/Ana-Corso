import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, LeadStage, ProposalStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const proposalItemSchema = z.object({
  nameSnapshot: z.string().min(1),
  detailSnapshot: z.string().optional().nullable(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  position: z.number().int().nonnegative().optional().default(0),
})

const createProposalSchema = z.object({
  patientId: z.string().uuid(),
  leadId: z.string().optional().nullable(),
  facialPlanningId: z.string().optional().nullable(),
  title: z.string().min(1, "Título é obrigatório"),
  note: z.string().optional().nullable(),
  subtotal: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  status: z.nativeEnum(ProposalStatus).optional().default(ProposalStatus.DRAFT),
  validUntil: z.string().optional().nullable(),
  items: z.array(proposalItemSchema).min(1, "Proposta deve ter pelo menos um item"),
})

export async function proposalRoutes(fastify: FastifyInstance) {
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

  // GET /api/proposals
  fastify.get("/proposals", async (request) => {
    const clinicId = request.clinic!.id
    const proposals = await prisma.proposal.findMany({
      where: { clinicId, archivedAt: null },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    })

    return { proposals }
  })

  // POST /api/proposals
  fastify.post("/proposals", async (request, reply) => {
    const parseResult = createProposalSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const body = parseResult.data
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
      })
    }

    const proposal = await prisma.$transaction(async (tx) => {
      const created = await tx.proposal.create({
        data: {
          clinicId,
          patientId: body.patientId,
          leadId: body.leadId || null,
          facialPlanningId: body.facialPlanningId || null,
          title: body.title.trim(),
          note: body.note?.trim() || null,
          subtotal: body.subtotal,
          discount: body.discount,
          total: body.total,
          status: body.status,
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
          createdByUserId: userId,
          items: {
            create: body.items.map((item, idx) => ({
              nameSnapshot: item.nameSnapshot.trim(),
              detailSnapshot: item.detailSnapshot?.trim() || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              position: item.position || idx,
            })),
          },
        },
        include: { items: true },
      })

      // Refinement 23: If status is SENT and leadId is present, move lead to PROPOSAL_SENT
      if (body.status === ProposalStatus.SENT && body.leadId) {
        await tx.lead.update({
          where: { id: body.leadId },
          data: {
            stage: LeadStage.PROPOSAL_SENT,
            value: body.total,
          },
        })
      }

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PROPOSAL,
          entityId: created.id,
          action: ClinicActivityAction.PROPOSAL_CREATED,
        },
      })

      return created
    })

    return reply.status(201).send({ proposal })
  })

  // PATCH /api/proposals/:id/status
  fastify.patch("/proposals/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const statusSchema = z.object({
      status: z.nativeEnum(ProposalStatus),
    })

    const { status } = statusSchema.parse(request.body)

    const existing = await prisma.proposal.findFirst({
      where: { id, clinicId },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Proposta não encontrada." },
      })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const data: any = { status }
      if (status === ProposalStatus.SENT) data.sentAt = now
      if (status === ProposalStatus.ACCEPTED) data.acceptedAt = now
      if (status === ProposalStatus.REJECTED) data.rejectedAt = now

      const res = await tx.proposal.update({
        where: { id },
        data,
        include: { items: true },
      })

      if (status === ProposalStatus.SENT && existing.leadId) {
        await tx.lead.update({
          where: { id: existing.leadId },
          data: { stage: LeadStage.PROPOSAL_SENT },
        })
      }

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PROPOSAL,
          entityId: id,
          action: status === ProposalStatus.SENT ? ClinicActivityAction.PROPOSAL_SENT : ClinicActivityAction.PROPOSAL_CREATED,
        },
      })

      return res
    })

    return { proposal: updated }
  })
}
