import { useCallback, useEffect, useMemo, useState } from "react"
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd"
import {
  ContactRound,
  Flame,
  GripVertical,
  KanbanSquare,
  MessageCircle,
  MoreHorizontal,
  CalendarClock,
  Loader2,
  Package,
  Pencil,
  Plus,
  Settings2,
  Snowflake,
  TrendingUp,
  UserRoundCheck,
  Wallet,
  Zap,
} from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { AutomationsTab } from "@/components/crm/AutomationsTab"
import { ContactsTab } from "@/components/crm/ContactsTab"
import { EditLeadDialog } from "@/components/crm/EditLeadDialog"
import { ManagePipelineDialog } from "@/components/crm/ManagePipelineDialog"
import { ManageProductsDialog } from "@/components/crm/ManageProductsDialog"
import { NewLeadDialog } from "@/components/crm/NewLeadDialog"
import { TagChip } from "@/components/crm/TagChip"

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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Lead } from "@/data/leads"
import { crmApi } from "@/lib/crm-api"
import { tagColorStyle } from "@/lib/tag-colors"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { buildWhatsAppLink, contextualMessage, firstNameOf } from "@/lib/whatsapp"
import { usePatientStore } from "@/stores/usePatientStore"
import { PURCHASE_STATUS_LABEL, STAGE_TYPE_LABEL, usePipelineStore, type StageType } from "@/stores/usePipelineStore"
import { useTagStore } from "@/stores/useTagStore"
import { useAuthStore } from "@/stores/useAuthStore"
import { isRestrictedRole } from "@/lib/roles"

const purchaseStyles: Record<string, string> = {
  INTERESTED: "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
  CHECKOUT_ABANDONED: "border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200",
  PURCHASED: "border-success/30 bg-success/10 text-success",
  REFUNDED: "border-border bg-muted text-muted-foreground",
}

const temperatureStyles = {
  quente: "border-destructive/20 bg-destructive/10 text-destructive",
  morno: "border-warning/25 bg-warning/12 text-warning-foreground",
  frio: "border-border bg-muted text-muted-foreground",
} as const

type CrmTab = "pipeline" | "contatos" | "automacoes"

