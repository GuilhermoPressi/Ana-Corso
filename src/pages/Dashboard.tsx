import { useMemo } from "react"
import { CalendarPlus, Download, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

import { AlertsCard } from "@/components/dashboard/AlertsCard"
import { GoalCard } from "@/components/dashboard/GoalCard"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { TodayAgenda } from "@/components/dashboard/TodayAgenda"
import { TopProcedures } from "@/components/dashboard/TopProcedures"
import { Button } from "@/components/ui/button"
import type { Metric } from "@/data/dashboard"
import { CLINIC_TODAY, clinicTodayLabel } from "@/lib/clinic"
import { selectNewPatientsThisMonth, usePatientStore } from "@/stores/usePatientStore"
import { summarizeMonth, useFinanceStore } from "@/stores/useFinanceStore"
import { eventsOn, useScheduleStore } from "@/stores/useScheduleStore"

export default function Dashboard() {
  const ledger = useFinanceStore((state) => state.ledger)
  const baseline = useFinanceStore((state) => state.baseline)
  const operational = useFinanceStore((state) => state.operational)
  const newPatients = usePatientStore(selectNewPatientsThisMonth)
  const patients = usePatientStore((state) => state.patients)
  const events = useScheduleStore((state) => state.events)

  const todayCount = eventsOn(events, CLINIC_TODAY).filter((event) => event.kind !== "bloqueio").length
  const openReturns = patients.reduce(
    (sum, patient) =>
      sum + patient.returns.filter((item) => item.status === "pendente" || item.status === "atrasado").length,
    0,
  )

  const summary = useMemo(() => summarizeMonth(ledger, baseline), [ledger, baseline])

  const metrics = useMemo<Metric[]>(
    () => [
      {
        id: "faturamento",
        label: "Faturamento",
        value: summary.revenue,
        format: "currency",
        delta: 12.4,
        deltaLabel: "vs. julho",
        hint: "Recebido + a receber no mês",
      },
      {
        id: "lucro",
        label: "Lucro líquido",
        value: summary.profit,
        format: "currency",
        delta: 8.1,
        deltaLabel: "vs. julho",
        hint: `Margem de ${summary.margin.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}% no período`,
      },
      {
        id: "ticket",
        label: "Ticket médio",
        value: summary.ticket,
        format: "currency",
        delta: 4.6,
        deltaLabel: "vs. julho",
        hint: `${summary.appointments} atendimentos realizados`,
      },
      {
        id: "novas",
        label: "Novas pacientes",
        value: newPatients,
        format: "number",
        delta: -6.2,
        deltaLabel: "vs. julho",
        hint: "Fichas abertas neste mês",
      },
      {
        id: "retorno",
        label: "Taxa de retorno",
        value: operational.returnRate,
        format: "percent",
        delta: 5.3,
        deltaLabel: "vs. julho",
        hint: "Pacientes que remarcaram em 90 dias",
      },
      {
        id: "ocupacao",
        label: "Ocupação da agenda",
        value: operational.occupancy,
        format: "percent",
        delta: 2.8,
        deltaLabel: "vs. julho",
        hint: `Média de ${operational.avgHoursPerDay.toLocaleString("pt-BR")} horas por dia`,
      },
    ],
    [summary, newPatients, operational],
  )

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      {/* Saudação */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-primary">{clinicTodayLabel()}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            Bom dia, Dra. Ana <span className="inline-block">👋</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Você tem {todayCount} atendimentos hoje e {openReturns} retornos aguardando contato.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Download /> Exportar relatório
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/planejamento-facial">
              <Sparkles /> Novo planejamento
            </Link>
          </Button>
          <Button size="sm" asChild className="rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]">
            <Link to="/agenda">
              <CalendarPlus /> Agendar
            </Link>
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Gráfico + Agenda do dia */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)]">
        <div className="flex flex-col gap-5">
          <RevenueChart />
          <GoalCard />
        </div>
        <TodayAgenda />
      </div>

      {/* Alertas + Procedimentos */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <AlertsCard />
        <TopProcedures />
      </div>
    </div>
  )
}
