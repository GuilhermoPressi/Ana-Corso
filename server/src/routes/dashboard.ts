import type { FastifyInstance } from "fastify"
import { ClinicStatus, LedgerKind, PatientStatus, ScheduleEventStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

export async function dashboardRoutes(fastify: FastifyInstance) {
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

  // GET /api/dashboard?month=YYYY-MM
  fastify.get("/dashboard", async (request) => {
    const querySchema = z.object({
      month: z.string().optional(),
    })

    const { month } = querySchema.parse(request.query)
    const clinicId = request.clinic!.id

    const now = new Date()
    const targetMonth = month && month.trim() ? month.trim() : now.toISOString().slice(0, 7)

    const [yearStr, monthStr] = targetMonth.split("-")
    const year = parseInt(yearStr, 10)
    const monthNum = parseInt(monthStr, 10)

    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0))
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999))

    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

    const [monthEntries, activePatientsCount, todayEvents, inventoryItems, proceduresGroup] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: {
          clinicId,
          voidedAt: null,
          occurredAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.patient.count({
        where: { clinicId, status: PatientStatus.ACTIVE },
      }),
      prisma.scheduleEvent.findMany({
        where: {
          clinicId,
          startsAt: { gte: todayStart, lte: todayEnd },
          status: { not: ScheduleEventStatus.CANCELLED },
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.inventoryItem.findMany({
        where: { clinicId, archivedAt: null },
      }),
      prisma.procedureRecord.findMany({
        where: { clinicId, performedAt: { gte: startDate, lte: endDate } },
        select: {
          procedureCategory: true,
          value: true,
        },
      }),
    ])

    let revenue = 0
    let expenses = 0
    let appointments = 0

    for (const e of monthEntries) {
      const amt = Number(e.amount)
      if (e.kind === LedgerKind.REVENUE) {
        revenue += amt
        if (e.countsAsAppointment) appointments += 1
      } else if (e.kind === LedgerKind.EXPENSE) {
        expenses += amt
      }
    }

    const profit = revenue - expenses
    const averageTicket = appointments === 0 ? 0 : Math.round((revenue / appointments) * 100) / 100

    // Low stock alerts
    const lowStockAlerts = inventoryItems
      .filter((item) => Number(item.quantity) <= Number(item.minQuantity))
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity),
        minQuantity: Number(item.minQuantity),
        unit: item.contentUnit,
      }))

    // Top procedures grouping
    const procedureMap = new Map<string, { revenue: number; sessions: number }>()
    for (const p of proceduresGroup) {
      const cat = p.procedureCategory
      const val = Number(p.value)
      const current = procedureMap.get(cat) || { revenue: 0, sessions: 0 }
      procedureMap.set(cat, {
        revenue: current.revenue + val,
        sessions: current.sessions + 1,
      })
    }

    const topProcedures = Array.from(procedureMap.entries())
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      month: targetMonth,
      metrics: {
        revenue,
        expenses,
        profit,
        averageTicket,
        activePatientsCount,
        todayAppointmentsCount: todayEvents.length,
      },
      todayEvents,
      lowStockAlerts,
      topProcedures,
    }
  })
}
