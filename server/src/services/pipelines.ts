/**
 * Pipelines personalizados do CRM.
 *
 * Cada lead pertence a um pipeline e a uma etapa (`stageId`). O campo antigo
 * `lead.stage` (enum LeadStage) continua existindo porque propostas,
 * conversão em paciente, recuperador e indicadores dependem dele. As duas
 * informações são mantidas coerentes:
 *  - mover o lead de etapa atualiza `stage` a partir da etapa (ver `legacyFor`);
 *  - quando outra parte do app muda só o `stage` (ex.: proposta enviada,
 *    conversão), `reconcileLeadStages` move o lead para a etapa equivalente.
 */
import { CrmPipelineKind, CrmStageType, LeadStage, Prisma, type CrmPipelineStage } from "@prisma/client"
import { prisma } from "../db.js"

type Tx = Prisma.TransactionClient | typeof prisma

export const DEFAULT_PIPELINE_STAGES: {
  name: string
  color: string
  type: CrmStageType
  legacyStage: LeadStage
}[] = [
  { name: "Novos contatos", color: "azul", type: CrmStageType.OPEN, legacyStage: LeadStage.NEW_CONTACT },
  { name: "Avaliação agendada", color: "roxo", type: CrmStageType.OPEN, legacyStage: LeadStage.EVALUATION_SCHEDULED },
  { name: "Proposta enviada", color: "rosa", type: CrmStageType.OPEN, legacyStage: LeadStage.PROPOSAL_SENT },
  { name: "Fechado", color: "verde", type: CrmStageType.WON, legacyStage: LeadStage.WON },
  { name: "Perdido", color: "cinza", type: CrmStageType.LOST, legacyStage: LeadStage.LOST },
]

/** Etapas iniciais de um pipeline novo criado pela clínica. */
export const NEW_PIPELINE_STAGES: { name: string; color: string; type: CrmStageType }[] = [
  { name: "Novo", color: "azul", type: CrmStageType.OPEN },
  { name: "Em negociação", color: "amarelo", type: CrmStageType.OPEN },
  { name: "Ganho", color: "verde", type: CrmStageType.WON },
  { name: "Perdido", color: "cinza", type: CrmStageType.LOST },
]

/** Valor do enum antigo correspondente a uma etapa. */
export function legacyFor(stage: Pick<CrmPipelineStage, "type" | "legacyStage">): LeadStage {
  if (stage.legacyStage) return stage.legacyStage
  if (stage.type === CrmStageType.WON) return LeadStage.WON
  if (stage.type === CrmStageType.LOST) return LeadStage.LOST
  return LeadStage.NEW_CONTACT
}

/** Garante que a clínica tenha o pipeline "Comercial" (equivalente ao funil original). */
export async function ensureDefaultPipeline(clinicId: string, tx: Tx = prisma) {
  const existing = await tx.crmPipeline.findFirst({
    where: { clinicId, isDefault: true },
    include: { stages: { orderBy: { position: "asc" } } },
  })
  if (existing) return existing

  try {
    return await tx.crmPipeline.create({
      data: {
        clinicId,
        name: "Comercial",
        isDefault: true,
        position: 0,
        stages: {
          create: DEFAULT_PIPELINE_STAGES.map((stage, position) => ({ ...stage, position })),
        },
      },
      include: { stages: { orderBy: { position: "asc" } } },
    })
  } catch (err) {
    // Duas requisições simultâneas: usa o que a outra criou.
    const again = await tx.crmPipeline.findFirst({
      where: { clinicId, isDefault: true },
      include: { stages: { orderBy: { position: "asc" } } },
    })
    if (again) return again
    throw err
  }
}

/** Primeira etapa do pipeline padrão que corresponde ao enum informado. */
function stageForLegacy(stages: CrmPipelineStage[], legacy: LeadStage) {
  return (
    stages.find((s) => s.legacyStage === legacy) ??
    (legacy === LeadStage.WON ? stages.find((s) => s.type === CrmStageType.WON) : undefined) ??
    (legacy === LeadStage.LOST ? stages.find((s) => s.type === CrmStageType.LOST) : undefined) ??
    stages.find((s) => s.type === CrmStageType.OPEN) ??
    stages[0]
  )
}

/**
 * Coloca em uma etapa os leads ainda sem pipeline e ajusta os que tiveram o
 * `stage` alterado por outras partes do app (proposta, conversão, recuperador).
 */
export async function reconcileLeadStages(clinicId: string) {
  const defaultPipeline = await ensureDefaultPipeline(clinicId)
  const leads = await prisma.lead.findMany({
    where: { clinicId, archivedAt: null },
    select: {
      id: true,
      stage: true,
      pipelineId: true,
      stageId: true,
      pipelineStage: { select: { id: true, pipelineId: true, type: true, legacyStage: true } },
    },
  })

  const pipelinesNeeded = new Set(
    leads.map((l) => l.pipelineStage?.pipelineId ?? l.pipelineId).filter((id): id is string => Boolean(id)),
  )
  const pipelines = await prisma.crmPipeline.findMany({
    where: { clinicId, id: { in: [...pipelinesNeeded] } },
    include: { stages: { orderBy: { position: "asc" } } },
  })
  const stagesByPipeline = new Map(pipelines.map((p) => [p.id, p.stages]))
  stagesByPipeline.set(defaultPipeline.id, defaultPipeline.stages)

  const updates: { id: string; pipelineId: string; stageId: string }[] = []
  for (const lead of leads) {
    const current = lead.pipelineStage
    if (!current) {
      // Sem etapa (lead antigo, etapa excluída ou criado por outra rota).
      const pipelineId = lead.pipelineId && stagesByPipeline.has(lead.pipelineId) ? lead.pipelineId : defaultPipeline.id
      const target = stageForLegacy(stagesByPipeline.get(pipelineId) ?? [], lead.stage)
      if (target) updates.push({ id: lead.id, pipelineId, stageId: target.id })
      continue
    }
    if (legacyFor(current) === lead.stage) continue

    const stages = stagesByPipeline.get(current.pipelineId) ?? []
    const isDefault = current.pipelineId === defaultPipeline.id
    let target: CrmPipelineStage | undefined
    if (lead.stage === LeadStage.WON) target = stages.find((s) => s.type === CrmStageType.WON)
    else if (lead.stage === LeadStage.LOST) target = stages.find((s) => s.type === CrmStageType.LOST)
    else if (isDefault) target = stages.find((s) => s.legacyStage === lead.stage)
    // Em pipelines personalizados, mudanças entre etapas "em andamento" do
    // funil antigo não movem o card (a clínica organiza como quiser).
    if (target && target.id !== current.id) {
      updates.push({ id: lead.id, pipelineId: current.pipelineId, stageId: target.id })
    } else if (!target && lead.pipelineId !== current.pipelineId) {
      updates.push({ id: lead.id, pipelineId: current.pipelineId, stageId: current.id })
    }
  }

  if (updates.length) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.lead.update({ where: { id: u.id }, data: { pipelineId: u.pipelineId, stageId: u.stageId } }),
      ),
    )
  }
}

/** Primeira etapa em andamento do primeiro pipeline de produtos digitais. */
export async function firstDigitalStage(clinicId: string) {
  const pipeline = await prisma.crmPipeline.findFirst({
    where: { clinicId, kind: CrmPipelineKind.DIGITAL },
    include: { stages: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  })
  if (!pipeline) return null
  return pipeline.stages.find((s) => s.type === CrmStageType.OPEN) ?? pipeline.stages[0] ?? null
}
