import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, LedgerKind, LedgerSource } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth, requirePermission } from "../middlewares/auth.js"
import { getClinicMonthKey, getClinicMonthRange } from "../utils/timezone.js"

const createEntrySchema = z.object({
  kind: z.nativeEnum(LedgerKind),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  occurredAt: z.string().optional(),
})

export async function financeRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)
  fastify.addHook("preHandler", requirePermission("FINANCE_READ"))

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

  // GET /api/finance/entries
  fastify.get("/finance/entries", async (request) => {
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
  })

  // POST /api/finance/entries (Manual revenue or expense)
  fastify.post("/finance/entries", async (request, reply) => {
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
    const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date()

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
  })

  // GET /api/finance/summary?month=YYYY-MM
  fastify.get("/finance/summary", async (request) => {
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
