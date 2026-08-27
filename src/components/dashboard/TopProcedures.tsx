import { useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { revenueByCategory, useFinanceStore } from "@/stores/useFinanceStore"

const barColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function TopProcedures() {
  const ledger = useFinanceStore((state) => state.ledger)
  const baseline = useFinanceStore((state) => state.baseline)

  const topProcedures = useMemo(() => revenueByCategory(ledger, baseline), [ledger, baseline])

  const max = Math.max(...topProcedures.map((p) => p.revenue), 1)
  const total = topProcedures.reduce((sum, p) => sum + p.revenue, 0)

  return (
    <Card className="border-border/70 shadow-[var(--shadow-soft)]">
      <CardHeader>
        <CardTitle className="font-display text-base">Procedimentos que mais faturam</CardTitle>
        <CardDescription className="mt-1">Agosto · {formatCurrency(total)} no total</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {topProcedures.map((procedure, index) => (
          <div key={procedure.name}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-medium">{procedure.name}</p>
              <p className="text-[13px] font-semibold tabular-nums">{formatCurrency(procedure.revenue)}</p>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{
                    width: `${(procedure.revenue / max) * 100}%`,
                    background: barColors[index % barColors.length],
                  }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-[11px] text-muted-foreground">
                {procedure.sessions} sessões
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
