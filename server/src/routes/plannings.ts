import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, PlanningStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const regionSchema = z.object({
  treatmentLine: z.string().min(1),
  regionCode: z.string().min(1),
  regionName: z.string().min(1),
  productName: z.string().optional().nullable(),
  quantity: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  depth: z.string().optional().nullable(),
  technique: z.string().optional().nullable(),
  sessionsRecommended: z.number().int().positive().optional().default(1),
  extraFieldsData: z.record(z.any()).optional().nullable(),
  notes: z.string().optional().nullable(),
})

const createPlanningSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().optional().default("Planejamento Facial"),
  estimatedValue: z.number().nonnegative().optional().default(0),
  notes: z.string().optional().nullable(),
  regions: z.array(regionSchema).optional().default([]),
})

export async function planningRoutes(fastify: FastifyInstance) {
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

  // GET /api/patients/:patientId/plannings
  fastify.get("/patients/:patientId/plannings", async (request, reply) => {
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

    const plannings = await prisma.facialPlanning.findMany({
      where: { clinicId, patientId, archivedAt: null },
      include: { regions: true },
      orderBy: { createdAt: "desc" },
    })

    return { plannings }
  })

  // POST /api/patients/:patientId/plannings
  fastify.post("/patients/:patientId/plannings", async (request, reply) => {
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

    const parseResult = createPlanningSchema.safeParse({ ...request.body, patientId })
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const body = parseResult.data

    const planning = await prisma.$transaction(async (tx) => {
      const created = await tx.facialPlanning.create({
        data: {
          clinicId,
          patientId,
          title: body.title.trim(),
          estimatedValue: body.estimatedValue,
          notes: body.notes?.trim() || null,
          createdByUserId: userId,
          regions: {
            create: body.regions.map((r) => ({
              clinicId,
              treatmentLine: r.treatmentLine,
              regionCode: r.regionCode,
              regionName: r.regionName,
              productName: r.productName || null,
              quantity: r.quantity || null,
              unit: r.unit || null,
              depth: r.depth || null,
              technique: r.technique || null,
              sessionsRecommended: r.sessionsRecommended,
              extraFieldsData: r.extraFieldsData || null,
              notes: r.notes || null,
            })),
          },
        },
        include: { regions: true },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PLANNING,
          entityId: created.id,
          action: ClinicActivityAction.PLANNING_CREATED,
        },
      })

      return created
    })

    return reply.status(201).send({ planning })
  })

  // GET /api/plannings/:id
  fastify.get("/plannings/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id

    const planning = await prisma.facialPlanning.findFirst({
      where: { id, clinicId },
      include: { regions: true },
    })

    if (!planning) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Planejamento não encontrado." },
      })
    }

    return { planning }
  })

  // PATCH /api/plannings/:id (Autosave endpoint)
  fastify.patch("/plannings/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const existing = await prisma.facialPlanning.findFirst({
      where: { id, clinicId },
      include: { regions: true },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Planejamento não encontrado." },
      })
    }

    if (existing.status === PlanningStatus.COMPLETED) {
      return reply.status(400).send({
        error: { code: "LOCKED", message: "Planejamentos concluídos não podem ser editados." },
      })
    }

    const updateSchema = createPlanningSchema.partial()
    const body = updateSchema.parse(request.body)

    const updated = await prisma.$transaction(async (tx) => {
      if (body.regions) {
        await tx.facialPlanningRegion.deleteMany({
          where: { planningId: id },
        })
      }

      const res = await tx.facialPlanning.update({
        where: { id },
        data: {
          ...(body.title && { title: body.title.trim() }),
          ...(body.estimatedValue !== undefined && { estimatedValue: body.estimatedValue }),
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.regions && {
            regions: {
              create: body.regions.map((r) => ({
                clinicId,
                treatmentLine: r.treatmentLine,
                regionCode: r.regionCode,
                regionName: r.regionName,
                productName: r.productName || null,
                quantity: r.quantity || null,
                unit: r.unit || null,
                depth: r.depth || null,
                technique: r.technique || null,
                sessionsRecommended: r.sessionsRecommended || 1,
                extraFieldsData: r.extraFieldsData || null,
                notes: r.notes || null,
              })),
            },
          }),
        },
        include: { regions: true },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PLANNING,
          entityId: id,
          action: ClinicActivityAction.PLANNING_UPDATED,
        },
      })

      return res
    })

    return { planning: updated, message: "Draft salvo com sucesso." }
  })

  // POST /api/plannings/:id/complete
  fastify.post("/plannings/:id/complete", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const existing = await prisma.facialPlanning.findFirst({
      where: { id, clinicId },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Planejamento não encontrado." },
      })
    }

    const completed = await prisma.$transaction(async (tx) => {
      const res = await tx.facialPlanning.update({
        where: { id },
        data: {
          status: PlanningStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: { regions: true },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PLANNING,
          entityId: id,
          action: ClinicActivityAction.PLANNING_COMPLETED,
        },
      })

      return res
    })

    return { planning: completed, message: "Planejamento concluído com sucesso." }
  })
}
