import { useEffect, useMemo, useState } from "react"
import { KanbanSquare, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { crmApi } from "@/lib/crm-api"
import { parseDecimal } from "@/lib/number"
import { tagColorStyle } from "@/lib/tag-colors"
import { cn } from "@/lib/utils"
import { usePatientStore } from "@/stores/usePatientStore"
import { usePipelineStore } from "@/stores/usePipelineStore"

const NO_PRODUCT = "__none__"

/**
 * Etapa do funil no topo da conversa: troca a etapa do lead do contato ou,
 * se ele ainda não está no funil, adiciona já na etapa escolhida.
 */
export function LeadStageControl({
  contactId,
  leadId,
  onLinked,
}: {
  contactId: string
  leadId: string | null
  onLinked: (leadId: string) => void
}) {
  const leads = usePatientStore((s) => s.leads)
  const fetchLeads = usePatientStore((s) => s.fetchLeads)
  const moveLeadToStage = usePatientStore((s) => s.moveLeadToStage)
  const pipelines = usePipelineStore((s) => s.pipelines)
  const loadPipelines = usePipelineStore((s) => s.load)
  const products = usePipelineStore((s) => s.products)
  const loadProducts = usePipelineStore((s) => s.loadProducts)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([fetchLeads(), loadPipelines(), loadProducts()])
      .catch(() => {})
      .finally(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [contactId, fetchLeads, loadPipelines, loadProducts])

  const lead = leadId ? leads.find((l) => l.id === leadId) : undefined
  const leadPipeline = lead ? pipelines.find((p) => p.id === lead.pipelineId) : undefined

  if (!ready) return null

  if (lead && leadPipeline) {
    const stages = [...leadPipeline.stages].sort((a, b) => a.position - b.position)
    const current = stages.find((s) => s.id === lead.stageId)
    return (
      <Select
        value={lead.stageId ?? ""}
        onValueChange={async (value) => {
          if (!value || value === lead.stageId) return
          const saved = await moveLeadToStage(lead.id, value)
          if (saved) toast.success(`${lead.name} foi para ${stages.find((s) => s.id === value)?.name}.`)
          else toast.error("Não foi possível mudar a etapa.")
        }}
      >
        <SelectTrigger size="sm" className="h-8 w-auto max-w-[220px] gap-1.5 text-[12px]" title={`Etapa no funil ${leadPipeline.name}`}>
          <span className={cn("size-2 shrink-0 rounded-full", tagColorStyle(current?.color ?? "cinza").dot)} />
          <SelectValue placeholder="Etapa" />
        </SelectTrigger>
        <SelectContent>
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{leadPipeline.name}</p>
          {stages.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>
              {stage.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // Sem lead ativo (ou com lead arquivado): oferece adicionar ao funil.
  return <AddToFunnel contactId={contactId} pipelines={pipelines} products={products} onLinked={onLinked} />
}

function AddToFunnel({
  contactId,
  pipelines,
  products,
  onLinked,
}: {
  contactId: string
  pipelines: ReturnType<typeof usePipelineStore.getState>["pipelines"]
  products: ReturnType<typeof usePipelineStore.getState>["products"]
  onLinked: (leadId: string) => void
}) {
  const fetchLeads = usePatientStore((s) => s.fetchLeads)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const defaultPipeline = pipelines.find((p) => p.kind === "DIGITAL") ?? pipelines.find((p) => p.isDefault) ?? pipelines[0]
  const [pipelineId, setPipelineId] = useState("")
  const [stageId, setStageId] = useState("")
  const [productId, setProductId] = useState(NO_PRODUCT)
  const [interest, setInterest] = useState("")
  const [value, setValue] = useState("")

  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? defaultPipeline
  const stages = useMemo(() => [...(pipeline?.stages ?? [])].sort((a, b) => a.position - b.position), [pipeline])
  const digital = pipeline?.kind === "DIGITAL"
  const stage = stages.find((s) => s.id === stageId) ?? stages.find((s) => s.type === "OPEN") ?? stages[0]

  if (!pipeline) return null

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!digital && !interest.trim()) return toast.error("Informe o interesse.")
    const amount = parseDecimal(value)
    setSaving(true)
    try {
      const { contact } = await crmApi.createLeadFromContact(contactId, {
        stageId: stage?.id,
        ...(digital && productId !== NO_PRODUCT ? { productId } : { interest: digital ? "A definir" : interest.trim() }),
        ...(amount > 0 ? { value: amount } : {}),
      })
      await fetchLeads()
      if (contact.lead) onLinked(contact.lead.id)
      toast.success(`Adicionado ao funil: ${stage?.name}.`)
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível adicionar ao funil.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-[12px]">
          <Plus /> Adicionar ao funil
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form onSubmit={submit} className="grid gap-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            <KanbanSquare className="size-4 text-primary" /> Adicionar ao funil
          </p>
          {pipelines.length > 1 && (
            <div>
              <Label className="text-[12px]">Pipeline</Label>
              <Select
                value={pipeline.id}
                onValueChange={(v) => {
                  if (!v) return
                  setPipelineId(v)
                  setStageId("")
                }}
              >
                <SelectTrigger size="sm" className="mt-1 w-full text-[12px]">
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
          )}
          <div>
            <Label className="text-[12px]">Etapa</Label>
            <Select value={stage?.id ?? ""} onValueChange={(v) => v && setStageId(v)}>
              <SelectTrigger size="sm" className="mt-1 w-full text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {digital ? (
            <div>
              <Label className="text-[12px]">Produto</Label>
              <Select value={productId} onValueChange={(v) => v && setProductId(v)}>
                <SelectTrigger size="sm" className="mt-1 w-full text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PRODUCT}>Ainda não sei</SelectItem>
                  {products
                    .filter((p) => p.active)
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
              <Label className="text-[12px]">Interesse</Label>
              <Input
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="Ex.: Toxina botulínica"
                className="mt-1 h-8 text-[12px]"
              />
            </div>
          )}
          <div>
            <Label className="text-[12px]">Valor (opcional)</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              placeholder={digital ? "Vazio = preço do produto" : "R$"}
              className="mt-1 h-8 text-[12px] tabular-nums"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Adicionar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
