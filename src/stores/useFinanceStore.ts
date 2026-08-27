import { create } from "zustand"

import { revenueSeries, type RevenuePoint } from "@/data/dashboard"
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
  /** Receitas lançadas a partir de um atendimento contam para o ticket médio. */
  countsAsAppointment?: boolean
  /** Produto e material consumidos nesta receita — base da margem de contribuição. */
  directCost?: number
}

/** Procedimento precificado na tela de Precificação Inteligente. */
export type CategoryTotal = {
  name: string
  revenue: number
  sessions: number
  /** Custo de produto e material consumido no período. */
  directCost: number
}

export type Baseline = {
  expenses: number
  /** Faturamento do mês já realizado, agrupado por procedimento. */
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
  /** Preço praticado, definido pela profissional (pode divergir do recomendado). */
  price: number
  createdAt: string
}

type FinanceState = {
  ledger: LedgerEntry[]
  /**
   * Parte do mês que não está lançada linha a linha no mock. As entradas do
   * ledger somam a esta base para formar os números do dashboard.
   */
  baseline: Baseline
  goal: number
  revenueSeries: RevenuePoint[]
  /** Indicadores operacionais que não vêm do caixa. */
  operational: { returnRate: number; occupancy: number; avgHoursPerDay: number }
  procedures: PricedProcedure[]

  registerRevenue: (input: {
    description: string
    category: string
    amount: number
    patientId?: string
    countsAsAppointment?: boolean
    directCost?: number
  }) => void
  registerExpense: (input: { description: string; category: string; amount: number }) => void
  addProcedure: (procedure: Omit<PricedProcedure, "id" | "createdAt">) => PricedProcedure
  removeProcedure: (id: string) => void
}

let sequence = 0
function nextId(prefix: string) {
  sequence += 1
  return `${prefix}-${sequence}`
}

const seedLedger: LedgerEntry[] = [
  {
    id: "e1",
    date: "2026-08-24",
    kind: "receita",
    description: "Toxina botulínica · terço superior",
    category: "Toxina botulínica",
    amount: 1800,
    directCost: 470,
    patientId: "p1",
    countsAsAppointment: true,
  },
  {
    id: "e2",
    date: "2026-08-24",
    kind: "receita",
    description: "Preenchimento labial · 1ml",
    category: "Preenchimento",
    amount: 2400,
    directCost: 700,
    patientId: "p3",
    countsAsAppointment: true,
  },
  {
    id: "e3",
    date: "2026-08-24",
    kind: "receita",
    description: "Bioestimulador · 1ª sessão",
    category: "Bioestimulador",
    amount: 3200,
    directCost: 950,
    patientId: "p4",
    countsAsAppointment: true,
  },
  {
    id: "e4",
    date: "2026-08-24",
    kind: "receita",
    description: "Skinbooster · face e pescoço",
    category: "Skinbooster",
    amount: 1600,
    directCost: 420,
    patientId: "p6",
    countsAsAppointment: true,
  },
  {
    id: "e5",
    date: "2026-08-24",
    kind: "receita",
    description: "Toxina botulínica · retoque",
    category: "Toxina botulínica",
    amount: 600,
    directCost: 60,
    patientId: "p9",
    countsAsAppointment: true,
  },
  { id: "e6", date: "2026-08-05", kind: "despesa", description: "Aluguel e condomínio", category: "Estrutura", amount: 5000 },
  { id: "e7", date: "2026-08-07", kind: "despesa", description: "Compra de produtos e insumos", category: "Produtos", amount: 22000 },
  { id: "e8", date: "2026-08-05", kind: "despesa", description: "Equipe · salários e comissões", category: "Equipe", amount: 8000 },
  { id: "e9", date: "2026-08-10", kind: "despesa", description: "Marketing e tráfego pago", category: "Marketing", amount: 2400 },
  { id: "e10", date: "2026-08-20", kind: "despesa", description: "Taxas de cartão", category: "Taxas", amount: 2530 },
  { id: "e11", date: "2026-08-02", kind: "despesa", description: "Software e sistemas", category: "Estrutura", amount: 890 },
  { id: "e12", date: "2026-08-15", kind: "despesa", description: "Contador e impostos", category: "Impostos", amount: 1810 },
]

