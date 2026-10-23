import type { FastifyInstance, FastifyRequest } from "fastify"
import { ClinicStatus, CrmPipelineKind, CrmStageType, Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth, requirePermission } from "../middlewares/auth.js"
import { ensureDefaultPipeline, NEW_PIPELINE_STAGES, legacyFor } from "../services/pipelines.js"

const COLORS = ["rosa", "roxo", "azul", "verde", "amarelo", "laranja", "vermelho", "cinza"] as const

const pipelineSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do pipeline.").max(60),
  kind: z.nativeEnum(CrmPipelineKind).optional(),
})

const productSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto.").max(120),
  price: z.number().nonnegative().default(0),
  active: z.boolean().default(true),
  externalIds: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  pipelineId: z.string().uuid().nullable().optional(),
  buyerStageId: z.string().uuid().nullable().optional(),
  buyerTag: z.string().trim().max(40).nullable().optional(),
})

function serializeProduct(p: Prisma.CrmProductGetPayload<object>) {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    active: p.active,
    externalIds: p.externalIds,
    pipelineId: p.pipelineId,
    buyerStageId: p.buyerStageId,
    buyerTag: p.buyerTag,
  }
}

const stageSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da etapa.").max(60),
  color: z.enum(COLORS).default("azul"),
  type: z.nativeEnum(CrmStageType).default(CrmStageType.OPEN),
})

const CRM_WRITE = { preHandler: [requirePermission("CRM_WRITE")] }

function badRequest(message: string) {
  return { error: { code: "INVALID_INPUT", message } }
}

function notFound(message: string) {
  return { error: { code: "NOT_FOUND", message } }
}

/** O perfil Comercial só enxerga e mexe nos pipelines de produtos digitais. */
export function pipelineScope(request: FastifyRequest): Prisma.CrmPipelineWhereInput {
  return request.clinicRole === "SALES" ? { kind: CrmPipelineKind.DIGITAL } : {}
}

async function listPipelines(clinicId: string, scope: Prisma.CrmPipelineWhereInput = {}) {
  await ensureDefaultPipeline(clinicId)
  const [pipelines, counts] = await Promise.all([
    prisma.crmPipeline.findMany({
      where: { clinicId, ...scope },
      include: { stages: { orderBy: { position: "asc" } } },
      orderBy: [{ isDefault: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    }),
    prisma.lead.groupBy({
      by: ["stageId"],
      where: { clinicId, archivedAt: null, stageId: { not: null } },
      _count: { _all: true },
    }),
  ])
  const countByStage = new Map(counts.map((c) => [c.stageId, c._count._all]))
  return pipelines.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    isDefault: p.isDefault,
    stages: p.stages.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      type: s.type,
      position: s.position,
      leadCount: countByStage.get(s.id) ?? 0,
    })),
  }))
}

