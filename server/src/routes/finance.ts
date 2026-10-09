import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, LedgerKind, LedgerSource } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth, requirePermission } from "../middlewares/auth.js"
import { createUtcFromClinicLocal, getClinicMonthKey, getClinicMonthRange } from "../utils/timezone.js"

const createEntrySchema = z.object({
  kind: z.nativeEnum(LedgerKind),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  occurredAt: z.string().optional(),
})

const updateEntrySchema = z.object({
  category: z.string().trim().min(1, "Categoria é obrigatória").optional(),
  description: z.string().trim().min(1, "Descrição é obrigatória").optional(),
  amount: z.number().positive("Valor deve ser maior que zero").optional(),
  occurredAt: z.string().optional(),
})

/** Data "YYYY-MM-DD" vira meio-dia no fuso da clínica (evita cair no dia anterior em UTC). */
function parseOccurredAt(raw: string, tz: string) {
  const value = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number)
    return createUtcFromClinicLocal(y, m, d, 12, 0, 0, 0, tz)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function financeRoutes(fastify: FastifyInstance) {
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

  // GET /api/finance/entries (requer FINANCE_READ)
  fastify.get(
    "/finance/entries",
    { preHandler: [requirePermission("FINANCE_READ")] },
    async (request) => {
      const querySchema = z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      })

      const { from, to } = querySchema.parse(request.query)
      const clinicId = request.clinic!.id

      const whereClause: any = { clinicId, voidedAt: null }

      if (from || to) {
        whereClause.occurredAt = {}
        if (from) whereClause.occurredAt.gte = new Date(`${from}T00:00:00.000Z`)
        if (to) whereClause.occurredAt.lte = new Date(`${to}T23:59:59.999Z`)
      }

      const entries = await prisma.ledgerEntry.findMany({
        where: whereClause,
        orderBy: { occurredAt: "desc" },
      })

      return { entries }
    },
  )

  // POST /api/finance/entries (Manual revenue or expense - requer FINANCE_WRITE)
  fastify.post(
    "/finance/entries",
    { preHandler: [requirePermission("FINANCE_WRITE")] },
    async (request, reply) => {
      const parseResult = createEntrySchema.safeParse(request.body)
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
      const tz = request.clinic?.timezone || "America/Sao_Paulo"

      let occurredAt = new Date()
      if (body.occurredAt) {
        const parsed = parseOccurredAt(body.occurredAt, tz)
        if (!parsed) {
          return reply.status(400).send({ error: { code: "INVALID_INPUT", message: "Data inválida." } })
        }
        occurredAt = parsed
      }

      const entry = await prisma.$transaction(async (tx) => {
        const created = await tx.ledgerEntry.create({
          data: {
            clinicId,
            kind: body.kind,
            source: LedgerSource.MANUAL,
            category: body.category.trim(),
            description: body.description.trim(),
            amount: body.amount,
            directCost: 0,
            countsAsAppointment: false,
            occurredAt,
            createdByUserId: userId,
          },
        })

        await tx.clinicActivityLog.create({
          data: {
            clinicId,
            userId,
            entityType: ClinicActivityEntityType.FINANCE,
            entityId: created.id,
            action: ClinicActivityAction.FINANCE_ENTRY_CREATED,
          },
        })

        return created
      })

      return reply.status(201).send({ entry })
    },
  )

  // PATCH /api/finance/entries/:id (editar lançamento manual - requer FINANCE_WRITE)
  fastify.patch(
    "/finance/entries/:id",
    { preHandler: [requirePermission("FINANCE_WRITE")] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const clinicId = request.clinic!.id
      const userId = request.user!.id
      const tz = request.clinic?.timezone || "America/Sao_Paulo"

      const parseResult = updateEntrySchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({
          error: { code: "INVALID_INPUT", message: parseResult.error.errors[0]?.message || "Dados inválidos." },
        })
      }

      const existing = await prisma.ledgerEntry.findFirst({ where: { id, clinicId, voidedAt: null } })
      if (!existing) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Lançamento não encontrado." } })
      }
      if (existing.source !== LedgerSource.MANUAL) {
        return reply.status(409).send({
          error: {
            code: "AUTOMATIC_ENTRY",
            message: "Este lançamento foi gerado por um procedimento registrado. Ajuste pelo registro do procedimento.",
          },
        })
      }

      const body = parseResult.data
      let occurredAt: Date | undefined
      if (body.occurredAt) {
        const parsed = parseOccurredAt(body.occurredAt, tz)
        if (!parsed) {
          return reply.status(400).send({ error: { code: "INVALID_INPUT", message: "Data inválida." } })
        }
        occurredAt = parsed
      }

      const entry = await prisma.$transaction(async (tx) => {
        const updated = await tx.ledgerEntry.update({
          where: { id },
          data: {
            ...(body.category !== undefined ? { category: body.category } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.amount !== undefined ? { amount: body.amount } : {}),
            ...(occurredAt ? { occurredAt } : {}),
          },
        })
        await tx.clinicActivityLog.create({
          data: {
            clinicId,
            userId,
            entityType: ClinicActivityEntityType.FINANCE,
            entityId: id,
            action: ClinicActivityAction.FINANCE_ENTRY_UPDATED,
          },
        })
        return updated
      })

      return { entry }
    },
  )

  // DELETE /api/finance/entries/:id (anula o lançamento manual - requer FINANCE_WRITE)
  // O registro é mantido com voidedAt para auditoria; some do extrato e dos totais.
  fastify.delete(
    "/finance/entries/:id",
    { preHandler: [requirePermission("FINANCE_WRITE")] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const clinicId = request.clinic!.id
      const userId = request.user!.id

      const existing = await prisma.ledgerEntry.findFirst({ where: { id, clinicId, voidedAt: null } })
      if (!existing) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Lançamento não encontrado." } })
      }
      if (existing.source !== LedgerSource.MANUAL) {
        return reply.status(409).send({
          error: {
            code: "AUTOMATIC_ENTRY",
            message: "Este lançamento foi gerado por um procedimento registrado e não pode ser excluído por aqui.",
          },
        })
      }

      await prisma.$transaction([
        prisma.ledgerEntry.update({ where: { id }, data: { voidedAt: new Date() } }),
        prisma.clinicActivityLog.create({
          data: {
            clinicId,
            userId,
            entityType: ClinicActivityEntityType.FINANCE,
            entityId: id,
            action: ClinicActivityAction.FINANCE_ENTRY_VOIDED,
          },
        }),
      ])

      return { ok: true }
    },
  )

  // GET /api/finance/summary?month=YYYY-MM (requer FINANCE_READ)
  fastify.get(
    "/finance/summary",
    { preHandler: [requirePermission("FINANCE_READ")] },
    async (request) => {
    const querySchema = z.object({
      month: z.string().optional(),
    })

    const { month } = querySchema.parse(request.query)
    const clinicId = request.clinic!.id

    const tz = request.clinic!.timezone || "America/Sao_Paulo"
    const now = new Date()
    const targetMonth = month && month.trim() ? month.trim() : getClinicMonthKey(now, tz)

    const { startDate, endDate } = getClinicMonthRange(targetMonth, tz)

    const monthEntries = await prisma.ledgerEntry.findMany({
      where: {
        clinicId,
        voidedAt: null,
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    let revenue = 0
    let expenses = 0
    let directCost = 0
    let appointments = 0

    for (const e of monthEntries) {
      const amt = Number(e.amount)
      const dc = Number(e.directCost)

      if (e.kind === LedgerKind.REVENUE) {
        revenue += amt
        directCost += dc
        if (e.countsAsAppointment) appointments += 1
      } else if (e.kind === LedgerKind.EXPENSE) {
        expenses += amt
      }
    }

    const profit = revenue - expenses
    const margin = revenue === 0 ? 0 : Math.round((profit / revenue) * 1000) / 10
    const contribution = revenue - directCost
    const contributionMargin = revenue === 0 ? 0 : Math.round((contribution / revenue) * 1000) / 10
    const averageTicket = appointments === 0 ? 0 : Math.round((revenue / appointments) * 100) / 100

    return {
      month: targetMonth,
      summary: {
        revenue,
        expenses,
        profit,
        margin,
        directCost,
        contribution,
        contributionMargin,
        appointments,
        averageTicket,
      },
    }
  })
}