export const useFinanceStore = create<FinanceState>((set) => ({
  ledger: seedLedger,
  baseline: {
    expenses: 0,
    revenueByCategory: [
      { name: "Bioestimulador", revenue: 23200, sessions: 8, directCost: 7000 },
      { name: "Preenchimento", revenue: 19700, sessions: 11, directCost: 5700 },
      { name: "Toxina botulínica", revenue: 17450, sessions: 16, directCost: 4300 },
      { name: "Skinbooster", revenue: 8200, sessions: 6, directCost: 1600 },
      { name: "Microagulhamento", revenue: 6200, sessions: 11, directCost: 800 },
    ],
  },
  goal: 80000,
  revenueSeries,
  operational: { returnRate: 68, occupancy: 82, avgHoursPerDay: 6.4 },
  procedures: [],

  registerRevenue: ({
    description,
    category,
    amount,
    patientId,
    countsAsAppointment = true,
    directCost = 0,
  }) =>
    set((state) => ({
      ledger: [
        {
          id: nextId("e"),
          date: CLINIC_TODAY,
          kind: "receita",
          description,
          category,
          amount,
          directCost,
          patientId,
          countsAsAppointment,
        },
        ...state.ledger,
      ],
    })),

  registerExpense: ({ description, category, amount }) =>
    set((state) => ({
      ledger: [
        { id: nextId("e"), date: CLINIC_TODAY, kind: "despesa", description, category, amount },
        ...state.ledger,
      ],
    })),

  addProcedure: (procedure) => {
    const created: PricedProcedure = { ...procedure, id: nextId("proc"), createdAt: CLINIC_TODAY }
    set((state) => ({ procedures: [created, ...state.procedures] }))
    return created
  },

  removeProcedure: (id) =>
    set((state) => ({ procedures: state.procedures.filter((item) => item.id !== id) })),
}))

/* ------------------------------------------------------------------ *
 * Seletores derivados
 *
 * Recebem as fatias cruas da store em vez do estado inteiro: assim o componente
 * seleciona referências estáveis e memoiza o cálculo, sem quebrar a igualdade
 * que o zustand usa para decidir re-renders.
 * ------------------------------------------------------------------ */

export type MonthSummary = {
  revenue: number
  expenses: number
  profit: number
  margin: number
  appointments: number
  ticket: number
  /** Produto e material CONSUMIDOS no mês — base da margem de contribuição. */
  directCost: number
  /** Despesas de compra de produto no mês (saída de caixa, não consumo). */
  productPurchases: number
  /** Despesas que não variam com o volume de atendimentos. */
  fixedCost: number
  /** Receita menos custo direto consumido. */
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

  // Consumo do estoque: é o que sai fisicamente ao atender, não o que se compra.
  const directCost =
    baseline.revenueByCategory.reduce((sum, item) => sum + item.directCost, 0) +
    monthEntries
      .filter((e) => e.kind === "receita")
      .reduce((sum, e) => sum + (e.directCost ?? 0), 0)

  // Custo fixo vem das despesas que não são compra de produto — nunca por
  // subtração do consumo, que pode divergir da compra dentro do mesmo mês.
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

/** Faturamento por procedimento no mês, do maior para o menor. */
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
  /** Receita menos custo direto: o que sobra para pagar os custos fixos. */
  contribution: number
  contributionMargin: number
  contributionPerSession: number
  /** Fatia da margem de contribuição total da clínica. */
  share: number
}

/** Lucratividade por procedimento, da maior contribuição em reais para a menor. */
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

/** Despesas do mês agrupadas por categoria, separando o que é custo direto de produto. */
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