export async function pipelineRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)
  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) return reply.status(404).send(notFound("Nenhuma clínica ativa vinculada à sessão."))
    if (request.clinic.status === ClinicStatus.BLOCKED) {
      return reply.status(403).send({ error: { code: "CLINIC_BLOCKED", message: "Acesso da clínica temporariamente suspenso." } })
    }
  })

  fastify.get("/crm/pipelines", async (request) => {
    return { pipelines: await listPipelines(request.clinic!.id, pipelineScope(request)) }
  })

  fastify.post("/crm/pipelines", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const parsed = pipelineSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))
    const last = await prisma.crmPipeline.findFirst({ where: { clinicId }, orderBy: { position: "desc" } })
    const pipeline = await prisma.crmPipeline.create({
      data: {
        clinicId,
        name: parsed.data.name,
        kind: request.clinicRole === "SALES" ? CrmPipelineKind.DIGITAL : (parsed.data.kind ?? CrmPipelineKind.CLINIC),
        position: (last?.position ?? 0) + 1,
        stages: { create: NEW_PIPELINE_STAGES.map((stage, position) => ({ ...stage, position })) },
      },
    })
    return reply.status(201).send({ pipelineId: pipeline.id, pipelines: await listPipelines(clinicId, pipelineScope(request)) })
  })

  fastify.patch("/crm/pipelines/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const parsed = pipelineSchema.partial().safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))
    const result = await prisma.crmPipeline.updateMany({
      where: { id, clinicId, ...pipelineScope(request) },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.kind && request.clinicRole !== "SALES" ? { kind: parsed.data.kind } : {}),
      },
    })
    if (result.count === 0) return reply.status(404).send(notFound("Pipeline não encontrado."))
    return { pipelines: await listPipelines(clinicId, pipelineScope(request)) }
  })

  /** Exclui um pipeline; os leads dele vão para a primeira etapa do pipeline Comercial. */
  fastify.delete("/crm/pipelines/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const pipeline = await prisma.crmPipeline.findFirst({ where: { id, clinicId, ...pipelineScope(request) } })
    if (!pipeline) return reply.status(404).send(notFound("Pipeline não encontrado."))
    if (pipeline.isDefault) {
      return reply.status(409).send({ error: { code: "DEFAULT_PIPELINE", message: "O pipeline Comercial não pode ser excluído." } })
    }

    // Leads de um pipeline digital vão para outro digital (se houver); os demais, para o Comercial.
    const sibling =
      pipeline.kind === CrmPipelineKind.DIGITAL
        ? await prisma.crmPipeline.findFirst({
            where: { clinicId, kind: CrmPipelineKind.DIGITAL, id: { not: id } },
            include: { stages: true },
            orderBy: { position: "asc" },
          })
        : null
    if (!sibling && request.clinicRole === "SALES") {
      const leads = await prisma.lead.count({ where: { clinicId, pipelineId: id, archivedAt: null } })
      if (leads > 0) {
        return reply.status(409).send({
          error: { code: "PIPELINE_HAS_LEADS", message: "Crie outro pipeline de infoprodutos antes, para os leads não se perderem." },
        })
      }
    }
    const destination = sibling ?? (await ensureDefaultPipeline(clinicId))
    const sorted = [...destination.stages].sort((a, b) => a.position - b.position)
    const target = sorted.find((s) => s.type === CrmStageType.OPEN) ?? sorted[0]
    await prisma.$transaction([
      prisma.lead.updateMany({
        where: { clinicId, pipelineId: id },
        data: { pipelineId: destination.id, stageId: target.id, stage: legacyFor(target) },
      }),
      prisma.crmPipeline.delete({ where: { id } }),
    ])
    return { pipelines: await listPipelines(clinicId, pipelineScope(request)) }
  })

  fastify.post("/crm/pipelines/:id/stages", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const parsed = stageSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))
    const pipeline = await prisma.crmPipeline.findFirst({
      where: { id, clinicId, ...pipelineScope(request) },
      include: { stages: { orderBy: { position: "asc" } } },
    })
    if (!pipeline) return reply.status(404).send(notFound("Pipeline não encontrado."))

    // Etapas "em andamento" entram antes das de ganho/perda; as demais vão para o fim.
    const firstClosed = pipeline.stages.find((s) => s.type !== CrmStageType.OPEN)
    const position = parsed.data.type === CrmStageType.OPEN && firstClosed ? firstClosed.position : pipeline.stages.length
    await prisma.$transaction([
      prisma.crmPipelineStage.updateMany({
        where: { pipelineId: id, position: { gte: position } },
        data: { position: { increment: 1 } },
      }),
      prisma.crmPipelineStage.create({ data: { pipelineId: id, ...parsed.data, position } }),
    ])
    return reply.status(201).send({ pipelines: await listPipelines(clinicId, pipelineScope(request)) })
  })

  fastify.patch("/crm/stages/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const parsed = stageSchema.partial().safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))
    const stage = await prisma.crmPipelineStage.findFirst({ where: { id, pipeline: { clinicId, ...pipelineScope(request) } } })
    if (!stage) return reply.status(404).send(notFound("Etapa não encontrada."))

    const typeChanged = parsed.data.type && parsed.data.type !== stage.type
    const updated = await prisma.crmPipelineStage.update({
      where: { id },
      // Mudar o tipo desfaz a equivalência com o funil original.
      data: { ...parsed.data, ...(typeChanged ? { legacyStage: null } : {}) },
    })
    if (typeChanged) {
      await prisma.lead.updateMany({ where: { clinicId, stageId: id }, data: { stage: legacyFor(updated) } })
    }
    return { pipelines: await listPipelines(clinicId, pipelineScope(request)) }
  })

  /** Exclui uma etapa; se tiver leads, eles vão para `moveToStageId` (mesmo pipeline). */
  fastify.delete("/crm/stages/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const { moveToStageId } = z.object({ moveToStageId: z.string().uuid().optional() }).parse(request.query)

    const stage = await prisma.crmPipelineStage.findFirst({
      where: { id, pipeline: { clinicId, ...pipelineScope(request) } },
      include: { pipeline: { include: { stages: true } } },
    })
    if (!stage) return reply.status(404).send(notFound("Etapa não encontrada."))
    if (stage.pipeline.stages.length <= 1) {
      return reply.status(409).send({ error: { code: "LAST_STAGE", message: "O pipeline precisa ter pelo menos uma etapa." } })
    }

    const leadCount = await prisma.lead.count({ where: { clinicId, stageId: id, archivedAt: null } })
    const target = moveToStageId ? stage.pipeline.stages.find((s) => s.id === moveToStageId && s.id !== id) : undefined
    if (leadCount > 0 && !target) {
      return reply.status(409).send({
        error: { code: "STAGE_HAS_LEADS", message: "Escolha para qual etapa mover os leads desta etapa." },
      })
    }

    await prisma.$transaction([
      ...(target
        ? [prisma.lead.updateMany({ where: { clinicId, stageId: id }, data: { stageId: target.id, stage: legacyFor(target) } })]
        : []),
      prisma.crmPipelineStage.delete({ where: { id } }),
      prisma.crmPipelineStage.updateMany({
        where: { pipelineId: stage.pipelineId, position: { gt: stage.position } },
        data: { position: { decrement: 1 } },
      }),
    ])
    return { pipelines: await listPipelines(clinicId, pipelineScope(request)) }
  })

  /** Reordena as etapas de um pipeline (lista completa de ids na nova ordem). */
  fastify.put("/crm/pipelines/:id/stages/order", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const parsed = z.object({ stageIds: z.array(z.string().uuid()).min(1) }).safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest("Ordem inválida."))
    const pipeline = await prisma.crmPipeline.findFirst({ where: { id, clinicId, ...pipelineScope(request) }, include: { stages: true } })
    if (!pipeline) return reply.status(404).send(notFound("Pipeline não encontrado."))
    const ids = new Set(pipeline.stages.map((s) => s.id))
    if (parsed.data.stageIds.length !== ids.size || parsed.data.stageIds.some((sid) => !ids.has(sid))) {
      return reply.status(400).send(badRequest("A lista precisa conter todas as etapas do pipeline."))
    }
    await prisma.$transaction(
      parsed.data.stageIds.map((stageId, position) => prisma.crmPipelineStage.update({ where: { id: stageId }, data: { position } })),
    )
    return { pipelines: await listPipelines(clinicId, pipelineScope(request)) }
  })

  // ==========================================================================
  // Produtos digitais
  // ==========================================================================

  async function validateProductTarget(
    clinicId: string,
    pipelineId?: string | null,
    stageId?: string | null,
    scope: Prisma.CrmPipelineWhereInput = {},
  ) {
    if (stageId) {
      const stage = await prisma.crmPipelineStage.findFirst({ where: { id: stageId, pipeline: { clinicId, ...scope } } })
      if (!stage) return { error: "Etapa inválida." }
      if (pipelineId && stage.pipelineId !== pipelineId) return { error: "A etapa não pertence ao pipeline escolhido." }
      return { pipelineId: stage.pipelineId, stageId }
    }
    if (pipelineId) {
      const pipeline = await prisma.crmPipeline.findFirst({ where: { id: pipelineId, clinicId, ...scope } })
      if (!pipeline) return { error: "Pipeline inválido." }
    }
    return { pipelineId: pipelineId ?? null, stageId: null }
  }

  fastify.get("/crm/products", async (request) => {
    const products = await prisma.crmProduct.findMany({
      where: { clinicId: request.clinic!.id },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    })
    return { products: products.map(serializeProduct) }
  })

  fastify.post("/crm/products", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const parsed = productSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))
    const target = await validateProductTarget(clinicId, parsed.data.pipelineId, parsed.data.buyerStageId, pipelineScope(request))
    if ("error" in target) return reply.status(400).send(badRequest(target.error!))
    const product = await prisma.crmProduct.create({
      data: {
        clinicId,
        name: parsed.data.name,
        price: parsed.data.price,
        active: parsed.data.active,
        externalIds: [...new Set(parsed.data.externalIds)],
        pipelineId: target.pipelineId,
        buyerStageId: target.stageId,
        buyerTag: parsed.data.buyerTag === undefined ? "compradora" : parsed.data.buyerTag?.toLowerCase() || null,
      },
    })
    return reply.status(201).send({ product: serializeProduct(product) })
  })

  fastify.patch("/crm/products/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const parsed = productSchema.partial().safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))
    const existing = await prisma.crmProduct.findFirst({ where: { id, clinicId } })
    if (!existing) return reply.status(404).send(notFound("Produto não encontrado."))
    const d = parsed.data
    let targetData = {}
    if (d.pipelineId !== undefined || d.buyerStageId !== undefined) {
      const target = await validateProductTarget(
        clinicId,
        d.pipelineId !== undefined ? d.pipelineId : existing.pipelineId,
        d.buyerStageId !== undefined ? d.buyerStageId : existing.buyerStageId,
        pipelineScope(request),
      )
      if ("error" in target) return reply.status(400).send(badRequest(target.error!))
      targetData = { pipelineId: target.pipelineId, buyerStageId: target.stageId }
    }
    const product = await prisma.crmProduct.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.price !== undefined ? { price: d.price } : {}),
        ...(d.active !== undefined ? { active: d.active } : {}),
        ...(d.externalIds !== undefined ? { externalIds: [...new Set(d.externalIds)] } : {}),
        ...(d.buyerTag !== undefined ? { buyerTag: d.buyerTag?.toLowerCase() || null } : {}),
        ...targetData,
      },
    })
    return { product: serializeProduct(product) }
  })

  fastify.delete("/crm/products/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const result = await prisma.crmProduct.deleteMany({ where: { id, clinicId } })
    if (result.count === 0) return reply.status(404).send(notFound("Produto não encontrado."))
    return { ok: true }
  })
}
