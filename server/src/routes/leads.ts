import type { FastifyInstance, FastifyRequest } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, CrmPipelineKind, CrmStageType, Prisma, LeadPurchaseStatus, LeadStage, PatientStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"
import { ensureDefaultPipeline, firstDigitalStage, legacyFor, reconcileLeadStages } from "../services/pipelines.js"

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
  pipelineId: z.string().uuid().optional().nullable(),
  stageId: z.string().uuid().optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  purchaseStatus: z.nativeEnum(LeadPurchaseStatus).optional().nullable(),
})

const leadInclude = {
  assignedUser: { select: { id: true, name: true } },
  product: { select: { id: true, name: true, price: true } },
  crmContacts: {
    select: { id: true, tags: true, conversations: { select: { id: true }, take: 1 } },
    take: 1,
  },
} as const

const isSales = (request: FastifyRequest) => request.clinicRole === "SALES"

/** O perfil Comercial só vê leads dos pipelines de produtos digitais. */
function leadScope(request: FastifyRequest): Prisma.LeadWhereInput {
  return isSales(request) ? { pipeline: { kind: CrmPipelineKind.DIGITAL } } : {}
}

/** Valida que a etapa pertence à clínica (e ao pipeline, quando informado). */
async function resolveStage(clinicId: string, stageId: string, pipelineId?: string | null, digitalOnly = false) {
  return prisma.crmPipelineStage.findFirst({
    where: {
      id: stageId,
      pipeline: { clinicId, ...(digitalOnly ? { kind: CrmPipelineKind.DIGITAL } : {}) },
      ...(pipelineId ? { pipelineId } : {}),
    },
  })
}

