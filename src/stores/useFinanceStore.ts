import { create } from "zustand"

import { type RevenuePoint } from "@/data/dashboard"
import { CLINIC_TODAY, isCurrentMonth } from "@/lib/clinic"

export type LedgerKind = "receita" | "despesa"

export type LedgerEntry = {
  id: string
  date: string
  kind: LedgerKind
  description: string
  category: string
  amount: number
  patientId?: string
  countsAsAppointment?: boolean
  directCost?: number
}

export type CategoryTotal = {
  name: string
  revenue: number
  sessions: number
  directCost: number
}

export type Baseline = {
  expenses: number
  revenueByCategory: CategoryTotal[]
}

export type PricedProcedure = {
  id: string
  name: string
  productCost: number
  materialCost: number
  roomCost: number
  cardFeePercent: number
  taxPercent: number
  marginPercent: number
  price: number
  createdAt: string
}

type FinanceState = {
  ledger: LedgerEntry[]
  baseline: Baseline
  goal: number
  revenueSeries: RevenuePoint[]
  operational: { returnRate: number; occupancy: number; avgHoursPerDay: number }
  procedures: PricedProcedure[]
  loading: boolean
  error: string | null

  fetchEntries: (from?: string, to?: string) => Promise<void>
  registerRevenue: (input: {
    description: string
    category: string
    amount: number
    patientId?: string
    countsAsAppointment?: boolean
    directCost?: number
  }) => Promise<boolean>
  registerExpense: (input: { description: string; category: string; amount: number }) => Promise<boolean>
  addProcedure: (procedure: Omit<PricedProcedure, "id" | "createdAt">) => PricedProcedure
  removeProcedure: (id: string) => void
}

let sequence = 0
function nextId(prefix: string) {
  sequence += 1
  return `${prefix}-${sequence}`
}

