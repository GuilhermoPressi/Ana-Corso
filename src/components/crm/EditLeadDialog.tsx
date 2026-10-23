import { useEffect, useMemo, useState } from "react"
import { Loader2, MessageCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { ContactTagsEditor } from "@/components/crm/ContactTagsEditor"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Lead } from "@/data/leads"
import { crmApi, type TeamMember } from "@/lib/crm-api"
import { parseMoney } from "@/lib/money"
import { tagColorStyle } from "@/lib/tag-colors"
import { cn } from "@/lib/utils"
import { buildWhatsAppLink } from "@/lib/whatsapp"
import { usePatientStore } from "@/stores/usePatientStore"
import { DIGITAL_SOURCES, PURCHASE_STATUS_LABEL, usePipelineStore, type PurchaseStatus } from "@/stores/usePipelineStore"

const SOURCES = ["Instagram", "Indicação", "Google", "WhatsApp", "Presencial", "Facebook", "Site", "Outro"]
const NO_ASSIGNEE = "__none__"
const NONE = "__none__"

type Form = {
  name: string
  phone: string
  email: string
  interest: string
  source: string
  value: string
  temperature: Lead["temperature"]
  note: string
  assignedUserId: string
  scheduledFor: string
  pipelineId: string
  stageId: string
  productId: string
  purchaseStatus: string
}

function formFrom(lead: Lead, defaultPipelineId: string): Form {
  return {
    name: lead.name,
    phone: lead.phone,
    email: lead.email ?? "",
    interest: lead.interest,
    source: lead.source,
    value: lead.value ? lead.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
    temperature: lead.temperature,
    note: lead.note ?? "",
    assignedUserId: lead.assignedUser?.id ?? NO_ASSIGNEE,
    scheduledFor: lead.scheduledFor ?? "",
    pipelineId: lead.pipelineId ?? defaultPipelineId,
    stageId: lead.stageId ?? "",
    productId: lead.product?.id ?? NONE,
    purchaseStatus: lead.purchaseStatus ?? NONE,
  }
}

