import { useMemo } from "react"
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd"
import {
  Flame,
  GripVertical,
  MessageCircle,
  MoreHorizontal,
  CalendarClock,
  Snowflake,
  TrendingUp,
  UserRoundCheck,
  Wallet,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { NewLeadDialog } from "@/components/crm/NewLeadDialog"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { leadStages, type Lead, type LeadStage } from "@/data/leads"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { buildWhatsAppLink, contextualMessage, firstNameOf } from "@/lib/whatsapp"
import {
  isActiveProposal,
  selectOpenProposals,
  selectScheduledLeads,
  usePatientStore,
} from "@/stores/usePatientStore"

const stageAccent: Record<LeadStage, string> = {
  "novos-contatos": "bg-[var(--chart-2)]",
  "avaliacao-agendada": "bg-[var(--chart-3)]",
  "proposta-enviada": "bg-[var(--chart-1)]",
  fechado: "bg-success",
  perdido: "bg-muted-foreground/50",
}

const temperatureStyles = {
  quente: "border-destructive/20 bg-destructive/10 text-destructive",
  morno: "border-warning/25 bg-warning/12 text-warning-foreground",
  frio: "border-border bg-muted text-muted-foreground",
} as const

export default function Crm() {
  const leads = usePatientStore((state) => state.leads)
  const moveLead = usePatientStore((state) => state.moveLead)
  const convertLead = usePatientStore((state) => state.convertLead)
  const removeLead = usePatientStore((state) => state.removeLead)
  const navigate = useNavigate()

  const openTotal = useMemo(() => selectOpenProposals(leads), [leads])

  const summary = useMemo(() => {
    const won = leads.filter((lead) => lead.stage === "fechado")
    const lost = leads.filter((lead) => lead.stage === "perdido")
    const decided = won.length + lost.length
    const open = leads.filter(isActiveProposal)
    const scheduled = selectScheduledLeads(leads)

    return {
      openCount: open.length,
      scheduledCount: scheduled.length,
      wonValue: won.reduce((sum, lead) => sum + lead.value, 0),
      conversion: decided === 0 ? 0 : (won.length / decided) * 100,
      averageTicket: open.length === 0 ? 0 : openTotal / open.length,
    }
  }, [leads, openTotal])

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const target = destination.droppableId as LeadStage
    moveLead(draggableId, target, destination.index)

    if (target === "fechado" && source.droppableId !== "fechado") {
      const lead = leads.find((item) => item.id === draggableId)
      if (lead) {
        toast.success(`${lead.name} foi para Fechado`, {
          description: `${formatCurrency(lead.value)} saem do funil aberto.`,
          action: {
            label: "Criar ficha",
            onClick: () => {
              const patientId = convertLead(draggableId)
              if (patientId) navigate(`/pacientes/${patientId}`)
            },
          },
        })
      }
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="CRM de Pacientes e Leads"
        description="Do primeiro contato ao fechamento, com o valor de cada proposta sempre à vista."
        actions={
          <>
            <Button variant="outline" size="sm">
              <MessageCircle /> Disparo para o funil
            </Button>
            <NewLeadDialog />
          </>
        }
      />

      {/* Resumo do funil */}
      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <Card className="gap-0 overflow-hidden border-primary/15 bg-gradient-to-br from-accent/70 via-card to-card py-0 shadow-[var(--shadow-soft)]">
          <CardContent className="flex items-center gap-4 px-5 py-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <Wallet className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-muted-foreground">Propostas abertas</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-primary">
                {formatCurrency(openTotal)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Você possui {formatCurrency(openTotal)} em {summary.openCount} propostas em aberto.
              </p>
            </div>
          </CardContent>
        </Card>

        <SummaryCard
          icon={UserRoundCheck}
          label="Fechado no mês"
          value={formatCurrency(summary.wonValue)}
          hint="Propostas que viraram atendimento"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Taxa de conversão"
          value={`${summary.conversion.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`}
          hint="Fechados sobre o total decidido"
        />
        <SummaryCard
          icon={CalendarClock}
          label="Recontatos programados"
          value={String(summary.scheduledCount)}
          hint="Criados pelo pós-procedimento"
        />
      </div>

      {/* Quadro */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {leadStages.map((stage) => {
            const items = leads.filter((lead) => lead.stage === stage.id)
            // Só o que está de fato em jogo entra no total — recontatos futuros
            // são contados à parte para não inflar o funil.
            const active = items.filter((lead) => (stage.open ? isActiveProposal(lead) : true))
            const total = active.reduce((sum, lead) => sum + lead.value, 0)
            const scheduledCount = items.length - active.length

            return (
              <div key={stage.id} className="flex w-[290px] shrink-0 flex-col">
                <div className="mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", stageAccent[stage.id])} />
                    <p className="text-[13px] font-semibold">{stage.label}</p>
                    <Badge variant="secondary" className="ml-auto h-5 rounded-full px-2 text-[10px] tabular-nums">
                      {items.length}
                    </Badge>
                  </div>
                  <p className="mt-1.5 pl-4 text-[11px] text-muted-foreground">
                    {total > 0 ? (
                      <span className="font-medium tabular-nums text-foreground/70">
                        {formatCurrency(total)}
                      </span>
                    ) : (
                      stage.hint
                    )}
                    {scheduledCount > 0 && (
                      <span className="ml-1.5">
                        · {scheduledCount} programado{scheduledCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex min-h-[220px] flex-1 flex-col gap-2.5 rounded-2xl border border-dashed border-transparent bg-muted/30 p-2.5 transition-colors",
                        snapshot.isDraggingOver && "border-primary/30 bg-primary/[0.05]",
                      )}
                    >
                      {items.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                "outline-none",
                                dragSnapshot.isDragging && "rotate-[1.5deg]",
                              )}
                            >
                              <LeadCard
                                lead={lead}
                                dragging={dragSnapshot.isDragging}
                                onConvert={() => {
                                  const patientId = convertLead(lead.id)
                                  if (patientId) {
                                    toast.success(`${lead.name} virou paciente`)
                                    navigate(`/pacientes/${patientId}`)
                                  }
                                }}
                                onLose={() => moveLead(lead.id, "perdido")}
                                onRemove={() => {
                                  removeLead(lead.id)
                                  toast(`${lead.name} foi removida do funil`)
                                }}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}

                      {items.length === 0 && !snapshot.isDraggingOver && (
                        <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-muted-foreground/70">
                          {stage.hint}
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Arraste os cards entre as colunas para atualizar o estágio. O valor das propostas abertas se ajusta na
        hora.
      </p>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]">
      <CardContent className="px-4 py-4">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground" />
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        </div>
        <p className="mt-1.5 font-display text-xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function LeadCard({
  lead,
  dragging,
  onConvert,
  onLose,
  onRemove,
}: {
  lead: Lead
  dragging: boolean
  onConvert: () => void
  onLose: () => void
  onRemove: () => void
}) {
  const closed = lead.stage === "fechado" || lead.stage === "perdido"
  const scheduled = Boolean(lead.scheduledFor && lead.scheduledFor > lead.lastContact)

  return (
    <Card
      className={cn(
        "group gap-0 border-border/70 py-0 transition-shadow",
        dragging ? "shadow-[0_18px_40px_-18px_hsl(335_45%_45%/0.45)]" : "shadow-[var(--shadow-soft)]",
        lead.stage === "perdido" && "opacity-65",
        scheduled && "border-dashed",
      )}
    >
      <CardContent className="px-3.5 py-3">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{lead.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{lead.interest}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Ações de ${lead.name}`}
                className="-mr-1 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onConvert} disabled={lead.stage === "perdido"}>
                <UserRoundCheck /> Converter em paciente
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={buildWhatsAppLink(
                    lead.phone,
                    contextualMessage({
                      vars: {
                        firstName: firstNameOf(lead.name),
                        procedure: lead.interest,
                        value: lead.value,
                        lastVisit: lead.lastContact,
                      },
                      hasOpenProposal: lead.stage === "proposta-enviada",
                      isInactive: Boolean(lead.scheduledFor),
                    }),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle /> Chamar no WhatsApp
                </a>
              </DropdownMenuItem>
              {!closed && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLose}>
                    <Snowflake /> Marcar como perdido
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                Remover do funil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="mt-2.5 font-display text-[17px] font-semibold tabular-nums">
          {formatCurrency(lead.value)}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="rounded-full text-[10px] font-medium">
            {lead.source}
          </Badge>
          {scheduled ? (
            <Badge
              variant="outline"
              className="rounded-full border-primary/25 bg-primary/10 text-[10px] text-primary"
            >
              <CalendarClock className="size-2.5" /> {formatDate(lead.scheduledFor!)}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={cn("rounded-full text-[10px] capitalize", temperatureStyles[lead.temperature])}
            >
              {lead.temperature === "quente" && <Flame className="size-2.5" />}
              {lead.temperature}
            </Badge>
          )}
        </div>

        {lead.note && (
          <p className="mt-2.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {lead.note}
          </p>
        )}

        <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
          <span>{lead.owner}</span>
          <span className="tabular-nums">
            {scheduled
              ? `recontatar em ${formatDate(lead.scheduledFor!)}`
              : `contato em ${formatDate(lead.lastContact)}`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
