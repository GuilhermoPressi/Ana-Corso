import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, IncidentSeverity, IncidentStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const createIncidentSchema = z.object({
  patientId: z.string().uuid(),
  procedureRecordId: z.string().uuid().optional().nullable(),
  type: z.string().min(1, "Tipo de intercorrência é obrigatório"),
  severity: z.nativeEnum(IncidentSeverity).optional().default(IncidentSeverity.MODERATE),
  report: z.string().min(3, "Relato clínico é obrigatório"),
  identifiedAt: z.string().optional(),
})

const addUpdateSchema = z.object({
  note: z.string().min(1, "Evolução/nota é obrigatória"),
  status: z.nativeEnum(IncidentStatus).optional(),
})

export async function incidentRoutes(fastify: FastifyInstance) {
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

  // GET /api/incidents
  fastify.get("/incidents", async (request) => {
    const clinicId = request.clinic!.id
    const { patientId, status } = request.query as { patientId?: string; status?: string }

    const where: any = { clinicId, archivedAt: null }
    if (patientId) where.patientId = patientId
    if (status) where.status = status as IncidentStatus

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        procedureRecord: {
          include: { productUsages: true },
        },
        updates: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    })

    return { incidents }
  })

  // POST /api/incidents
  fastify.post("/incidents", async (request, reply) => {
    const parseResult = createIncidentSchema.safeParse(request.body)
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

    const incident = await prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          clinicId,
          patientId: body.patientId,
          procedureRecordId: body.procedureRecordId || null,
          type: body.type.trim(),
          severity: body.severity,
          status: IncidentStatus.OPEN,
          report: body.report.trim(),
          identifiedAt: body.identifiedAt ? new Date(body.identifiedAt) : new Date(),
          createdByUserId: userId,
          updates: {
            create: {
              clinicId,
              note: body.report.trim(),
              createdByUserId: userId,
              status: IncidentStatus.OPEN,
            },
          },
        },
        include: {
          patient: true,
          procedureRecord: { include: { productUsages: true } },
          updates: true,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.INCIDENT,
          entityId: created.id,
          action: ClinicActivityAction.INCIDENT_CREATED,
        },
      })

      return created
    })

    return reply.status(201).send({ incident })
  })

  // POST /api/incidents/:id/updates
  fastify.post("/incidents/:id/updates", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const incident = await prisma.incident.findFirst({
      where: { id, clinicId, archivedAt: null },
    })

    if (!incident) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Intercorrência não encontrada." },
      })
    }

    const parseResult = addUpdateSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const body = parseResult.data

    const updated = await prisma.$transaction(async (tx) => {
      const newStatus = body.status || incident.status

      await tx.incident.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === IncidentStatus.RESOLVED && { resolvedAt: new Date() }),
        },
      })

      const updateEntry = await tx.incidentUpdate.create({
        data: {
          clinicId,
          incidentId: id,
          status: newStatus,
          note: body.note.trim(),
          createdByUserId: userId,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.INCIDENT,
          entityId: id,
          action: ClinicActivityAction.INCIDENT_UPDATED,
        },
      })

      return updateEntry
    })

    return reply.status(201).send({ update: updated })
  })

  // POST /api/incidents/:id/resolve
  fastify.post("/incidents/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const incident = await prisma.incident.findFirst({
      where: { id, clinicId, archivedAt: null },
    })

    if (!incident) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Intercorrência não encontrada." },
      })
    }

    const resolved = await prisma.$transaction(async (tx) => {
      const res = await tx.incident.update({
        where: { id },
        data: {
          status: IncidentStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      })

      await tx.incidentUpdate.create({
        data: {
          clinicId,
          incidentId: id,
          status: IncidentStatus.RESOLVED,
          note: "Intercorrência marcada como Resolvida.",
          createdByUserId: userId,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.INCIDENT,
          entityId: id,
          action: ClinicActivityAction.INCIDENT_RESOLVED,
        },
      })

      return res
    })

    return { incident: resolved, message: "Intercorrência resolvida com sucesso." }
  })
}
