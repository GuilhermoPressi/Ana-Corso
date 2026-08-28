import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, MapMode, MapStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const mapPointSchema = z.object({
  regionId: z.string().min(1),
  regionName: z.string().min(1),
  product: z.string().min(1),
  quantity: z.string().min(1),
  depth: z.string().min(1),
  technique: z.string().min(1),
  note: z.string().optional().nullable(),
  position2dX: z.number().optional().nullable(),
  position2dY: z.number().optional().nullable(),
  position3dX: z.number().optional().nullable(),
  position3dY: z.number().optional().nullable(),
  position3dZ: z.number().optional().nullable(),
})

const createMapSchema = z.object({
  patientId: z.string().uuid(),
  procedureName: z.string().min(1),
  mode: z.nativeEnum(MapMode).optional().default(MapMode.TWO_D),
  points: z.array(mapPointSchema).optional().default([]),
})

export async function mapRoutes(fastify: FastifyInstance) {
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

  // GET /api/patients/:patientId/maps
  fastify.get("/patients/:patientId/maps", async (request, reply) => {
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

    const maps = await prisma.procedureMap.findMany({
      where: { clinicId, patientId, archivedAt: null },
      include: { points: true },
      orderBy: { createdAt: "desc" },
    })

    return { maps }
  })

  // POST /api/patients/:patientId/maps
  fastify.post("/patients/:patientId/maps", async (request, reply) => {
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

    const parseResult = createMapSchema.safeParse({ ...request.body, patientId })
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const body = parseResult.data

    const map = await prisma.$transaction(async (tx) => {
      const created = await tx.procedureMap.create({
        data: {
          clinicId,
          patientId,
          patientName: patient.name,
          procedureName: body.procedureName.trim(),
          mode: body.mode,
          createdByUserId: userId,
          points: {
            create: body.points.map((pt) => ({
              regionId: pt.regionId,
              regionName: pt.regionName,
              product: pt.product,
              quantity: pt.quantity,
              depth: pt.depth,
              technique: pt.technique,
              note: pt.note?.trim() || null,
              position2dX: pt.position2dX ?? null,
              position2dY: pt.position2dY ?? null,
              position3dX: pt.position3dX ?? null,
              position3dY: pt.position3dY ?? null,
              position3dZ: pt.position3dZ ?? null,
            })),
          },
        },
        include: { points: true },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.MAP,
          entityId: created.id,
          action: ClinicActivityAction.MAP_CREATED,
        },
      })

      return created
    })

    return reply.status(201).send({ map })
  })

  // POST /api/maps/:id/points (Add point while DRAFT)
  fastify.post("/maps/:id/points", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id

    const map = await prisma.procedureMap.findFirst({
      where: { id, clinicId },
    })

    if (!map) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Mapa de procedimento não encontrado." },
      })
    }

    if (map.status === MapStatus.COMPLETED) {
      return reply.status(400).send({
        error: { code: "LOCKED", message: "Mapas concluídos não podem ser editados." },
      })
    }

    const pt = mapPointSchema.parse(request.body)

    const point = await prisma.procedureMapPoint.create({
      data: {
        procedureMapId: id,
        regionId: pt.regionId,
        regionName: pt.regionName,
        product: pt.product,
        quantity: pt.quantity,
        depth: pt.depth,
        technique: pt.technique,
        note: pt.note?.trim() || null,
        position2dX: pt.position2dX ?? null,
        position2dY: pt.position2dY ?? null,
        position3dX: pt.position3dX ?? null,
        position3dY: pt.position3dY ?? null,
        position3dZ: pt.position3dZ ?? null,
      },
    })

    return reply.status(201).send({ point })
  })

  // DELETE /api/maps/:id/points/:pointId
  fastify.delete("/maps/:id/points/:pointId", async (request, reply) => {
    const { id, pointId } = request.params as { id: string; pointId: string }
    const clinicId = request.clinic!.id

    const map = await prisma.procedureMap.findFirst({
      where: { id, clinicId },
    })

    if (!map) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Mapa de procedimento não encontrado." },
      })
    }

    if (map.status === MapStatus.COMPLETED) {
      return reply.status(400).send({
        error: { code: "LOCKED", message: "Mapas concluídos não aceitam exclusão de pontos." },
      })
    }

    await prisma.procedureMapPoint.deleteMany({
      where: { id: pointId, procedureMapId: id },
    })

    return { message: "Ponto removido com sucesso." }
  })

  // POST /api/maps/:id/complete
  fastify.post("/maps/:id/complete", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const map = await prisma.procedureMap.findFirst({
      where: { id, clinicId },
    })

    if (!map) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Mapa de procedimento não encontrado." },
      })
    }

    const completed = await prisma.$transaction(async (tx) => {
      const res = await tx.procedureMap.update({
        where: { id },
        data: {
          status: MapStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: { points: true },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.MAP,
          entityId: id,
          action: ClinicActivityAction.MAP_COMPLETED,
        },
      })

      return res
    })

    return { map: completed, message: "Mapa de procedimento concluído com sucesso." }
  })
}
