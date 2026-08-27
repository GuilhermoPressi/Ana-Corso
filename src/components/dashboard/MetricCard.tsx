import { TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { Metric } from "@/data/dashboard"
import { cn, formatCurrency } from "@/lib/utils"

function formatValue(metric: Metric) {
  if (metric.format === "currency") return formatCurrency(metric.value)
  if (metric.format === "percent") return `${metric.value}%`
  return new Intl.NumberFormat("pt-BR").format(metric.value)
}

export function MetricCard({ metric }: { metric: Metric }) {
  const positive = metric.delta >= 0
  const Trend = positive ? TrendingUp : TrendingDown

  return (
    <Card className="group relative gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[0_2px_4px_hsl(335_30%_40%/0.05),0_16px_36px_-18px_hsl(335_45%_45%/0.28)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-[radial-gradient(50%_100%_at_50%_100%,hsl(335_78%_65%/0.14),transparent)] opacity-0 transition-opacity group-hover:opacity-100"
      />
      <CardContent className="px-5 py-4">
        <p className="truncate text-[12px] font-medium text-muted-foreground">{metric.label}</p>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="font-display text-[26px] font-semibold leading-none tracking-tight tabular-nums">
            {formatValue(metric)}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            <Trend className="size-3" />
            {positive ? "+" : ""}
            {metric.delta.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </span>
        </div>

        <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {metric.hint} · <span className="text-muted-foreground/70">{metric.deltaLabel}</span>
        </p>
      </CardContent>
    </Card>
  )
}
