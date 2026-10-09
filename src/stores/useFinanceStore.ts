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
  /** "manual" pode ser editado/excluído; "procedimento" vem do registro de procedimento. */
  source?: "manual" | "procedimento" | "ajuste"
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
    occurredAt?: string
    patientId?: string
    countsAsAppointment?: boolean
    directCost?: number
  }) => Promise<{ success: boolean; error?: string }>
  registerExpense: (input: {
    description: string
    category: string
    amount: number
    occurredAt?: string
  }) => Promise<{ success: boolean; error?: string }>
  updateEntry: (
    id: string,
    input: { description: string; category: string; amount: number; occurredAt: string },
  ) => Promise<{ success: boolean; error?: string }>
  deleteEntry: (id: string) => Promise<{ success: boolean; error?: string }>
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
    source: dbL.source === "PROCEDURE" ? "procedimento" : dbL.source === "ADJUSTMENT" ? "ajuste" : "manual",
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
    occurredAt,
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
          occurredAt,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg =
          res.status === 403
            ? "Você não possui permissão para criar lançamentos."
            : data?.error?.message || "Falha ao salvar lançamento financeiro."
        set({ loading: false, error: errorMsg })
        return { success: false, error: errorMsg }
      }

      await get().fetchEntries()
      set({ loading: false })
      return { success: true }
    } catch (err: any) {
      const errorMsg = err?.message || "Erro de conexão ao salvar receita."
      set({ loading: false, error: errorMsg })
      return { success: false, error: errorMsg }
    }
  },

  registerExpense: async ({ description, category, amount, occurredAt }) => {
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
          occurredAt,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg =
          res.status === 403
            ? "Você não possui permissão para criar lançamentos."
            : data?.error?.message || "Falha ao salvar lançamento financeiro."
        set({ loading: false, error: errorMsg })
        return { success: false, error: errorMsg }
      }

      await get().fetchEntries()
      set({ loading: false })
      return { success: true }
    } catch (err: any) {
      const errorMsg = err?.message || "Erro de conexão ao salvar despesa."
      set({ loading: false, error: errorMsg })
      return { success: false, error: errorMsg }
    }
  },

  updateEntry: async (id, input) => {
    try {
      const res = await fetch(`/api/finance/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg =
          res.status === 403
            ? "Você não possui permissão para editar lançamentos."
            : data?.error?.message || "Falha ao atualizar o lançamento."
        return { success: false, error: errorMsg }
      }
      await get().fetchEntries()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || "Erro de conexão ao atualizar o lançamento." }
    }
  },

  deleteEntry: async (id) => {
    try {
      const res = await fetch(`/api/finance/entries/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg =
          res.status === 403
            ? "Você não possui permissão para excluir lançamentos."
            : data?.error?.message || "Falha ao excluir o lançamento."
        return { success: false, error: errorMsg }
      }
      set((state) => ({ ledger: state.ledger.filter((entry) => entry.id !== id) }))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || "Erro de conexão ao excluir o lançamento." }
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

/** Mês "YYYY-MM" informado, ou o mês corrente da clínica quando omitido. */
function inMonth(date: string, month?: string) {
  return month ? date.startsWith(month) : isCurrentMonth(date)
}

export function summarizeMonth(ledger: LedgerEntry[], baseline: Baseline, month?: string): MonthSummary {
  const monthEntries = ledger.filter((entry) => inMonth(entry.date, month))

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

export function revenueByCategory(ledger: LedgerEntry[], baseline: Baseline, month?: string): CategoryTotal[] {
  const totals = new Map<string, Omit<CategoryTotal, "name">>()

  for (const item of baseline.revenueByCategory) {
    totals.set(item.name, {
      revenue: item.revenue,
      sessions: item.sessions,
      directCost: item.directCost,
    })
  }

  for (const entry of ledger) {
    if (entry.kind !== "receita" || !inMonth(entry.date, month)) continue
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
  month?: string,
): ProfitabilityRow[] {
  const categories = revenueByCategory(ledger, baseline, month)
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

export function expensesByCategory(ledger: LedgerEntry[], baseline: Baseline, month?: string) {
  const totals = new Map<string, number>()

  for (const entry of ledger) {
    if (entry.kind !== "despesa" || !inMonth(entry.date, month)) continue
    totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount)
  }

  if (baseline.expenses > 0) {
    totals.set("Outros", (totals.get("Outros") ?? 0) + baseline.expenses)
  }

  return [...totals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
}
