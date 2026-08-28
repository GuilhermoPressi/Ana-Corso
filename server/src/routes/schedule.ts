import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, ScheduleEventKind, ScheduleEventStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const createScheduleSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  kind: z.nativeEnum(ScheduleEventKind).default(ScheduleEventKind.PROCEDURE),
  status: z.nativeEnum(ScheduleEventStatus).default(ScheduleEventStatus.CONFIRMED),
  startsAt: z.string().min(1, "Data e horário de início são obrigatórios"),
  durationMin: z.number().positive().default(30),
  patientId: z.string().nullable().optional(),
  patientName: z.string().nullable().optional(),
  professionalName: z.string().nullable().optional(),
  room: z.string().nullable().optional(),
  value: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
})

export async function scheduleRoutes(fastify: FastifyInstance) {
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

  // GET /api/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
  fastify.get("/schedule", async (request) => {
    const querySchema = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    })

    const { from, to } = querySchema.parse(request.query)
    const clinicId = request.clinic!.id

    const whereClause: any = { clinicId }

    if (from || to) {
      whereClause.startsAt = {}
      if (from) {
        whereClause.startsAt.gte = new Date(`${from}T00:00:00.000Z`)
      }
      if (to) {
        whereClause.startsAt.lte = new Date(`${to}T23:59:59.999Z`)
      }
    }

    const events = await prisma.scheduleEvent.findMany({
      where: whereClause,
      orderBy: { startsAt: "asc" },
    })

    return { events }
  })

  // POST /api/schedule
  fastify.post("/schedule", async (request, reply) => {
    const parseResult = createScheduleSchema.safeParse(request.body)
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

    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.scheduleEvent.create({
        data: {
          clinicId,
          patientId: body.patientId || null,
          patientName: body.patientName || null,
          title: body.title.trim(),
          kind: body.kind,
          status: body.status,
          startsAt: new Date(body.startsAt),
          durationMin: body.durationMin,
          professionalName: body.professionalName || request.user!.name,
          room: body.room || null,
          value: body.value || null,
          note: body.note || null,
          createdByUserId: userId,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.SCHEDULE,
          entityId: created.id,
          action: ClinicActivityAction.SCHEDULE_CREATED,
        },
      })

      return created
    })

    return reply.status(201).send({ event })
  })

  // PATCH /api/schedule/:id
  fastify.patch("/schedule/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const existing = await prisma.scheduleEvent.findFirst({
      where: { id, clinicId },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Agendamento não encontrado." },
      })
    }

    const updateSchema = createScheduleSchema.partial().extend({
      status: z.nativeEnum(ScheduleEventStatus).optional(),
    })

    const body = updateSchema.parse(request.body)

    const updated = await prisma.$transaction(async (tx) => {
      const eventPatch: any = {}
      if (body.title !== undefined) eventPatch.title = body.title.trim()
      if (body.kind !== undefined) eventPatch.kind = body.kind
      if (body.status !== undefined) eventPatch.status = body.status
      if (body.startsAt !== undefined) eventPatch.startsAt = new Date(body.startsAt)
      if (body.durationMin !== undefined) eventPatch.durationMin = body.durationMin
      if (body.patientId !== undefined) eventPatch.patientId = body.patientId
      if (body.patientName !== undefined) eventPatch.patientName = body.patientName
      if (body.professionalName !== undefined) eventPatch.professionalName = body.professionalName
      if (body.room !== undefined) eventPatch.room = body.room
      if (body.value !== undefined) eventPatch.value = body.value
      if (body.note !== undefined) eventPatch.note = body.note

      const res = await tx.scheduleEvent.update({
        where: { id },
        data: eventPatch,
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.SCHEDULE,
          entityId: id,
          action: ClinicActivityAction.SCHEDULE_UPDATED,
        },
      })

      return res
    })

    return { event: updated }
  })

  // POST /api/schedule/:id/cancel
  fastify.post("/schedule/:id/cancel", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const existing = await prisma.scheduleEvent.findFirst({
      where: { id, clinicId },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Agendamento não encontrado." },
      })
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const res = await tx.scheduleEvent.update({
        where: { id },
        data: {
          status: ScheduleEventStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.SCHEDULE,
          entityId: id,
          action: ClinicActivityAction.SCHEDULE_CANCELLED,
        },
      })

      return res
    })

    return { event: cancelled, message: "Agendamento cancelado com sucesso." }
  })
}
