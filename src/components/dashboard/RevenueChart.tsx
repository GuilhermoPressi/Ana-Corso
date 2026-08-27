import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import { summarizeMonth, useFinanceStore } from "@/stores/useFinanceStore"

const ranges = [
  { id: "6m", label: "6 meses", months: 6 },
  { id: "12m", label: "12 meses", months: 12 },
] as const

type TooltipEntry = { name?: string; value?: number; color?: string; dataKey?: string }

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const labels: Record<string, string> = {
    faturamento: "Faturamento",
    lucro: "Lucro líquido",
    meta: "Meta",
  }

  return (
    <div className="rounded-xl border border-border/70 bg-popover/95 px-3 py-2.5 shadow-[var(--shadow-soft)] backdrop-blur-md">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-[12px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: entry.color }} />
              {labels[entry.dataKey ?? ""] ?? entry.name}
            </span>
            <span className="font-semibold tabular-nums">{formatCurrency(entry.value ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RevenueChart() {
  const [range, setRange] = useState<(typeof ranges)[number]["id"]>("12m")
  const months = ranges.find((r) => r.id === range)?.months ?? 12

  const series = useFinanceStore((state) => state.revenueSeries)
  const ledger = useFinanceStore((state) => state.ledger)
  const baseline = useFinanceStore((state) => state.baseline)

  // O último ponto é o mês corrente: ele acompanha o que está lançado no caixa.
  const data = useMemo(() => {
    const summary = summarizeMonth(ledger, baseline)
    const full = series.map((point, index) =>
      index === series.length - 1
        ? { ...point, faturamento: summary.revenue, lucro: summary.profit }
        : point,
    )
    return full.slice(-months)
  }, [series, ledger, baseline, months])

  const total = data.reduce((sum, point) => sum + point.faturamento, 0)
  const totalProfit = data.reduce((sum, point) => sum + point.lucro, 0)

  return (
    <Card className="border-border/70 shadow-[var(--shadow-soft)]">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="font-display text-base">Faturamento</CardTitle>
          <CardDescription className="mt-1">
            {formatCurrency(total)} no período · {formatCurrency(totalProfit)} de lucro
          </CardDescription>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
          {ranges.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant="ghost"
              onClick={() => setRange(item.id)}
              className={cn(
                "h-7 rounded-full px-3 text-[12px] font-medium text-muted-foreground hover:bg-transparent",
                range === item.id && "bg-card text-foreground shadow-xs hover:bg-card",
              )}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pl-0">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="fillFaturamento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />

              <Area
                type="monotone"
                dataKey="faturamento"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                fill="url(#fillFaturamento)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
              <Area
                type="monotone"
                dataKey="lucro"
                stroke="var(--chart-3)"
                strokeWidth={2}
                fill="url(#fillLucro)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
              <Line
                type="monotone"
                dataKey="meta"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                opacity={0.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-4 pl-6 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-[var(--chart-1)]" /> Faturamento
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-[var(--chart-3)]" /> Lucro líquido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full border-t border-dashed border-muted-foreground" /> Meta
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
