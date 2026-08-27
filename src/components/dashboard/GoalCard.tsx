import { useMemo } from "react"
import { Target } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { summarizeMonth, useFinanceStore } from "@/stores/useFinanceStore"

const DAYS_LEFT = 7

export function GoalCard() {
  const ledger = useFinanceStore((state) => state.ledger)
  const baseline = useFinanceStore((state) => state.baseline)
  const target = useFinanceStore((state) => state.goal)

  const current = useMemo(() => summarizeMonth(ledger, baseline).revenue, [ledger, baseline])

  const progress = Math.min((current / target) * 100, 145)
  const achieved = current >= target
  const circumference = 2 * Math.PI * 42

  return (
    <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-accent/70 via-card to-card shadow-[var(--shadow-soft)]">
      <CardContent className="flex items-center gap-5 px-5 py-5">
        <div className="relative grid size-[104px] shrink-0 place-items-center">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--muted)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (Math.min(progress, 100) / 100) * circumference}
              className="transition-[stroke-dashoffset] duration-1000"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-display text-xl font-semibold tabular-nums">{Math.round(progress)}%</span>
            <span className="text-[10px] text-muted-foreground">da meta</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-primary">
            <Target className="size-3.5" />
            <p className="text-[11px] font-semibold uppercase tracking-wide">Meta de agosto</p>
          </div>

          <p className="mt-2 font-display text-[22px] font-semibold leading-none tabular-nums">
            {formatCurrency(current)}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            de {formatCurrency(target)} · faltam {DAYS_LEFT} dias
          </p>

          <p className="mt-3 text-[12px] font-medium leading-relaxed text-foreground/80">
            {achieved
              ? `Meta batida. Você já superou em ${formatCurrency(current - target)}.`
              : `Faltam ${formatCurrency(target - current)} para bater a meta.`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
