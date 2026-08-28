import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const createCatalogSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().optional().nullable(),
  defaultPrice: z.number().nonnegative(),
  estimatedDurationMin: z.number().int().positive().optional().default(30),
})

const protocolStepSchema = z.object({
  catalogProcedureId: z.string().optional().nullable(),
  procedureName: z.string().min(1),
  label: z.string().min(1),
  dayOffset: z.number().int().nonnegative().default(1),
  listPrice: z.number().nonnegative(),
  position: z.number().int().nonnegative().optional().default(0),
})

const createProtocolSchema = z.object({
  name: z.string().min(1, "Nome do protocolo é obrigatório"),
  description: z.string().optional().nullable(),
  packagePrice: z.number().nonnegative(),
  steps: z.array(protocolStepSchema).min(1, "Protocolo precisa de pelo menos uma etapa"),
})

export async function catalogRoutes(fastify: FastifyInstance) {
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

  // GET /api/catalog/procedures
  fastify.get("/catalog/procedures", async (request) => {
    const clinicId = request.clinic!.id
    const procedures = await prisma.catalogProcedure.findMany({
      where: { clinicId, archivedAt: null },
      orderBy: { name: "asc" },
    })
    return { procedures }
  })

  // POST /api/catalog/procedures
  fastify.post("/catalog/procedures", async (request, reply) => {
    const parseResult = createCatalogSchema.safeParse(request.body)
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

    const procedure = await prisma.$transaction(async (tx) => {
      const created = await tx.catalogProcedure.create({
        data: {
          clinicId,
          name: body.name.trim(),
          category: body.category.trim(),
          description: body.description?.trim() || null,
          defaultPrice: body.defaultPrice,
          estimatedDurationMin: body.estimatedDurationMin,
          createdByUserId: userId,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.CATALOG,
          entityId: created.id,
          action: ClinicActivityAction.CATALOG_PROCEDURE_CREATED,
        },
      })

      return created
    })

    return reply.status(201).send({ procedure })
  })

  // GET /api/protocols
  fastify.get("/protocols", async (request) => {
    const clinicId = request.clinic!.id
    const protocols = await prisma.protocol.findMany({
      where: { clinicId, archivedAt: null },
      include: { steps: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
    })

    return { protocols }
  })

  // POST /api/protocols
  fastify.post("/protocols", async (request, reply) => {
    const parseResult = createProtocolSchema.safeParse(request.body)
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

    const protocol = await prisma.$transaction(async (tx) => {
      const created = await tx.protocol.create({
        data: {
          clinicId,
          name: body.name.trim(),
          description: body.description?.trim() || null,
          packagePrice: body.packagePrice,
          createdByUserId: userId,
          steps: {
            create: body.steps.map((st, idx) => ({
              catalogProcedureId: st.catalogProcedureId || null,
              procedureName: st.procedureName.trim(),
              label: st.label.trim(),
              dayOffset: st.dayOffset,
              listPrice: st.listPrice,
              position: st.position || idx,
            })),
          },
        },
        include: { steps: true },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PROTOCOL,
          entityId: created.id,
          action: ClinicActivityAction.PROTOCOL_CREATED,
        },
      })

      return created
    })

    return reply.status(201).send({ protocol })
  })
}