/** Edição completa do card do funil. */
export function EditLeadDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const saveLead = usePatientStore((s) => s.saveLead)
  const updateLeadLocal = usePatientStore((s) => s.updateLead)
  const pipelines = usePipelineStore((s) => s.pipelines)
  const products = usePipelineStore((s) => s.products)
  const defaultPipelineId = pipelines.find((p) => p.isDefault)?.id ?? pipelines[0]?.id ?? ""
  const [form, setForm] = useState<Form | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [saving, setSaving] = useState(false)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    if (open && lead) setForm(formFrom(lead, defaultPipelineId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id])

  useEffect(() => {
    if (!open || team.length) return
    crmApi
      .listTeam()
      .then((data) => setTeam(data.members.filter((m) => m.status === "ACTIVE")))
      .catch(() => {})
  }, [open, team.length])

  const pipeline = pipelines.find((p) => p.id === form?.pipelineId)
  const digital = pipeline?.kind === "DIGITAL"
  const stages = useMemo(() => [...(pipeline?.stages ?? [])].sort((a, b) => a.position - b.position), [pipeline])

  if (!lead || !form) return null

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!lead || !form) return
    if (form.name.trim().length < 2) {
      toast.error("Informe o nome do lead.")
      return
    }
    const product = products.find((p) => p.id === form.productId)
    if (!digital && !form.interest.trim()) {
      toast.error("Informe o interesse / procedimento.")
      return
    }
    if (digital && !product && !form.interest.trim()) {
      toast.error("Escolha o produto.")
      return
    }
    const value = form.value.trim() ? parseMoney(form.value) : 0
    if (Number.isNaN(value) || value < 0) {
      toast.error("Valor inválido. Ex.: 2.400,00")
      return
    }
    if (!form.stageId) {
      toast.error("Escolha a etapa.")
      return
    }

    setSaving(true)
    const result = await saveLead(lead.id, {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      interest: (digital && product ? product.name : form.interest).trim(),
      productId: form.productId === NONE ? null : form.productId,
      purchaseStatus: form.purchaseStatus === NONE ? null : form.purchaseStatus,
      source: form.source,
      value,
      temperature: form.temperature,
      note: form.note.trim() || null,
      assignedUserId: form.assignedUserId === NO_ASSIGNEE ? null : form.assignedUserId,
      scheduledFor: form.scheduledFor || null,
      pipelineId: form.pipelineId,
      stageId: form.stageId,
    })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Lead atualizado.")
    usePipelineStore.getState().load().catch(() => {})
    onOpenChange(false)
  }

  async function openConversation() {
    if (!lead?.contact) return
    if (lead.contact.conversationId) {
      navigate(`/conversas?conversa=${lead.contact.conversationId}`)
      return
    }
    setOpening(true)
    try {
      const { conversation } = await crmApi.openConversation(lead.contact.id)
      navigate(`/conversas?conversa=${conversation.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir a conversa.")
    } finally {
      setOpening(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display">Editar lead</DialogTitle>
            <DialogDescription>Atualize os dados, o responsável, a etapa ou o pipeline deste card.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Pipeline e etapa */}
            <div className="grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
              <div>
                <Label className="text-[13px]">Pipeline</Label>
                <Select
                  value={form.pipelineId}
                  onValueChange={(value) => {
                    const next = pipelines.find((p) => p.id === value)
                    const first = [...(next?.stages ?? [])].sort((a, b) => a.position - b.position)
                    // Ao trocar de pipeline, leva para a primeira etapa "em andamento".
                    const target = first.find((s) => s.type === "OPEN") ?? first[0]
                    setForm((f) => (f ? { ...f, pipelineId: value, stageId: target?.id ?? "" } : f))
                  }}
                >
                  <SelectTrigger className="mt-1.5 w-full">
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
              </div>
              <div>
                <Label className="text-[13px]">Etapa</Label>
                <Select
                  value={form.stageId}
                  // O Select do Radix emite "" quando a lista de etapas troca (mudança de pipeline).
                  onValueChange={(value) => value && set("stageId", value)}
                >
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue placeholder="Escolha a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className={cn("size-2 rounded-full", tagColorStyle(s.color).dot)} />
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dados */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="el-name" className="text-[13px]">
                  Nome
                </Label>
                <Input id="el-name" value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="el-phone" className="text-[13px]">
                  Telefone
                </Label>
                <Input
                  id="el-phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(51) 99999-0000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="el-email" className="text-[13px]">
                  E-mail
                </Label>
                <Input
                  id="el-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              {digital ? (
                <div>
                  <Label className="text-[13px]">Produto</Label>
                  <Select
                    value={form.productId}
                    onValueChange={(value) => {
                      if (!value) return
                      const chosen = products.find((p) => p.id === value)
                      const previous = products.find((p) => p.id === form.productId)
                      setForm((f) => {
                        if (!f) return f
                        // Troca o valor pelo preço do produto se o valor era o do produto anterior (ou vazio).
                        const current = f.value.trim() ? parseMoney(f.value) : 0
                        const followPrice = !current || (previous && current === previous.price)
                        return {
                          ...f,
                          productId: value,
                          value:
                            chosen && followPrice && chosen.price
                              ? chosen.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                              : f.value,
                        }
                      })
                    }}
                  >
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue placeholder="Escolha o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem produto</SelectItem>
                      {products
                        .filter((p) => p.active || p.id === form.productId)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="el-interest" className="text-[13px]">
                    Interesse / procedimento
                  </Label>
                  <Input
                    id="el-interest"
                    value={form.interest}
                    onChange={(e) => set("interest", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              )}
              <div>
                <Label className="text-[13px]">Origem</Label>
                <Select value={form.source} onValueChange={(value) => value && set("source", value)}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([form.source, ...(digital ? DIGITAL_SOURCES : SOURCES)])].filter(Boolean).map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="el-value" className="text-[13px]">
                  Valor da proposta
                </Label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="el-value"
                    inputMode="decimal"
                    value={form.value}
                    onChange={(e) => set("value", e.target.value)}
                    placeholder="0,00"
                    className="pl-9 tabular-nums"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[13px]">Temperatura</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(["quente", "morno", "frio"] as const).map((temperature) => (
                    <Button
                      key={temperature}
                      type="button"
                      size="sm"
                      variant={form.temperature === temperature ? "default" : "outline"}
                      onClick={() => set("temperature", temperature)}
                      className="capitalize"
                    >
                      {temperature}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {digital && (
              <div>
                <Label className="text-[13px]">Situação da compra</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(Object.keys(PURCHASE_STATUS_LABEL) as PurchaseStatus[]).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={form.purchaseStatus === status ? "default" : "outline"}
                      onClick={() => set("purchaseStatus", form.purchaseStatus === status ? NONE : status)}
                    >
                      {PURCHASE_STATUS_LABEL[status]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Responsável e recontato */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[13px]">Responsável</Label>
                <Select value={form.assignedUserId} onValueChange={(value) => value && set("assignedUserId", value)}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ASSIGNEE}>Sem responsável</SelectItem>
                    {team.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                    {lead.assignedUser && !team.some((m) => m.id === lead.assignedUser!.id) && (
                      <SelectItem value={lead.assignedUser.id}>{lead.assignedUser.name}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="el-recontact" className="text-[13px]">
                  Recontatar em
                </Label>
                <div className="mt-1.5 flex gap-1.5">
                  <Input
                    id="el-recontact"
                    type="date"
                    value={form.scheduledFor}
                    onChange={(e) => set("scheduledFor", e.target.value)}
                  />
                  {form.scheduledFor && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => set("scheduledFor", "")}>
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="el-note" className="text-[13px]">
                Observações
              </Label>
              <Textarea
                id="el-note"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>

            {/* WhatsApp: etiquetas e conversa */}
            <div className="rounded-xl border p-3">
              <p className="mb-2 text-[13px] font-medium">WhatsApp</p>
              {lead.contact ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ContactTagsEditor
                    contactId={lead.contact.id}
                    tags={lead.contact.tags}
                    size="sm"
                    onSaved={(tags) => updateLeadLocal(lead.id, { contact: { ...lead.contact!, tags } })}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={openConversation} disabled={opening}>
                    {opening ? <Loader2 className="animate-spin" /> : <MessageCircle />} Abrir conversa
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
                  <span>Este lead ainda não tem contato do WhatsApp vinculado no CRM.</span>
                  {lead.phone && (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={buildWhatsAppLink(lead.phone)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle /> Chamar no WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