async function validAssignee(clinicId: string, userId: string) {
  return Boolean(await prisma.clinicUser.findFirst({ where: { clinicId, userId } }))
}

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
    await reconcileLeadStages(clinicId)
    const leads = await prisma.lead.findMany({
      where: { clinicId, archivedAt: null, ...leadScope(request) },
      include: leadInclude,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    })
    return { leads }
  })

  // GET /api/crm/summary
  fastify.get("/crm/summary", async (request) => {
    const clinicId = request.clinic!.id
    const { pipelineId } = z.object({ pipelineId: z.string().uuid().optional() }).parse(request.query)
    const leads = await prisma.lead.findMany({
      where: { clinicId, archivedAt: null, ...leadScope(request), ...(pipelineId ? { pipelineId } : {}) },
      include: { pipelineStage: { select: { type: true } } },
    })

    const typeOf = (l: (typeof leads)[number]) =>
      l.pipelineStage?.type ?? (l.stage === LeadStage.WON ? CrmStageType.WON : l.stage === LeadStage.LOST ? CrmStageType.LOST : CrmStageType.OPEN)
    const open = leads.filter((l) => typeOf(l) === CrmStageType.OPEN)
    const wonCount = leads.filter((l) => typeOf(l) === CrmStageType.WON).length
    const lostCount = leads.filter((l) => typeOf(l) === CrmStageType.LOST).length
    const totalFinished = wonCount + lostCount

    return {
      summary: {
        activeLeads: open.length,
        proposalValue: open.reduce((sum, l) => sum + Number(l.value), 0),
        wonCount,
        lostCount,
        conversionRate: totalFinished === 0 ? 0 : Math.round((wonCount / totalFinished) * 1000) / 10,
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

    // Etapa: a informada, ou a equivalente ao `stage` no pipeline Comercial.
    let stage = body.stageId ? await resolveStage(clinicId, body.stageId, body.pipelineId, isSales(request)) : null
    if (body.stageId && !stage) {
      return reply.status(400).send({ error: { code: "INVALID_INPUT", message: "Etapa inválida." } })
    }
    if (!stage && isSales(request)) {
      stage = await firstDigitalStage(clinicId)
      if (!stage) {
        return reply.status(400).send({ error: { code: "NO_DIGITAL_PIPELINE", message: "Crie um pipeline de infoprodutos primeiro." } })
      }
    }
    if (!stage) {
      const pipeline = await ensureDefaultPipeline(clinicId)
      stage = pipeline.stages.find((st) => st.legacyStage === body.stage) ?? pipeline.stages[0]
    }
    if (body.assignedUserId && !(await validAssignee(clinicId, body.assignedUserId))) {
      return reply.status(400).send({ error: { code: "INVALID_INPUT", message: "Responsável inválido." } })
    }
    if (body.productId && !(await prisma.crmProduct.findFirst({ where: { id: body.productId, clinicId } }))) {
      return reply.status(400).send({ error: { code: "INVALID_INPUT", message: "Produto inválido." } })
    }

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
          stage: legacyFor(stage),
          pipelineId: stage.pipelineId,
          stageId: stage.id,
          temperature: body.temperature,
          note: body.note?.trim() || null,
          scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
          createdByUserId: userId,
          assignedUserId: body.assignedUserId ?? null,
          productId: body.productId ?? null,
          purchaseStatus: body.purchaseStatus ?? null,
          owner: request.user!.name,
        },
        include: leadInclude,
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
      where: { id, clinicId, ...leadScope(request) },
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
      where: { id, clinicId, ...leadScope(request) },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Lead não encontrado." },
      })
    }

    const updateSchema = createLeadSchema.partial().extend({
      position: z.number().optional(),
      name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").optional(),
    })

    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: parsed.error.errors[0]?.message || "Dados inválidos." },
      })
    }
    const body = parsed.data

    let stageData: Record<string, unknown> = {}
    if (body.stageId) {
      const stage = await resolveStage(clinicId, body.stageId, body.pipelineId, isSales(request))
      if (!stage) return reply.status(400).send({ error: { code: "INVALID_INPUT", message: "Etapa inválida." } })
      if (stage.id !== existing.stageId) {
        const legacy = legacyFor(stage)
        const now = new Date()
        stageData = {
          pipelineId: stage.pipelineId,
          stageId: stage.id,
          stage: legacy,
          lastContact: now,
          ...(legacy === LeadStage.WON ? { wonAt: now } : {}),
          ...(legacy === LeadStage.LOST ? { lostAt: now } : {}),
        }
      }
    }
    if (body.assignedUserId && !(await validAssignee(clinicId, body.assignedUserId))) {
      return reply.status(400).send({ error: { code: "INVALID_INPUT", message: "Responsável inválido." } })
    }
    if (body.productId && !(await prisma.crmProduct.findFirst({ where: { id: body.productId, clinicId } }))) {
      return reply.status(400).send({ error: { code: "INVALID_INPUT", message: "Produto inválido." } })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.lead.update({
        where: { id },
        data: {
          ...(body.name && { name: body.name.trim() }),
          ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
          ...(body.email !== undefined && { email: body.email?.trim() || null }),
          ...(body.interest && { interest: body.interest.trim() }),
          ...(body.source && { source: body.source.trim() }),
          ...(body.value !== undefined && { value: body.value }),
          ...(body.temperature && { temperature: body.temperature }),
          ...(body.note !== undefined && { note: body.note?.trim() || null }),
          ...(body.position !== undefined && { position: body.position }),
          ...(body.scheduledFor !== undefined && {
            scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
          }),
          ...(body.assignedUserId !== undefined && { assignedUserId: body.assignedUserId }),
          ...(body.productId !== undefined && { productId: body.productId }),
          ...(body.purchaseStatus !== undefined && { purchaseStatus: body.purchaseStatus }),
          ...stageData,
        },
        include: leadInclude,
      })
      if (stageData.stageId) {
        await tx.clinicActivityLog.create({
          data: {
            clinicId,
            userId,
            entityType: ClinicActivityEntityType.LEAD,
            entityId: id,
            action: ClinicActivityAction.LEAD_STAGE_CHANGED,
          },
        })
      }
      return res
    })

    return { lead: updated }
  })

  // PATCH /api/leads/:id/stage (Kanban Drag and Drop persistence)
  fastify.patch("/leads/:id/stage", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const stageSchema = z
      .object({
        stage: z.nativeEnum(LeadStage).optional(),
        stageId: z.string().uuid().optional(),
        position: z.number().optional(),
      })
      .refine((v) => v.stage || v.stageId)

    const parseResult = stageSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: "Estágio inválido." },
      })
    }

    const { stageId, position } = parseResult.data

    const existing = await prisma.lead.findFirst({
      where: { id, clinicId, ...leadScope(request) },
    })

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Lead não encontrado." },
      })
    }

    // Etapa de destino: informada diretamente ou a equivalente ao enum antigo.
    let target = stageId ? await resolveStage(clinicId, stageId, null, isSales(request)) : null
    if (!target && parseResult.data.stage && !isSales(request)) {
      const pipeline = await ensureDefaultPipeline(clinicId)
      const pipelineStages = existing.pipelineId
        ? await prisma.crmPipelineStage.findMany({ where: { pipelineId: existing.pipelineId } })
        : pipeline.stages
      target =
        pipelineStages.find((s) => s.legacyStage === parseResult.data.stage) ??
        pipeline.stages.find((s) => s.legacyStage === parseResult.data.stage) ??
        null
    }
    if (!target) {
      return reply.status(400).send({ error: { code: "INVALID_INPUT", message: "Etapa inválida." } })
    }
    const stage = legacyFor(target)

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const data: any = {
        stage,
        pipelineId: target.pipelineId,
        stageId: target.id,
        lastContact: now,
      }
      if (position !== undefined) data.position = position
      if (stage === LeadStage.WON) data.wonAt = now
      if (stage === LeadStage.LOST) data.lostAt = now

      const res = await tx.lead.update({
        where: { id },
        data,
        include: leadInclude,
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
    if (isSales(request)) {
      return reply.status(403).send({ error: { code: "FORBIDDEN_FOR_ROLE", message: "Sem permissão para criar pacientes." } })
    }
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const lead = await prisma.lead.findFirst({
      where: { id, clinicId, ...leadScope(request) },
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
      where: { id, clinicId, ...leadScope(request) },
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
