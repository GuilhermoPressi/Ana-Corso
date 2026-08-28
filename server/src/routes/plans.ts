import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, PlanItemStatus, PlanStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const createPlanSchema = z.object({
  facialPlanningId: z.string().uuid().optional().nullable(),
  proposalId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, "Nome do plano é obrigatório"),
  objective: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      catalogProcedureId: z.string().uuid().optional().nullable(),
      protocolId: z.string().uuid().optional().nullable(),
      nameSnapshot: z.string().min(1, "Nome do item é obrigatório"),
      descriptionSnapshot: z.string().optional().nullable(),
      sessionNumber: z.number().int().positive().default(1),
      plannedDate: z.string().optional().nullable(),
      priceSnapshot: z.number().optional().nullable(),
    }),
  ).optional().default([]),
})

export async function planRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica ativa vinculada à sessão." },
      })
    }
  })

  // GET /api/patients/:patientId/plans
  fastify.get("/patients/:patientId/plans", async (request, reply) => {
    const { patientId } = request.params as { patientId: string }
    const clinicId = request.clinic!.id

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
      })
    }

    const plans = await prisma.patientTreatmentPlan.findMany({
      where: { clinicId, patientId, archivedAt: null },
      include: {
        items: { orderBy: { position: "asc" } },
        facialPlanning: { select: { id: true, title: true } },
        proposal: { select: { id: true, title: true, total: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return { plans }
  })

  // POST /api/patients/:patientId/plans
  fastify.post("/patients/:patientId/plans", async (request, reply) => {
    const { patientId } = request.params as { patientId: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
      })
    }

    const parseResult = createPlanSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: parseResult.error.errors[0]?.message || "Dados inválidos." },
      })
    }

    const body = parseResult.data

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.patientTreatmentPlan.create({
        data: {
          clinicId,
          patientId,
          facialPlanningId: body.facialPlanningId || null,
          proposalId: body.proposalId || null,
          name: body.name.trim(),
          objective: body.objective?.trim() || null,
          notes: body.notes?.trim() || null,
          status: PlanStatus.ACTIVE,
          createdByUserId: userId,
          items: {
            create: body.items.map((item, index) => ({
              catalogProcedureId: item.catalogProcedureId || null,
              protocolId: item.protocolId || null,
              nameSnapshot: item.nameSnapshot.trim(),
              descriptionSnapshot: item.descriptionSnapshot?.trim() || null,
              sessionNumber: item.sessionNumber,
              plannedDate: item.plannedDate ? new Date(item.plannedDate) : null,
              priceSnapshot: item.priceSnapshot ? item.priceSnapshot : null,
              position: index,
              status: PlanItemStatus.PLANNED,
            })),
          },
        },
        include: {
          items: { orderBy: { position: "asc" } },
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PATIENT_PLAN,
          entityId: created.id,
          action: ClinicActivityAction.PATIENT_PLAN_CREATED,
        },
      })

      return created
    })

    return reply.status(201).send({ plan })
  })

  // GET /api/plans/:id
  fastify.get("/plans/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id

    const plan = await prisma.patientTreatmentPlan.findFirst({
      where: { id, clinicId, archivedAt: null },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        items: { orderBy: { position: "asc" } },
        facialPlanning: true,
        proposal: true,
      },
    })

    if (!plan) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Plano de tratamento não encontrado." },
      })
    }

    return { plan }
  })

  // PATCH /api/plans/items/:itemId
  fastify.patch("/plans/items/:itemId", async (request, reply) => {
    const { itemId } = request.params as { itemId: string }
    const clinicId = request.clinic!.id

    const item = await prisma.patientTreatmentPlanItem.findFirst({
      where: { id: itemId, plan: { clinicId } },
    })

    if (!item) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Item do plano não encontrado." },
      })
    }

    const { status, plannedDate } = request.body as { status?: PlanItemStatus; plannedDate?: string }

    const updated = await prisma.patientTreatmentPlanItem.update({
      where: { id: itemId },
      data: {
        ...(status && { status }),
        ...(plannedDate && { plannedDate: new Date(plannedDate) }),
      },
    })

    return { item: updated }
  })
}
