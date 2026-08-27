import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowDownRight, ArrowUpRight, Lightbulb, Wallet } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { clinicTodayLabel, isCurrentMonth } from "@/lib/clinic"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  expensesByCategory,
  profitabilityByCategory,
  summarizeMonth,
  useFinanceStore,
  type ProfitabilityRow,
} from "@/stores/useFinanceStore"

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const percent = (value: number) =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

export default function Financeiro() {
  const ledger = useFinanceStore((state) => state.ledger)
  const baseline = useFinanceStore((state) => state.baseline)
  const [mode, setMode] = useState<"reais" | "percentual">("reais")

  const summary = useMemo(() => summarizeMonth(ledger, baseline), [ledger, baseline])
  const profitability = useMemo(() => profitabilityByCategory(ledger, baseline), [ledger, baseline])
  const expenses = useMemo(() => expensesByCategory(ledger, baseline), [ledger, baseline])

  const monthEntries = useMemo(
    () => ledger.filter((entry) => isCurrentMonth(entry.date)),
    [ledger],
  )

  // Quem mais coloca dinheiro no bolso nem sempre é quem tem a maior margem percentual.
  const topByContribution = profitability[0]
  const topByMargin = useMemo(
    () => [...profitability].sort((a, b) => b.contributionMargin - a.contributionMargin)[0],
    [profitability],
  )

  const chartData = profitability.map((row) => ({
    name: row.name,
    valor: mode === "reais" ? Math.round(row.contribution) : Number(row.contributionMargin.toFixed(1)),
    row,
  }))

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Financeiro"
        description={`Fechamento de agosto · atualizado em ${clinicTodayLabel().toLowerCase()}`}
      />

      {/* Visão geral */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Entradas"
          value={formatCurrency(summary.revenue)}
          hint={`${summary.appointments} atendimentos no mês`}
          tone="success"
        />
        <SummaryCard
          label="Custos"
          value={formatCurrency(summary.expenses)}
          hint={`${formatCurrency(summary.productPurchases)} em produtos · ${formatCurrency(summary.fixedCost)} fixos`}
          tone="destructive"
        />
        <SummaryCard
          label="Lucro estimado"
          value={formatCurrency(summary.profit)}
          hint={`Margem líquida de ${percent(summary.margin)}`}
          tone="primary"
        />
        <SummaryCard
          label="Margem de contribuição"
          value={formatCurrency(summary.contribution)}
          hint={`Receita menos ${formatCurrency(summary.directCost)} de produto consumido`}
          tone="neutral"
        />
      </div>

      {/* Lucratividade por procedimento */}
      <Card className="mb-5 border-border/70 shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-base">Lucratividade por procedimento</CardTitle>
            <CardDescription className="mt-1">
              Receita menos produto e material. É o que sobra de cada procedimento antes dos custos fixos.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
            {(
              [
                { id: "reais", label: "Em reais" },
                { id: "percentual", label: "Em %" },
              ] as const
            ).map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant="ghost"
                onClick={() => setMode(option.id)}
                className={cn(
                  "h-7 rounded-full px-3 text-[12px] font-medium text-muted-foreground hover:bg-transparent",
                  mode === option.id && "bg-card text-foreground shadow-xs hover:bg-card",
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(value: number) =>
                    mode === "reais" ? `${Math.round(value / 1000)}k` : `${value}%`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={128}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0].payload.row as ProfitabilityRow
                    return (
                      <div className="rounded-xl border border-border/70 bg-popover/95 px-3 py-2.5 shadow-[var(--shadow-soft)] backdrop-blur-md">
                        <p className="text-[12px] font-semibold">{row.name}</p>
                        <div className="mt-1.5 flex flex-col gap-1 text-[11px]">
                          <Line label="Receita" value={formatCurrency(row.revenue)} />
                          <Line label="Custo direto" value={`− ${formatCurrency(row.directCost)}`} />
                          <Line label="Sobra" value={formatCurrency(row.contribution)} strong />
                          <Line label="Margem" value={percent(row.contributionMargin)} />
                          <Line label="Por sessão" value={formatCurrency(row.contributionPerSession)} />
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={30}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {topByContribution && topByMargin && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3.5">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-[12px] leading-relaxed text-foreground/80">
                {topByContribution.name === topByMargin.name ? (
                  <>
                    <span className="font-semibold">{topByContribution.name}</span> lidera nos dois critérios:
                    é o que mais deixa dinheiro no caixa ({formatCurrency(topByContribution.contribution)}) e
                    também o de maior margem ({percent(topByContribution.contributionMargin)}).
                  </>
                ) : (
                  <>
                    Quem mais coloca dinheiro no seu bolso é{" "}
                    <span className="font-semibold">{topByContribution.name}</span>, com{" "}
                    {formatCurrency(topByContribution.contribution)} de sobra em{" "}
                    {topByContribution.sessions} sessões. Já{" "}
                    <span className="font-semibold">{topByMargin.name}</span> tem a maior margem
                    percentual ({percent(topByMargin.contributionMargin)}), mas contribui com apenas{" "}
                    {formatCurrency(topByMargin.contribution)} — margem alta em volume baixo rende pouco.
                  </>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhamento */}
      <Tabs defaultValue="procedimentos">
        <TabsList className="mb-4 h-auto w-fit gap-1 rounded-full bg-muted/60 p-1">
          <TabsTrigger value="procedimentos" className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs">
            Por procedimento
          </TabsTrigger>
          <TabsTrigger value="custos" className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs">
            Composição dos custos
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs">
            Lançamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="procedimentos">
          <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[180px] pl-5">Procedimento</TableHead>
                    <TableHead className="text-right">Sessões</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Custo direto</TableHead>
                    <TableHead className="text-right">Sobra</TableHead>
                    <TableHead className="text-right">Por sessão</TableHead>
                    <TableHead className="pr-5 text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitability.map((row, index) => (
                    <TableRow key={row.name} className="border-border/60">
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: chartColors[index % chartColors.length] }}
                          />
                          <div>
                            <p className="text-[13px] font-medium">{row.name}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {percent(row.share)} da sobra total
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-[13px] tabular-nums">{row.sessions}</TableCell>
                      <TableCell className="text-right text-[13px] tabular-nums">
                        {formatCurrency(row.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-[13px] tabular-nums text-muted-foreground">
                        − {formatCurrency(row.directCost)}
                      </TableCell>
                      <TableCell className="text-right text-[13px] font-semibold tabular-nums">
                        {formatCurrency(row.contribution)}
                      </TableCell>
                      <TableCell className="text-right text-[13px] tabular-nums">
                        {formatCurrency(row.contributionPerSession)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] tabular-nums",
                            row.contributionMargin >= 70
                              ? "border-success/25 bg-success/10 text-success"
                              : "border-warning/30 bg-warning/12 text-warning-foreground",
                          )}
                        >
                          {percent(row.contributionMargin)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="custos">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card className="border-border/70 shadow-[var(--shadow-soft)]">
              <CardHeader>
                <CardTitle className="font-display text-base">Para onde vai o dinheiro</CardTitle>
                <CardDescription className="mt-1">
                  {formatCurrency(summary.expenses)} em custos no mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenses}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={92}
                        paddingAngle={2}
                        stroke="var(--card)"
                        strokeWidth={2}
                      >
                        {expenses.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const item = payload[0].payload as { name: string; amount: number }
                          return (
                            <div className="rounded-xl border border-border/70 bg-popover/95 px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur-md">
                              <p className="text-[12px] font-semibold">{item.name}</p>
                              <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
                                {formatCurrency(item.amount)} ·{" "}
                                {percent((item.amount / summary.expenses) * 100)}
                              </p>
                            </div>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-[var(--shadow-soft)]">
              <CardHeader>
                <CardTitle className="font-display text-base">Custos por categoria</CardTitle>
                <CardDescription className="mt-1">
                  Produtos são custo direto; o resto é fixo e precisa ser coberto pela margem de contribuição.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3.5">
                {expenses.map((item, index) => (
                  <div key={item.name}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: chartColors[index % chartColors.length] }}
                        />
                        <p className="text-[13px] font-medium">{item.name}</p>
                        {item.name === "Produtos" && (
                          <Badge variant="secondary" className="rounded-full text-[10px]">
                            direto
                          </Badge>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold tabular-nums">{formatCurrency(item.amount)}</p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(item.amount / summary.expenses) * 100}%`,
                          background: chartColors[index % chartColors.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lancamentos">
          <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Data</TableHead>
                    <TableHead className="min-w-[240px]">Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="pr-5 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-border/60">
                      <TableCell className="pl-5 text-[13px] tabular-nums">{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "grid size-6 shrink-0 place-items-center rounded-lg",
                              entry.kind === "receita"
                                ? "bg-success/12 text-success"
                                : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {entry.kind === "receita" ? (
                              <ArrowUpRight className="size-3" />
                            ) : (
                              <ArrowDownRight className="size-3" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px]">{entry.description}</p>
                            {entry.directCost ? (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                custo direto {formatCurrency(entry.directCost)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {entry.category}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "pr-5 text-right text-[13px] font-semibold tabular-nums",
                          entry.kind === "receita" ? "text-success" : "text-foreground",
                        )}
                      >
                        {entry.kind === "receita" ? "+" : "−"} {formatCurrency(entry.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/25 px-5 py-3 text-[12px] text-muted-foreground">
              <span>
                {monthEntries.length} lançamentos itemizados · o restante do mês entra pela base consolidada
              </span>
              <span className="tabular-nums">Saldo do mês: {formatCurrency(summary.profit)}</span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", strong ? "font-semibold" : "font-medium")}>{value}</span>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: "success" | "destructive" | "primary" | "neutral"
}) {
  const toneClass = {
    success: "text-success",
    destructive: "text-destructive",
    primary: "text-primary",
    neutral: "text-foreground",
  }[tone]

  return (
    <Card
      className={cn(
        "gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]",
        tone === "primary" && "border-primary/20 bg-gradient-to-br from-accent/60 via-card to-card",
      )}
    >
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Wallet className="size-3.5 text-muted-foreground" />
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        </div>
        <p className={cn("mt-1.5 font-display text-2xl font-semibold tabular-nums", toneClass)}>{value}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