export function mapDbLedgerToFrontend(dbL: any): LedgerEntry {
  const dt = dbL.occurredAt ? new Date(dbL.occurredAt) : new Date()
  const dateStr = dt.toISOString().split("T")[0]

  return {
    id: dbL.id,
    date: dateStr,
    kind: dbL.kind === "REVENUE" ? "receita" : "despesa",
    description: dbL.description,
    category: dbL.category,
    amount: Number(dbL.amount),
    patientId: dbL.patientId || undefined,
    countsAsAppointment: dbL.countsAsAppointment ?? true,
    directCost: dbL.directCost ? Number(dbL.directCost) : 0,
  }
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  ledger: [],
  baseline: { expenses: 0, revenueByCategory: [] },
  goal: 0,
  revenueSeries: [],
  operational: { returnRate: 0, occupancy: 0, avgHoursPerDay: 0 },
  procedures: [],
  loading: false,
  error: null,

  fetchEntries: async (from, to) => {
    set({ loading: true, error: null })
    try {
      const q = new URLSearchParams()
      if (from) q.append("from", from)
      if (to) q.append("to", to)

      const res = await fetch(`/api/finance/entries?${q.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.entries || []).map(mapDbLedgerToFrontend)
        set({ ledger: mapped, loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  registerRevenue: async ({
    description,
    category,
    amount,
  }) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch("/api/finance/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "REVENUE",
          category,
          description,
          amount,
        }),
      })

      if (!res.ok) {
        set({ loading: false })
        return false
      }

      await get().fetchEntries()
      set({ loading: false })
      return true
    } catch {
      set({ loading: false })
      return false
    }
  },

  registerExpense: async ({ description, category, amount }) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch("/api/finance/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "EXPENSE",
          category,
          description,
          amount,
        }),
      })

      if (!res.ok) {
        set({ loading: false })
        return false
      }

      await get().fetchEntries()
      set({ loading: false })
      return true
    } catch {
      set({ loading: false })
      return false
    }
  },

  addProcedure: (procedure) => {
    const created: PricedProcedure = { ...procedure, id: nextId("proc"), createdAt: CLINIC_TODAY }
    set((state) => ({ procedures: [created, ...state.procedures] }))
    return created
  },

  removeProcedure: (id) =>
    set((state) => ({ procedures: state.procedures.filter((item) => item.id !== id) })),
}))

export type MonthSummary = {
  revenue: number
  expenses: number
  profit: number
  margin: number
  appointments: number
  ticket: number
  directCost: number
  productPurchases: number
  fixedCost: number
  contribution: number
}

export function summarizeMonth(ledger: LedgerEntry[], baseline: Baseline): MonthSummary {
  const monthEntries = ledger.filter((entry) => isCurrentMonth(entry.date))

  const baselineRevenue = baseline.revenueByCategory.reduce((sum, item) => sum + item.revenue, 0)
  const baselineAppointments = baseline.revenueByCategory.reduce((sum, item) => sum + item.sessions, 0)

  const revenue =
    baselineRevenue +
    monthEntries.filter((e) => e.kind === "receita").reduce((sum, e) => sum + e.amount, 0)

  const expenses =
    baseline.expenses +
    monthEntries.filter((e) => e.kind === "despesa").reduce((sum, e) => sum + e.amount, 0)

  const appointments =
    baselineAppointments +
    monthEntries.filter((e) => e.kind === "receita" && e.countsAsAppointment).length

  const profit = revenue - expenses

  const directCost =
    baseline.revenueByCategory.reduce((sum, item) => sum + item.directCost, 0) +
    monthEntries
      .filter((e) => e.kind === "receita")
      .reduce((sum, e) => sum + (e.directCost ?? 0), 0)

  const productPurchases = monthEntries
    .filter((e) => e.kind === "despesa" && e.category === "Produtos")
    .reduce((sum, e) => sum + e.amount, 0)

  const fixedCost = expenses - productPurchases

  return {
    revenue,
    expenses,
    profit,
    margin: revenue === 0 ? 0 : (profit / revenue) * 100,
    appointments,
    ticket: appointments === 0 ? 0 : revenue / appointments,
    directCost,
    productPurchases,
    fixedCost,
    contribution: revenue - directCost,
  }
}

export function revenueByCategory(ledger: LedgerEntry[], baseline: Baseline): CategoryTotal[] {
  const totals = new Map<string, Omit<CategoryTotal, "name">>()

  for (const item of baseline.revenueByCategory) {
    totals.set(item.name, {
      revenue: item.revenue,
      sessions: item.sessions,
      directCost: item.directCost,
    })
  }

  for (const entry of ledger) {
    if (entry.kind !== "receita" || !isCurrentMonth(entry.date)) continue
    const current = totals.get(entry.category) ?? { revenue: 0, sessions: 0, directCost: 0 }
    totals.set(entry.category, {
      revenue: current.revenue + entry.amount,
      sessions: current.sessions + (entry.countsAsAppointment ? 1 : 0),
      directCost: current.directCost + (entry.directCost ?? 0),
    })
  }

  return [...totals.entries()]
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.revenue - a.revenue)
}

export type ProfitabilityRow = CategoryTotal & {
  contribution: number
  contributionMargin: number
  contributionPerSession: number
  share: number
}

export function profitabilityByCategory(
  ledger: LedgerEntry[],
  baseline: Baseline,
): ProfitabilityRow[] {
  const categories = revenueByCategory(ledger, baseline)
  const totalContribution = categories.reduce(
    (sum, item) => sum + (item.revenue - item.directCost),
    0,
  )

  return categories
    .map((item) => {
      const contribution = item.revenue - item.directCost
      return {
        ...item,
        contribution,
        contributionMargin: item.revenue === 0 ? 0 : (contribution / item.revenue) * 100,
        contributionPerSession: item.sessions === 0 ? 0 : contribution / item.sessions,
        share: totalContribution === 0 ? 0 : (contribution / totalContribution) * 100,
      }
    })
    .sort((a, b) => b.contribution - a.contribution)
}

export function expensesByCategory(ledger: LedgerEntry[], baseline: Baseline) {
  const totals = new Map<string, number>()

  for (const entry of ledger) {
    if (entry.kind !== "despesa" || !isCurrentMonth(entry.date)) continue
    totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount)
  }

  if (baseline.expenses > 0) {
    totals.set("Outros", (totals.get("Outros") ?? 0) + baseline.expenses)
  }

  return [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
}
