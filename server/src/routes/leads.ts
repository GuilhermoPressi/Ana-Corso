import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, LeadStage, PatientStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const createLeadSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  interest: z.string().min(1, "Interesse é obrigatório"),
  source: z.string().min(1, "Origem é obrigatória"),
  value: z.number().nonnegative().optional().default(0),
  stage: z.nativeEnum(LeadStage).optional().default(LeadStage.NEW_CONTACT),
  temperature: z.string().optional().default("morno"),
  note: z.string().optional().nullable(),
  scheduledFor: z.string().optional().nullable(),
})

export async function leadRoutes(fastify: FastifyInstance) {
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

  // GET /api/leads
  fastify.get("/leads", async (request) => {
    const clinicId = request.clinic!.id
    const leads = await prisma.lead.findMany({
      where: { clinicId, archivedAt: null },
      orderBy: [{ stage: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    })
    return { leads }
  })

  // GET /api/crm/summary
  fastify.get("/crm/summary", async (request) => {
    const clinicId = request.clinic!.id
    const leads = await prisma.lead.findMany({
      where: { clinicId, archivedAt: null },
    })

    const activeLeads = leads.filter((l) => l.stage !== LeadStage.WON && l.stage !== LeadStage.LOST).length
    const proposalValue = leads
      .filter((l) => l.stage === LeadStage.PROPOSAL_SENT)
      .reduce((sum, l) => sum + Number(l.value), 0)
    const wonCount = leads.filter((l) => l.stage === LeadStage.WON).length
    const lostCount = leads.filter((l) => l.stage === LeadStage.LOST).length
    const totalFinished = wonCount + lostCount
    const conversionRate = totalFinished === 0 ? 0 : Math.round((wonCount / totalFinished) * 1000) / 10

    return {
      summary: {
        activeLeads,
        proposalValue,
        wonCount,
        lostCount,
        conversionRate,
      },
    }
  })

  // POST /api/leads
  fastify.post("/leads", async (request, reply) => {
    const parseResult = createLeadSchema.safeParse(request.body)
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

    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          clinicId,
          name: body.name.trim(),
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
          interest: body.interest.trim(),
          source: body.source.trim(),
          value: body.value,
          stage: body.stage,
          temperature: body.temperature,
          note: body.note?.trim() || null,
          scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
          createdByUserId: userId,
          owner: request.user!.name,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.LEAD,
          entityId: created.id,
          action: ClinicActivityAction.LEAD_CREATED,
        },
      })

      return created
    })

    return reply.status(201).send({ lead })
  })

  // GET /api/leads/:id
  fastify.get("/leads/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id

    const lead = await prisma.lead.findFirst({
      where: { id, clinicId },
    })

    if (!lead) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Lead não encontrado." },
      })
    }

    return { lead }
  })

  // PATCH /api/leads/:id
  fastify.patch("/leads/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const existing = await prisma.lead.findFirst({
      where: { id, clinicId },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Lead não encontrado." },
      })
    }

    const updateSchema = createLeadSchema.partial().extend({
      position: z.number().optional(),
    })

    const body = updateSchema.parse(request.body)

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.interest && { interest: body.interest.trim() }),
        ...(body.source && { source: body.source.trim() }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.stage && { stage: body.stage }),
        ...(body.temperature && { temperature: body.temperature }),
        ...(body.note !== undefined && { note: body.note }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.scheduledFor !== undefined && {
          scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        }),
      },
    })

    return { lead: updated }
  })

  // PATCH /api/leads/:id/stage (Kanban Drag and Drop persistence)
  fastify.patch("/leads/:id/stage", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const stageSchema = z.object({
      stage: z.nativeEnum(LeadStage),
      position: z.number().optional(),
    })

    const parseResult = stageSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: "Estágio inválido." },
      })
    }

    const { stage, position } = parseResult.data

    const existing = await prisma.lead.findFirst({
      where: { id, clinicId },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Lead não encontrado." },
      })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const data: any = {
        stage,
        lastContact: now,
      }
      if (position !== undefined) data.position = position
      if (stage === LeadStage.WON) data.wonAt = now
      if (stage === LeadStage.LOST) data.lostAt = now

      const res = await tx.lead.update({
        where: { id },
        data,
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.LEAD,
          entityId: id,
          action: ClinicActivityAction.LEAD_STAGE_CHANGED,
        },
      })

      return res
    })

    return { lead: updated }
  })

  // POST /api/leads/:id/convert (Convert Lead to Patient atomically and idempotently!)
  fastify.post("/leads/:id/convert", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const lead = await prisma.lead.findFirst({
      where: { id, clinicId },
    })

    if (!lead) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Lead não encontrado." },
      })
    }

    // Refinement 9: Idempotency check. If already converted, return existing Patient
    if (lead.patientId) {
      const existingPatient = await prisma.patient.findFirst({
        where: { id: lead.patientId, clinicId },
      })
      if (existingPatient) {
        return reply.status(200).send({
          patient: existingPatient,
          lead,
          message: "Lead já havia sido convertido em paciente.",
        })
      }
    }

    const { patient, updatedLead } = await prisma.$transaction(async (tx) => {
      const newPatient = await tx.patient.create({
        data: {
          clinicId,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          status: PatientStatus.ACTIVE,
          mainProcedure: lead.interest,
          responsibleProfessional: lead.owner || request.user!.name,
          leadSource: lead.source,
          createdByUserId: userId,
          clinicalProfile: {
            create: {
              clinicalNotes: `Convertida a partir do CRM (Lead ${lead.interest}).`,
            },
          },
        },
      })

      const resLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          patientId: newPatient.id,
          stage: LeadStage.WON,
          wonAt: new Date(),
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.LEAD,
          entityId: lead.id,
          action: ClinicActivityAction.LEAD_CONVERTED,
        },
      })

      return { patient: newPatient, updatedLead: resLead }
    })

    return reply.status(201).send({ patient, lead: updatedLead })
  })

  // POST /api/leads/:id/archive
  fastify.post("/leads/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id

    const existing = await prisma.lead.findFirst({
      where: { id, clinicId },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Lead não encontrado." },
      })
    }

    const archived = await prisma.lead.update({
      where: { id },
      data: { archivedAt: new Date() },
    })

    return { lead: archived, message: "Lead arquivado com sucesso." }
  })
}
