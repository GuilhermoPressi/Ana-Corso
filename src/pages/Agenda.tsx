import { useEffect, useMemo, useState } from "react"
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react"
import { Link } from "react-router-dom"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CLINIC_MONTH, CLINIC_TODAY, monthMatrix } from "@/lib/clinic"
import { cn, formatCurrency, formatDateLong } from "@/lib/utils"
import {
  eventKindLabel,
  eventsInMonth,
  eventsOn,
  occupiedHours,
  useScheduleStore,
  type EventKind,
  type ScheduleEvent,
} from "@/stores/useScheduleStore"

const kindStyles: Record<EventKind, { dot: string; chip: string; rail: string }> = {
  atendimento: {
    dot: "bg-[var(--chart-1)]",
    chip: "border-primary/20 bg-primary/10 text-primary",
    rail: "bg-[var(--chart-1)]",
  },
  retorno: {
    dot: "bg-success",
    chip: "border-success/25 bg-success/10 text-success",
    rail: "bg-success",
  },
  avaliacao: {
    dot: "bg-[var(--chart-3)]",
    chip: "border-[hsl(268_52%_70%)]/30 bg-[hsl(268_52%_70%)]/12 text-[hsl(268_45%_50%)]",
    rail: "bg-[var(--chart-3)]",
  },
  "contato-comercial": {
    dot: "bg-[var(--chart-4)]",
    chip: "border-[hsl(20_82%_74%)]/35 bg-[hsl(20_82%_74%)]/15 text-[hsl(20_60%_45%)]",
    rail: "bg-[var(--chart-4)]",
  },
  bloqueio: {
    dot: "bg-muted-foreground/50",
    chip: "border-border bg-muted text-muted-foreground",
    rail: "bg-muted-foreground/40",
  },
}

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function shiftMonth(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split("-").map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number)
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  )
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function Agenda() {
  const events = useScheduleStore((state) => state.events)
  const fetchEvents = useScheduleStore((state) => state.fetchEvents)
  const [viewMonth, setViewMonth] = useState(CLINIC_MONTH)
  const [selectedDay, setSelectedDay] = useState(CLINIC_TODAY)

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const { days, leadingBlanks } = useMemo(() => monthMatrix(`${viewMonth}-01`), [viewMonth])
  const monthEvents = useMemo(() => eventsInMonth(events, viewMonth), [events, viewMonth])
  const dayEvents = useMemo(() => eventsOn(events, selectedDay), [events, selectedDay])

  const stats = useMemo(() => {
    const attendances = monthEvents.filter((event) => event.kind === "atendimento")
    const autoEvents = events.filter((event) => event.auto)
    const hoursToday = occupiedHours(events, CLINIC_TODAY)

    return {
      attendances: attendances.length,
      revenue: attendances.reduce((sum, event) => sum + (event.value ?? 0), 0),
      autoCount: autoEvents.length,
      hoursToday,
      occupancy: Math.min((hoursToday / 8) * 100, 100),
    }
  }, [monthEvents, events])

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Agenda Inteligente"
        description="Calendário da clínica com os retornos que o sistema agenda sozinho."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Atendimentos no mês"
          value={String(stats.attendances)}
          hint={`${formatCurrency(stats.revenue)} agendados`}
        />
        <StatCard
          icon={Clock}
          label="Horas ocupadas hoje"
          value={stats.hoursToday.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          hint="Somando duração dos eventos"
        />
        <StatCard
          icon={TrendingUp}
          label="Ocupação de hoje"
          value={`${Math.round(stats.occupancy)}%`}
          hint="Sobre uma jornada de 8 horas"
        />
        <StatCard
          icon={Sparkles}
          label="Agendados pela automação"
          value={String(stats.autoCount)}
          hint="Retornos criados a partir de procedimentos, em qualquer mês"
          highlight
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        {/* Calendário */}
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="font-display text-base">{monthLabel(viewMonth)}</CardTitle>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Mês anterior"
                onClick={() => setViewMonth((current) => shiftMonth(current, -1))}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewMonth(CLINIC_MONTH)
                  setSelectedDay(CLINIC_TODAY)
                }}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Próximo mês"
                onClick={() => setViewMonth((current) => shiftMonth(current, 1))}
              >
                <ChevronRight />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-7 gap-1.5">
              {weekdays.map((weekday) => (
                <div
                  key={weekday}
                  className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {weekday}
                </div>
              ))}

              {Array.from({ length: leadingBlanks }).map((_, index) => (
                <div key={`blank-${index}`} />
              ))}

              {days.map(({ iso, day }) => {
                const dayItems = eventsOn(events, iso)
                const isToday = iso === CLINIC_TODAY
                const isSelected = iso === selectedDay

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDay(iso)}
                    className={cn(
                      "flex min-h-[74px] flex-col rounded-xl border p-1.5 text-left transition-colors",
                      isSelected
                        ? "border-primary/40 bg-primary/[0.06]"
                        : "border-border/60 hover:border-primary/25 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isSelected
                            ? "text-primary"
                            : "text-foreground/70",
                      )}
                    >
                      {day}
                    </span>

                    <div className="mt-1 flex flex-col gap-1">
                      {dayItems.slice(0, 2).map((event) => (
                        <span
                          key={event.id}
                          className="flex items-center gap-1 truncate text-[10px] text-muted-foreground"
                        >
                          <span
                            className={cn("size-1.5 shrink-0 rounded-full", kindStyles[event.kind].dot)}
                          />
                          <span className="truncate">{event.time}</span>
                        </span>
                      ))}
                      {dayItems.length > 2 && (
                        <span className="text-[10px] font-medium text-primary">
                          +{dayItems.length - 2}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3.5">
              {(Object.keys(kindStyles) as EventKind[]).map((kind) => (
                <span key={kind} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn("size-2 rounded-full", kindStyles[kind].dot)} />
                  {eventKindLabel[kind]}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dia selecionado */}
        <Card className="flex h-full flex-col border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-base">
              {selectedDay === CLINIC_TODAY ? "Hoje" : formatDateLong(selectedDay)}
            </CardTitle>
            <CardDescription className="mt-1">
              {dayEvents.length === 0
                ? "Nenhum compromisso neste dia"
                : `${dayEvents.length} ${dayEvents.length === 1 ? "compromisso" : "compromissos"} · ${occupiedHours(
                    events,
                    selectedDay,
                  ).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h ocupadas`}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-2.5">
            {dayEvents.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
                <div className="grid size-11 place-items-center rounded-2xl bg-accent">
                  <CalendarClock className="size-5 text-primary" />
                </div>
                <p className="mt-3.5 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                  Dia livre. Uma boa janela para encaixar quem está na lista de espera.
                </p>
              </div>
            ) : (
              dayEvents.map((event) => <EventRow key={event.id} event={event} />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EventRow({ event }: { event: ScheduleEvent }) {
  const style = kindStyles[event.kind]

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/40",
        event.status === "concluido" && "opacity-60",
      )}
    >
      <div className="flex w-11 shrink-0 flex-col items-center pt-0.5">
        <span className="text-[13px] font-semibold tabular-nums">{event.time}</span>
        <span className="mt-0.5 text-[10px] text-muted-foreground">{event.durationMin} min</span>
      </div>

      <div className={cn("w-0.5 shrink-0 rounded-full", style.rail)} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[13px] font-semibold leading-snug">{event.title}</p>
          <Badge variant="outline" className={cn("shrink-0 text-[10px]", style.chip)}>
            {eventKindLabel[event.kind]}
          </Badge>
        </div>

        {event.patientName && (
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {event.patientId ? (
              <Link to={`/pacientes/${event.patientId}`} className="hover:text-primary hover:underline">
                {event.patientName}
              </Link>
            ) : (
              event.patientName
            )}
          </p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/80">
          {event.professional && <span>{event.professional}</span>}
          {event.room && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span>{event.room}</span>
            </>
          )}
          {event.value !== undefined && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-medium tabular-nums">{formatCurrency(event.value)}</span>
            </>
          )}
        </div>

        {event.auto && (
          <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-accent/60 px-2 py-1 text-[11px] text-accent-foreground">
            <Sparkles className="mt-0.5 size-3 shrink-0" />
            {event.note ?? "Agendado automaticamente pelo pós-procedimento."}
          </p>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: typeof Users
  label: string
  value: string
  hint: string
  highlight?: boolean
}) {
  return (
    <Card
      className={cn(
        "gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]",
        highlight && "border-primary/20 bg-gradient-to-br from-accent/60 via-card to-card",
      )}
    >
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-3.5", highlight ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        </div>
        <p
          className={cn(
            "mt-1.5 font-display text-2xl font-semibold tabular-nums",
            highlight && "text-primary",
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