export default function Crm() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.clinicRole)
  const canAutomate = role === "OWNER" || role === "ADMIN"
  const sales = isRestrictedRole(role)
  const aba = params.get("aba")
  const tab: CrmTab = aba === "contatos" ? "contatos" : aba === "automacoes" && canAutomate ? "automacoes" : "pipeline"
  const focusContactId = params.get("contato")

  // Links antigos (/crm?aba=conversas) agora levam para a página Conversas.
  const legacyConversation = params.get("aba") === "conversas"
  useEffect(() => {
    if (!legacyConversation) return
    const conversa = params.get("conversa")
    navigate(conversa ? `/conversas?conversa=${conversa}` : "/conversas", { replace: true })
  }, [legacyConversation, params, navigate])

  const changeTab = useCallback(
    (next: CrmTab) => {
      setParams(next === "pipeline" ? {} : { aba: next })
    },
    [setParams],
  )

  const clearFocus = useCallback(() => {
    setParams(
      (current) => {
        const result = new URLSearchParams(current)
        result.delete("contato")
        return result
      },
      { replace: true },
    )
  }, [setParams])

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title={sales ? "CRM de Infoprodutos" : "CRM de Pacientes e Leads"}
        description={
          sales
            ? "Leads de cursos, mentorias e imersões, do primeiro contato à compra."
            : "Do primeiro contato ao fechamento, com o valor de cada proposta sempre à vista."
        }
        actions={
undefined
        }
      />

      <Tabs value={tab} onValueChange={(value) => changeTab(value as CrmTab)} className="gap-4">
        <TabsList>
          <TabsTrigger value="pipeline" className="px-3">
            <KanbanSquare /> Funil
          </TabsTrigger>
          <TabsTrigger value="contatos" className="px-3">
            <ContactRound /> Contatos
          </TabsTrigger>
          {canAutomate && (
            <TabsTrigger value="automacoes" className="px-3">
              <Zap /> Automações
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pipeline">
          <CrmPipeline />
        </TabsContent>
        <TabsContent value="contatos">
          <ContactsTab
            focusContactId={focusContactId}
            onFocusHandled={clearFocus}
            onOpenConversation={(id) => navigate(`/conversas?conversa=${id}`)}
          />
        </TabsContent>
        {canAutomate && (
          <TabsContent value="automacoes">
            <AutomationsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

const LAST_PIPELINE_KEY = "ana_corso_crm_pipeline"

function CrmPipeline() {
  const allLeads = usePatientStore((state) => state.leads)
  const fetchLeads = usePatientStore((state) => state.fetchLeads)
  const moveLeadToStage = usePatientStore((state) => state.moveLeadToStage)
  const convertLead = usePatientStore((state) => state.convertLead)
  const removeLead = usePatientStore((state) => state.removeLead)
  const pipelines = usePipelineStore((state) => state.pipelines)
  const loadPipelines = usePipelineStore((state) => state.load)
  const createPipeline = usePipelineStore((state) => state.createPipeline)
  const pipelinesLoaded = usePipelineStore((state) => state.loaded)
  const sales = isRestrictedRole(useAuthStore((state) => state.clinicRole))
  const navigate = useNavigate()

  const [pipelineId, setPipelineId] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_PIPELINE_KEY) ?? ""
    } catch {
      return ""
    }
  })
  const [managing, setManaging] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creatingPipeline, setCreatingPipeline] = useState(false)
  const [newPipelineName, setNewPipelineName] = useState("")
  const [newPipelineKind, setNewPipelineKind] = useState<"CLINIC" | "DIGITAL">("DIGITAL")
  const [managingProducts, setManagingProducts] = useState(false)
  const products = usePipelineStore((state) => state.products)
  const loadProducts = usePipelineStore((state) => state.loadProducts)

  useEffect(() => {
    // Leads primeiro: o servidor encaixa os leads antigos nas etapas do pipeline.
    fetchLeads().then(() => loadPipelines().catch(() => toast.error("Não foi possível carregar os pipelines.")))
    loadProducts().catch(() => {})
  }, [fetchLeads, loadPipelines, loadProducts])

  const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0]
  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? defaultPipeline
  const stages = useMemo(() => [...(pipeline?.stages ?? [])].sort((a, b) => a.position - b.position), [pipeline])
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages])

  function selectPipeline(id: string) {
    setPipelineId(id)
    try {
      localStorage.setItem(LAST_PIPELINE_KEY, id)
    } catch {
      // preferência só da sessão
    }
  }

  const leads = useMemo(
    () => (pipeline ? allLeads.filter((lead) => (lead.pipelineId ?? defaultPipeline?.id) === pipeline.id) : []),
    [allLeads, pipeline, defaultPipeline],
  )
  const editingLead = allLeads.find((lead) => lead.id === editingId) ?? null

  const summary = useMemo(() => {
    const typeOf = (lead: Lead) => (lead.stageId ? stageById.get(lead.stageId)?.type : undefined) ?? "OPEN"
    const open = leads.filter((lead) => typeOf(lead) === "OPEN")
    const won = leads.filter((lead) => typeOf(lead) === "WON")
    const lost = leads.filter((lead) => typeOf(lead) === "LOST")
    const decided = won.length + lost.length
    const openTotal = open.reduce((sum, lead) => sum + lead.value, 0)
    return {
      openTotal,
      openCount: open.length,
      scheduledCount: open.filter((lead) => Boolean(lead.scheduledFor)).length,
      wonValue: won.reduce((sum, lead) => sum + lead.value, 0),
      conversion: decided === 0 ? 0 : (won.length / decided) * 100,
    }
  }, [leads, stageById])

  async function convert(lead: Lead) {
    const patientId = await convertLead(lead.id)
    if (patientId) {
      toast.success(`${lead.name} virou paciente`)
      navigate(`/pacientes/${patientId}`)
    } else {
      toast.error("Não foi possível converter o lead.")
    }
  }

  async function moveTo(lead: Lead, stageId: string, index?: number) {
    const target = stageById.get(stageId)
    const previousType = lead.stageId ? stageById.get(lead.stageId)?.type : undefined
    const saved = await moveLeadToStage(lead.id, stageId, index)
    if (!saved) {
      toast.error("Não foi possível mover o card.")
      return
    }
    loadPipelines().catch(() => {})
    if (target?.type === "WON" && previousType !== "WON") {
      // Infoproduto não vira ficha de paciente.
      const digitalLead = pipelines.find((p) => p.id === lead.pipelineId)?.kind === "DIGITAL"
      toast.success(`${lead.name} foi para ${target.name}`, {
        description: `${formatCurrency(lead.value)} saem do funil aberto.`,
        ...(digitalLead || sales ? {} : { action: { label: "Criar ficha", onClick: () => convert(lead) } }),
      })
    }
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    const lead = leads.find((item) => item.id === draggableId)
    if (lead) moveTo(lead, destination.droppableId, destination.index)
  }

  async function submitNewPipeline(event: React.FormEvent) {
    event.preventDefault()
    const name = newPipelineName.trim()
    if (!name) return
    try {
      const id = await createPipeline(name, sales ? "DIGITAL" : newPipelineKind)
      selectPipeline(id)
      setNewPipelineName("")
      setCreatingPipeline(false)
      toast.success(`Pipeline "${name}" criado. Ajuste as etapas em "Etapas".`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o pipeline.")
    }
  }

  const newPipelineForm = (
    <form onSubmit={submitNewPipeline} className="flex items-center gap-1.5">
      <Input
        autoFocus
        value={newPipelineName}
        onChange={(event) => setNewPipelineName(event.target.value)}
        placeholder="Nome do pipeline"
        className="h-9 w-[200px]"
        maxLength={60}
      />
      {!sales && (
        <Select value={newPipelineKind} onValueChange={(value) => value && setNewPipelineKind(value as "CLINIC" | "DIGITAL")}>
          <SelectTrigger className="h-9 w-[170px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DIGITAL">Produtos digitais</SelectItem>
            <SelectItem value="CLINIC">Clínica</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button type="submit" size="sm" disabled={!newPipelineName.trim()}>
        Criar
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setCreatingPipeline(false)}>
        Cancelar
      </Button>
    </form>
  )

  if (!pipeline) {
    if (pipelinesLoaded && pipelines.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <KanbanSquare className="size-8 text-primary/60" />
          <p className="text-sm font-medium">Nenhum pipeline de infoprodutos ainda</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Crie o primeiro pipeline (ex.: "Mentoria", "Cursos online") para organizar os leads dos produtos digitais.
          </p>
          {creatingPipeline ? (
            newPipelineForm
          ) : (
            <Button size="sm" onClick={() => setCreatingPipeline(true)}>
              <Plus /> Criar pipeline
            </Button>
          )}
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando funil…
      </div>
    )
  }

  const digital = pipeline.kind === "DIGITAL"

  const firstOpenStage = stages.find((s) => s.type === "OPEN") ?? stages[0]

  return (
    <div>
      {/* Pipeline */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={pipeline.id} onValueChange={selectPipeline}>
          <SelectTrigger className="h-9 w-[220px] justify-start gap-2 bg-card font-medium [&>span]:flex-1 [&>span]:text-left">
            <KanbanSquare className="size-4 text-primary" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setManaging(true)}>
          <Settings2 /> Etapas
        </Button>
        {creatingPipeline ? (
          newPipelineForm
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setCreatingPipeline(true)}>
            <Plus /> Novo pipeline
          </Button>
        )}
        {digital && (
          <Button variant="outline" size="sm" onClick={() => setManagingProducts(true)}>
            <Package /> Produtos
          </Button>
        )}
        <div className="ml-auto">
          <NewLeadDialog
            stageId={firstOpenStage?.id}
            digital={digital}
            products={products.filter((p) => p.active)}
          />
        </div>
      </div>

      {/* Resumo do funil */}
      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <Card className="gap-0 overflow-hidden border-primary/15 bg-gradient-to-br from-accent/70 via-card to-card py-0 shadow-[var(--shadow-soft)]">
          <CardContent className="flex items-center gap-4 px-5 py-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <Wallet className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-muted-foreground">{digital ? "Em negociação" : "Propostas abertas"}</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-primary">
                {formatCurrency(summary.openTotal)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {summary.openCount} lead(s) em andamento em {pipeline.name}.
              </p>
            </div>
          </CardContent>
        </Card>

        <SummaryCard
          icon={UserRoundCheck}
          label="Ganhos"
          value={formatCurrency(summary.wonValue)}
          hint="Cards nas etapas de ganho"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Taxa de conversão"
          value={`${summary.conversion.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`}
          hint="Ganhos sobre o total decidido"
        />
        <SummaryCard
          icon={CalendarClock}
          label="Recontatos programados"
          value={String(summary.scheduledCount)}
          hint="Leads em andamento com data marcada"
        />
      </div>

      {/* Quadro */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const items = leads.filter((lead) => (lead.stageId ?? firstOpenStage?.id) === stage.id)
            const total = items.reduce((sum, lead) => sum + lead.value, 0)
            const color = tagColorStyle(stage.color)

            return (
              <div key={stage.id} className="flex w-[290px] shrink-0 flex-col">
                <div className="mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", color.dot)} />
                    <p className="truncate text-[13px] font-semibold">{stage.name}</p>
                    {stage.type !== "OPEN" && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[9px] font-semibold uppercase tracking-wide",
                          stage.type === "WON" ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {STAGE_TYPE_LABEL[stage.type]}
                      </span>
                    )}
                    <Badge variant="secondary" className="ml-auto h-5 rounded-full px-2 text-[10px] tabular-nums">
                      {items.length}
                    </Badge>
                  </div>
                  <p className="mt-1.5 pl-4 text-[11px] text-muted-foreground">
                    {total > 0 ? (
                      <span className="font-medium tabular-nums text-foreground/70">{formatCurrency(total)}</span>
                    ) : (
                      "Arraste cards para cá"
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
                              className={cn("outline-none", dragSnapshot.isDragging && "rotate-[1.5deg]")}
                            >
                              <LeadCard
                                lead={lead}
                                stageType={stage.type}
                                dragging={dragSnapshot.isDragging}
                                digital={digital}
                                onEdit={() => setEditingId(lead.id)}
                                onConvert={digital || sales ? undefined : () => convert(lead)}
                                onLose={
                                  stage.type === "OPEN" && stages.some((s) => s.type === "LOST")
                                    ? () => moveTo(lead, stages.find((s) => s.type === "LOST")!.id)
                                    : undefined
                                }
                                onOpenConversation={
                                  lead.contact
                                    ? async () => {
                                        if (lead.contact!.conversationId) {
                                          navigate(`/conversas?conversa=${lead.contact!.conversationId}`)
                                          return
                                        }
                                        try {
                                          const { conversation } = await crmApi.openConversation(lead.contact!.id)
                                          navigate(`/conversas?conversa=${conversation.id}`)
                                        } catch {
                                          toast.error("Não foi possível abrir a conversa.")
                                        }
                                      }
                                    : undefined
                                }
                                onRemove={() => {
                                  if (!window.confirm(`Remover ${lead.name} do funil?`)) return
                                  removeLead(lead.id)
                                  toast(`${lead.name} foi removida do funil`)
                                }}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Arraste os cards entre as colunas para mudar a etapa. Clique em um card para editar.
      </p>

      <ManagePipelineDialog
        pipeline={pipeline}
        open={managing}
        onOpenChange={setManaging}
        onDeleted={() => {
          selectPipeline(defaultPipeline?.id ?? "")
          fetchLeads()
        }}
      />
      <ManageProductsDialog open={managingProducts} onOpenChange={setManagingProducts} />
      <EditLeadDialog lead={editingLead} open={Boolean(editingId)} onOpenChange={(open) => !open && setEditingId(null)} />
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
  stageType,
  dragging,
  digital,
  onEdit,
  onConvert,
  onLose,
  onOpenConversation,
  onRemove,
}: {
  lead: Lead
  stageType: StageType
  dragging: boolean
  digital: boolean
  onEdit: () => void
  onConvert?: () => void
  onLose?: () => void
  onOpenConversation?: () => void
  onRemove: () => void
}) {
  const scheduled = Boolean(lead.scheduledFor && stageType === "OPEN")
  const tags = useTagStore((state) => state.tags)
  const colorOf = useMemo(() => new Map(tags.map((t) => [t.name, t.color])), [tags])

  return (
    <Card
      onClick={onEdit}
      className={cn(
        "group cursor-pointer gap-0 border-border/70 py-0 transition-shadow hover:border-primary/30",
        dragging ? "shadow-[0_18px_40px_-18px_hsl(335_45%_45%/0.45)]" : "shadow-[var(--shadow-soft)]",
        stageType === "LOST" && "opacity-65",
      )}
    >
      <CardContent className="px-3.5 py-3">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{lead.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{lead.product?.name ?? lead.interest}</p>
          </div>

          <div onClick={(event) => event.stopPropagation()}>
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
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                {onConvert && (
                  <DropdownMenuItem onClick={onConvert} disabled={stageType === "LOST"}>
                    <UserRoundCheck /> Converter em paciente
                  </DropdownMenuItem>
                )}
                {onOpenConversation ? (
                  <DropdownMenuItem onClick={onOpenConversation}>
                    <MessageCircle /> Abrir conversa
                  </DropdownMenuItem>
                ) : (
                  lead.phone && (
                    <DropdownMenuItem asChild>
                      <a
                        href={buildWhatsAppLink(
                          lead.phone,
                          digital
                            ? `Olá, ${firstNameOf(lead.name)}! Tudo bem? Vi seu interesse em ${lead.product?.name ?? lead.interest} e posso te ajudar com qualquer dúvida.`
                            : contextualMessage({
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
                  )
                )}
                {onLose && (
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
        </div>

        <p className="mt-2.5 font-display text-[17px] font-semibold tabular-nums">{formatCurrency(lead.value)}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="rounded-full text-[10px] font-medium">
            {lead.source}
          </Badge>
          <Badge
            variant="outline"
            className={cn("rounded-full text-[10px] capitalize", temperatureStyles[lead.temperature] ?? temperatureStyles.morno)}
          >
            {lead.temperature === "quente" && <Flame className="size-2.5" />}
            {lead.temperature}
          </Badge>
          {lead.purchaseStatus && (
            <Badge variant="outline" className={cn("rounded-full text-[10px]", purchaseStyles[lead.purchaseStatus])}>
              {PURCHASE_STATUS_LABEL[lead.purchaseStatus]}
            </Badge>
          )}
          {scheduled && (
            <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 text-[10px] text-primary">
              <CalendarClock className="size-2.5" /> {formatDate(lead.scheduledFor!)}
            </Badge>
          )}
          {lead.contact?.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag} name={tag} color={colorOf.get(tag)} size="xs" />
          ))}
        </div>

        {lead.note && (
          <p className="mt-2.5 line-clamp-3 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {lead.note}
          </p>
        )}

        <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
          <span className="truncate">{lead.assignedUser?.name ?? lead.owner}</span>
          <span className="shrink-0 tabular-nums">
            {scheduled ? `recontatar em ${formatDate(lead.scheduledFor!)}` : `contato em ${formatDate(lead.lastContact)}`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
