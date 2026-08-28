import { useEffect, useMemo, useState } from "react"
import {
  ClipboardList,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { NumberField } from "@/components/calculators/NumberField"
import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { parseDecimal } from "@/lib/number"
import { cn, formatCurrency } from "@/lib/utils"
import {
  fallbackListPrice,
  summarizeProtocol,
  useCatalogStore,
  type ProtocolStep,
} from "@/stores/useCatalogStore"
import { useFinanceStore } from "@/stores/useFinanceStore"

const procedures = Object.keys(fallbackListPrice)

const percent = (value: number) =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`

type DraftStep = { id: string; procedure: string; label: string; day: string; listPrice: string }

let draftSequence = 0
const draftId = () => `draft-${(draftSequence += 1)}`

export default function Protocolos() {
  const protocols = useCatalogStore((state) => state.protocols)
  const fetchProtocols = useCatalogStore((state) => state.fetchProtocols)
  const fetchProposals = useCatalogStore((state) => state.fetchProposals)
  const addProtocol = useCatalogStore((state) => state.addProtocol)
  const removeProtocol = useCatalogStore((state) => state.removeProtocol)

  useEffect(() => {
    fetchProtocols()
    fetchProposals()
  }, [fetchProtocols, fetchProposals])
  const pricedProcedures = useFinanceStore((state) => state.procedures)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [packagePrice, setPackagePrice] = useState("")
  const [steps, setSteps] = useState<DraftStep[]>([
    { id: draftId(), procedure: "Bioestimulador", label: "", day: "1", listPrice: "3200" },
  ])

  /** Usa o preço já precificado pela clínica quando existir. */
  function priceFor(procedure: string) {
    const match = pricedProcedures.find((item) =>
      item.name.toLowerCase().includes(procedure.toLowerCase()),
    )
    return match?.price ?? fallbackListPrice[procedure] ?? 0
  }

  const parsedSteps = useMemo<ProtocolStep[]>(
    () =>
      steps.map((step, index) => ({
        id: step.id,
        procedure: step.procedure,
        label: step.label.trim() || step.procedure,
        day: Math.max(parseDecimal(step.day) || (index === 0 ? 1 : 0), 0),
        listPrice: Math.max(parseDecimal(step.listPrice) || 0, 0),
      })),
    [steps],
  )

  const packageValue = Math.max(parseDecimal(packagePrice) || 0, 0)
  const summary = summarizeProtocol({ steps: parsedSteps, packagePrice: packageValue })

  const nameError = name.trim().length < 3
  const canSave = !nameError && parsedSteps.length > 0 && packageValue > 0

  function addStep() {
    const procedure = procedures[0]
    setSteps((current) => [
      ...current,
      {
        id: draftId(),
        procedure,
        label: "",
        day: String((Math.max(...current.map((s) => parseDecimal(s.day) || 0), 0) || 0) + 30),
        listPrice: String(priceFor(procedure)),
      },
    ])
  }

  function updateStep(id: string, patch: Partial<DraftStep>) {
    setSteps((current) =>
      current.map((step) => {
        if (step.id !== id) return step
        const next = { ...step, ...patch }
        // Trocar o procedimento repuxa o preço de referência.
        if (patch.procedure && patch.procedure !== step.procedure) {
          next.listPrice = String(priceFor(patch.procedure))
        }
        return next
      }),
    )
  }

  function save() {
    if (!canSave) return

    const protocol = addProtocol({
      name: name.trim(),
      description: description.trim() || "Sem descrição.",
      steps: parsedSteps,
      packagePrice: packageValue,
    })

    toast.success(`${protocol.name} salvo`, {
      description:
        summary.discount > 0
          ? `${formatCurrency(summary.discount)} de economia para a paciente (${percent(summary.discountPercent)}).`
          : "Pacote salvo sem desconto sobre o avulso.",
    })

    setName("")
    setDescription("")
    setPackagePrice("")
    setSteps([{ id: draftId(), procedure: "Bioestimulador", label: "", day: "1", listPrice: "3200" }])
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Criador de Protocolos e Combos"
        description="Monte pacotes com cronograma e mostre à paciente o quanto ela economiza fechando junto."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
        {/* Construtor */}
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-base">Novo protocolo</CardTitle>
            <CardDescription className="mt-1">
              Cada etapa tem um dia no cronograma e o preço que teria se fosse avulsa.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="pt-name" className="text-[13px] font-medium">
                Nome do protocolo
              </Label>
              <Input
                id="pt-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Plano Rejuvenescimento 90 dias"
                className="mt-1.5 bg-card text-[14px]"
              />
            </div>

            <div>
              <Label htmlFor="pt-desc" className="text-[13px] font-medium">
                Como você explica para a paciente
              </Label>
              <Textarea
                id="pt-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="O que ela vai sentir e ver ao final do plano..."
                className="mt-1.5 min-h-[72px] resize-y bg-card text-[13px]"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Cronograma
              </p>
              <Button variant="outline" size="sm" onClick={addStep}>
                <Plus /> Adicionar etapa
              </Button>
            </div>

            <div className="flex flex-col gap-2.5">
              {steps.map((step, index) => (
                <div key={step.id} className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      Etapa {index + 1}
                    </Badge>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSteps((current) => current.filter((s) => s.id !== step.id))}
                        aria-label={`Remover etapa ${index + 1}`}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_0.6fr_0.8fr]">
                    <div>
                      <Label className="text-[12px]">Procedimento</Label>
                      <Select
                        value={step.procedure}
                        onValueChange={(value) => updateStep(step.id, { procedure: value })}
                      >
                        <SelectTrigger size="sm" className="mt-1.5 w-full bg-card text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {procedures.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <NumberField
                      id={`day-${step.id}`}
                      label="Dia"
                      value={step.day}
                      onChange={(value) => updateStep(step.id, { day: value })}
                    />

                    <NumberField
                      id={`price-${step.id}`}
                      label="Preço avulso"
                      prefix="R$"
                      value={step.listPrice}
                      onChange={(value) => updateStep(step.id, { listPrice: value })}
                    />
                  </div>

                  <div className="mt-3">
                    <Label className="text-[12px]">Descrição da etapa</Label>
                    <Input
                      value={step.label}
                      onChange={(event) => updateStep(step.id, { label: event.target.value })}
                      placeholder={`${step.procedure} · região`}
                      className="mt-1.5 bg-card text-[13px]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <NumberField
              id="pt-package"
              label="Preço do pacote"
              prefix="R$"
              value={packagePrice}
              onChange={setPackagePrice}
              placeholder={summary.listTotal > 0 ? String(Math.round(summary.listTotal * 0.85)) : "7.300"}
              help={
                summary.listTotal > 0
                  ? `Somando as etapas avulsas dá ${formatCurrency(summary.listTotal)}.`
                  : "Informe os preços das etapas para ver o comparativo."
              }
            />

            <Button
              onClick={save}
              disabled={!canSave}
              className="rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]"
            >
              <ClipboardList />{" "}
              {nameError
                ? "Dê um nome ao protocolo"
                : packageValue <= 0
                  ? "Informe o preço do pacote"
                  : "Salvar protocolo"}
            </Button>
          </CardContent>
        </Card>

        {/* Prévia */}
        <div className="xl:sticky xl:top-[88px] xl:h-fit">
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Sparkles className="size-4 text-primary" /> Prévia do pacote
              </CardTitle>
              <CardDescription className="mt-1">
                É isso que a paciente enxerga na hora de decidir.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <Timeline steps={parsedSteps} />

              <Separator />

              <div className="grid gap-2">
                <Row label="Somando avulso" value={formatCurrency(summary.listTotal)} muted />
                <Row label="Preço do pacote" value={formatCurrency(packageValue)} strong />
              </div>

              {packageValue > 0 && summary.discount > 0 && (
                <div className="rounded-xl border border-success/25 bg-success/[0.07] px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-success">
                    <TrendingDown className="size-3.5" /> Economia de {formatCurrency(summary.discount)}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {percent(summary.discountPercent)} abaixo do avulso, em {summary.sessions}{" "}
                    {summary.sessions === 1 ? "sessão" : "sessões"} ao longo de {summary.durationDays}{" "}
                    {summary.durationDays === 1 ? "dia" : "dias"}.
                  </p>
                </div>
              )}

              {summary.discount < 0 && packageValue > 0 && (
                <p className="rounded-xl border border-warning/25 bg-warning/[0.07] px-4 py-3 text-[12px] leading-relaxed text-warning-foreground">
                  O pacote está {formatCurrency(Math.abs(summary.discount))} acima da soma avulsa. Confira se
                  é intencional.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Protocolos salvos */}
      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <Layers className="size-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold">Protocolos da clínica</h2>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {protocols.length}
          </Badge>
        </div>

        {protocols.length === 0 ? (
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-accent">
                <ClipboardList className="size-5 text-primary" />
              </div>
              <p className="mt-4 font-display text-[15px] font-semibold">Nenhum protocolo ainda</p>
              <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
                Monte o primeiro ao lado — ele fica disponível para usar nas propostas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {protocols.map((protocol) => {
              const detail = summarizeProtocol(protocol)
              return (
                <Card key={protocol.id} className="border-border/70 shadow-[var(--shadow-soft)]">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="font-display text-[15px]">{protocol.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {protocol.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover ${protocol.name}`}
                      onClick={() => removeProtocol(protocol.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </CardHeader>

                  <CardContent className="grid gap-3">
                    <Timeline steps={protocol.steps} compact />

                    <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border/60 pt-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground line-through tabular-nums">
                          {formatCurrency(detail.listTotal)}
                        </p>
                        <p className="font-display text-lg font-semibold tabular-nums">
                          {formatCurrency(protocol.packagePrice)}
                        </p>
                      </div>
                      {detail.discount > 0 && (
                        <Badge
                          variant="outline"
                          className="border-success/25 bg-success/10 text-[10px] text-success"
                        >
                          economiza {formatCurrency(detail.discount)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Timeline({ steps, compact }: { steps: ProtocolStep[]; compact?: boolean }) {
  if (steps.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
        Adicione ao menos uma etapa.
      </p>
    )
  }

  const ordered = [...steps].sort((a, b) => a.day - b.day)

  return (
    <div className="relative">
      <div aria-hidden className="absolute bottom-2 left-[13px] top-2 w-px bg-border" />
      <div className={cn("flex flex-col", compact ? "gap-2.5" : "gap-3.5")}>
        {ordered.map((step) => (
          <div key={step.id} className="relative flex items-start gap-3">
            <span className="z-10 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary ring-4 ring-card">
              {step.day}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{step.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Dia {step.day} · {formatCurrency(step.listPrice)} avulso
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string
  value: string
  muted?: boolean
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn("text-[12px]", muted ? "text-muted-foreground" : "text-foreground/80")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "font-display text-lg font-semibold" : "text-[13px] font-medium",
          muted && "text-muted-foreground line-through",
        )}
      >
        {value}
      </span>
    </div>
  )
}
