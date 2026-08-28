import { ArrowUpRight, Clock, Flame, MessageCircle, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CLINIC_TODAY, clinicTodayLabel } from "@/lib/clinic"
import { cn, formatCurrency, formatDate, initials, parseLocalDate } from "@/lib/utils"
import { isActiveProposal, selectLeadsByStage, usePatientStore } from "@/stores/usePatientStore"
import { eventsOn, useScheduleStore, type EventStatus } from "@/stores/useScheduleStore"

const statusStyles: Record<EventStatus, { label: string; className: string }> = {
  confirmado: { label: "Confirmado", className: "bg-success/10 text-success border-success/20" },
  aguardando: { label: "Aguardando", className: "bg-warning/12 text-warning-foreground border-warning/25" },
  concluido: { label: "Concluído", className: "bg-muted text-muted-foreground border-border" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
}

const temperatureStyles = {
  quente: "bg-destructive/10 text-destructive border-destructive/20",
  morno: "bg-warning/12 text-warning-foreground border-warning/25",
  frio: "bg-muted text-muted-foreground border-border",
} as const

/** "hoje", "ontem" ou "há N dias", a partir da data de entrada do lead. */
function waitingLabel(createdAt: string) {
  const days = Math.round(
    (parseLocalDate(CLINIC_TODAY).getTime() - parseLocalDate(createdAt).getTime()) / 86_400_000,
  )
  if (days <= 0) return "hoje"
  if (days === 1) return "ontem"
  return `há ${days} dias`
}

export function TodayAgenda() {
  const leads = usePatientStore((state) => state.leads)
  const patients = usePatientStore((state) => state.patients)
  const events = useScheduleStore((state) => state.events)

  const newLeads = selectLeadsByStage(leads, "novos-contatos").filter(isActiveProposal)

  const todayAppointments = eventsOn(events, CLINIC_TODAY).filter(
    (event) => event.kind !== "bloqueio",
  )

  // Retornos ainda em aberto, do mais atrasado para o mais recente.
  const openReturns = patients
    .flatMap((patient) =>
      patient.returns
        .filter((item) => item.status === "pendente" || item.status === "atrasado")
        .map((item) => ({ ...item, patient })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card className="flex h-full flex-col border-border/70 shadow-[var(--shadow-soft)]">
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="font-display text-base">Hoje</CardTitle>
          <CardDescription className="mt-1">{clinicTodayLabel()}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="-mr-2 text-muted-foreground">
          <Link to="/agenda">
            Agenda <ArrowUpRight />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col px-3">
        <Tabs defaultValue="consultas" className="flex min-h-0 flex-1 flex-col gap-3">
          <TabsList className="mx-2 grid w-auto grid-cols-3 rounded-full bg-muted/60 p-1">
            <TabsTrigger value="consultas" className="rounded-full text-[12px] data-[state=active]:shadow-xs">
              Consultas
              <Badge variant="secondary" className="ml-1 h-4 rounded-full px-1.5 text-[10px]">
                {todayAppointments.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="retornos" className="rounded-full text-[12px] data-[state=active]:shadow-xs">
              Retornos
              <Badge variant="secondary" className="ml-1 h-4 rounded-full px-1.5 text-[10px]">
                {openReturns.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="leads" className="rounded-full text-[12px] data-[state=active]:shadow-xs">
              Leads
              <Badge variant="secondary" className="ml-1 h-4 rounded-full px-1.5 text-[10px]">
                {newLeads.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consultas" className="min-h-0 flex-1">
            <ScrollArea className="h-full max-h-[calc(100vh-14rem)] min-h-[320px]">
              <div className="flex flex-col gap-1 pr-3">
                {todayAppointments.map((item) => {
                  const status = statusStyles[item.status]
                  const duration = `${item.durationMin} min`
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/50",
                        item.status === "concluido" && "opacity-60",
                      )}
                    >
                      <div className="flex w-11 shrink-0 flex-col items-center pt-0.5">
                        <span className="text-[13px] font-semibold tabular-nums">{item.time}</span>
                        <span className="mt-0.5 text-[10px] text-muted-foreground">{duration}</span>
                      </div>

                      <div
                        className={cn(
                          "w-0.5 shrink-0 rounded-full",
                          item.kind === "retorno" ? "bg-success" : "bg-border",
                        )}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/pacientes/${item.patientId ?? ""}`}
                            className="truncate text-[13px] font-semibold hover:text-primary hover:underline"
                          >
                            {item.patientName ?? "Sem paciente"}
                          </Link>
                          <Badge variant="outline" className={cn("shrink-0 text-[10px]", status.className)}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/80">
                          {item.room && <span>{item.room}</span>}
                          {item.value !== undefined && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="font-medium tabular-nums">{formatCurrency(item.value)}</span>
                            </>
                          )}
                        </div>
                        {item.note && (
                          <p className="mt-1.5 rounded-lg bg-accent/60 px-2 py-1 text-[11px] text-accent-foreground">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="retornos" className="min-h-0 flex-1">
            <ScrollArea className="h-full max-h-[calc(100vh-14rem)] min-h-[320px]">
              <div className="flex flex-col gap-1 pr-3">
                {openReturns.length === 0 && (
                  <p className="px-2 py-10 text-center text-[12px] text-muted-foreground">
                    Nenhum retorno em aberto. Tudo em dia.
                  </p>
                )}

                {openReturns.map((item) => {
                  const late = item.status === "atrasado"
                  return (
                    <div key={item.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50">
                      <Avatar className="mt-0.5 size-9">
                        <AvatarFallback className="bg-secondary text-[11px] font-semibold text-secondary-foreground">
                          {initials(item.patient.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/pacientes/${item.patient.id}`}
                          className="truncate text-[13px] font-semibold hover:text-primary hover:underline"
                        >
                          {item.patient.name}
                        </Link>
                        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.reason}</p>
                        <span
                          className={cn(
                            "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            late
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/12 text-warning-foreground",
                          )}
                        >
                          <Clock className="size-3" />
                          {late ? "Atrasado" : "A agendar"} · {formatDate(item.date)}
                        </span>
                      </div>

                      <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground">
                        <MessageCircle />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="leads" className="min-h-0 flex-1">
            <ScrollArea className="h-full max-h-[calc(100vh-14rem)] min-h-[320px]">
import type { Lead } from "@/data/leads"

              <div className="flex flex-col gap-1 pr-3">
                {newLeads.map((item: Lead) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50">
                    <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent">
                      <Sparkles className="size-4 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[13px] font-semibold">{item.name}</p>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 text-[10px] capitalize", temperatureStyles[(item.temperature as keyof typeof temperatureStyles) || "morno"])}
                        >
                          {item.temperature === "quente" && <Flame className="size-3" />}
                          {item.temperature}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.interest}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground/80">
                        {item.source} · aguardando {waitingLabel(item.createdAt)} ·{" "}
                        <span className="font-medium tabular-nums">{formatCurrency(item.value)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
