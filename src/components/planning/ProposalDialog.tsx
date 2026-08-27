import { useMemo, useState } from "react"
import { FileHeart, Printer, Send, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { planningLines, type PlanningLine } from "@/data/facialPlanning"
import type { Patient } from "@/data/patients"
import { CLINIC_TODAY } from "@/lib/clinic"
import { parseDecimal } from "@/lib/number"
import { cn, formatCurrency, formatDateLong } from "@/lib/utils"
import { buildWhatsAppLink, CLINIC_NAME, firstNameOf, templateById } from "@/lib/whatsapp"
import {
  fallbackListPrice,
  summarizeProtocol,
  useCatalogStore,
} from "@/stores/useCatalogStore"
import { useFinanceStore } from "@/stores/useFinanceStore"
import { usePatientStore } from "@/stores/usePatientStore"

type FieldValue = string | number | string[] | undefined
type PlanningState = Record<string, Record<string, FieldValue>>

export type ProposalDialogProps = {
  patient: Patient
  /** Chaves "linha:regiao" selecionadas na avaliação. */
  selected: string[]
  state: PlanningState
}

/** Traduz o objetivo clínico para o que a paciente entende. */
const objectiveWording: Record<string, string> = {
  "Suavizar movimento": "suavizar as linhas de expressão mantendo o movimento natural",
  "Bloquear movimento": "reduzir bem o movimento na região",
  "Elevar/reposicionar": "elevar e reposicionar a região",
  "Corrigir assimetria": "equilibrar os dois lados",
  "Repor volume": "repor o volume perdido",
  Projetar: "dar mais projeção",
  "Definir contorno": "definir o contorno",
  "Hidratar e melhorar textura": "hidratar e melhorar a textura da pele",
  "Melhorar firmeza": "devolver firmeza",
  "Melhorar qualidade da pele": "melhorar a qualidade da pele",
  "Sustentar contorno": "sustentar o contorno",
  Prevenção: "prevenir a flacidez",
}

export function ProposalDialog({ patient, selected, state }: ProposalDialogProps) {
  const [open, setOpen] = useState(false)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [note, setNote] = useState(
    "Investimento parcelável em até 6x sem juros. Valores válidos por 15 dias.",
  )

  const pricedProcedures = useFinanceStore((state) => state.procedures)
  const protocols = useCatalogStore((store) => store.protocols)
  const addProposal = useCatalogStore((store) => store.addProposal)
  const addLead = usePatientStore((store) => store.addLead)
  const navigate = useNavigate()

  const [protocolId, setProtocolId] = useState<string | null>(null)
  const protocol = protocols.find((item) => item.id === protocolId)

  function priceFor(line: PlanningLine) {
    const match = pricedProcedures.find((item) =>
      item.name.toLowerCase().includes(line.name.toLowerCase()),
    )
    return match?.price ?? fallbackListPrice[line.name] ?? 0
  }

  /** Uma etapa por linha de trabalho, com as regiões e o objetivo registrados. */
  const items = useMemo(() => {
    return planningLines
      .map((line) => {
        const keys = selected.filter((key) => key.startsWith(`${line.id}:`))
        if (keys.length === 0) return null

        const regions = keys
          .map((key) => line.regions.find((region) => region.id === key.split(":")[1])?.name)
          .filter((name): name is string => Boolean(name))

        const objectives = keys
          .map((key) => {
            const raw = state[key]?.objetivo
            return typeof raw === "string" ? objectiveWording[raw] ?? raw.toLowerCase() : null
          })
          .filter((value): value is string => Boolean(value))

        const unique = [...new Set(objectives)]

        return {
          id: line.id,
          label: line.name,
          detail: regions.join(", "),
          rationale:
            unique.length > 0
              ? `Objetivo: ${unique.join("; ")}.`
              : "Objetivo a alinhar na próxima conversa.",
          defaultValue: priceFor(line),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, state, pricedProcedures])

  const resolvedItems = items.map((item) => {
    const raw = prices[item.id]
    const value = raw === undefined ? item.defaultValue : Math.max(parseDecimal(raw) || 0, 0)
    return { ...item, value }
  })

  const itemsTotal = resolvedItems.reduce((sum, item) => sum + item.value, 0)
  const protocolTotal = protocol?.packagePrice ?? 0
  const total = itemsTotal + protocolTotal

  const listTotal =
    resolvedItems.reduce((sum, item) => sum + item.value, 0) +
    (protocol ? summarizeProtocol(protocol).listTotal : 0)
  const savings = listTotal - total

  function send() {
    const proposalItems = [
      ...resolvedItems.map((item) => ({
        id: item.id,
        label: item.label,
        detail: item.detail,
        value: item.value,
      })),
      ...(protocol
        ? [
            {
              id: protocol.id,
              label: protocol.name,
              detail: `${protocol.steps.length} sessões em ${summarizeProtocol(protocol).durationDays} dias`,
              value: protocol.packagePrice,
            },
          ]
        : []),
    ]

    addProposal({
      patientId: patient.id,
      patientName: patient.name,
      title: `Plano de tratamento · ${patient.name}`,
      items: proposalItems,
      total,
      note,
      status: "enviada",
    })

    addLead({
      name: patient.name,
      phone: patient.phone,
      interest: resolvedItems.map((item) => item.label).join(" + ") || "Plano de tratamento",
      source: patient.origin,
      value: total,
      note: `Proposta enviada em ${formatDateLong(CLINIC_TODAY)} a partir do planejamento facial.`,
    })

    setOpen(false)

    toast.success("Proposta registrada no CRM", {
      description: `${formatCurrency(total)} em Novos contatos. Mova para Proposta enviada quando confirmar o envio.`,
      action: { label: "Abrir CRM", onClick: () => navigate("/crm") },
    })
  }

  const whatsappLink = buildWhatsAppLink(
    patient.phone,
    templateById("proposta").build({ firstName: firstNameOf(patient.name), value: total }),
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={selected.length === 0}
          className="rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]"
        >
          <FileHeart /> Gerar proposta
        </Button>
      </DialogTrigger>

      <DialogContent
        data-print-root
        className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-3xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Proposta de tratamento para {patient.name}</DialogTitle>
          <DialogDescription>
            Documento com as etapas do plano e o investimento, pronto para enviar.
          </DialogDescription>
        </DialogHeader>

        {/* Documento */}
        <div className="relative isolate">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(70%_100%_at_50%_0%,hsl(335_78%_65%/0.12),transparent)]"
          />

          <div className="px-7 pt-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-[hsl(316_70%_72%)]">
                  <svg viewBox="0 0 32 32" className="size-6" fill="none" aria-hidden="true">
                    <path
                      d="M16 7c2.4 2.2 3.6 4.4 3.6 6.6 0 1.6-.7 2.9-2 4 2.3.3 3.9 1 4.9 2.1 1 1.1 1.5 2.4 1.5 3.9-2.9 0-5.1-.6-6.5-1.8-.6-.5-1.1-1.1-1.5-1.8-.4.7-.9 1.3-1.5 1.8-1.4 1.2-3.6 1.8-6.5 1.8 0-1.5.5-2.8 1.5-3.9 1-1.1 2.6-1.8 4.9-2.1-1.3-1.1-2-2.4-2-4C12.4 11.4 13.6 9.2 16 7Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-display text-[15px] font-semibold">{CLINIC_NAME}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {patient.professional} · Porto Alegre · RS
                  </p>
                </div>
              </div>

              <div className="text-right">
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  Plano personalizado
                </Badge>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {formatDateLong(CLINIC_TODAY)}
                </p>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Preparado para
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
                {patient.name}
              </h2>
              <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
                Este plano nasceu da avaliação que fizemos juntas. Cada etapa tem um porquê — e o
                resultado aparece de forma gradual, respeitando o seu rosto.
              </p>
            </div>
          </div>

          <Separator className="mt-7" />

          {/* Etapas */}
          <div className="px-7 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              O que vamos fazer
            </p>

            <div className="mt-4 flex flex-col gap-3">
              {resolvedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start gap-4 rounded-xl border border-border/70 px-4 py-3.5"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{item.label}</p>
                    {item.detail && (
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{item.detail}</p>
                    )}
                    <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/70">
                      {item.rationale}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <div data-print-hide>
                      <div className="relative w-[124px]">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-muted-foreground">
                          R$
                        </span>
                        <Input
                          aria-label={`Investimento de ${item.label}`}
                          inputMode="decimal"
                          value={prices[item.id] ?? String(item.defaultValue)}
                          onChange={(event) =>
                            setPrices((current) => ({ ...current, [item.id]: event.target.value }))
                          }
                          className="h-8 bg-card pl-8 text-right text-[13px] font-semibold tabular-nums"
                        />
                      </div>
                    </div>
                    <p className="hidden font-display text-[15px] font-semibold tabular-nums print:block">
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                </div>
              ))}

              {protocol && (
                <div className="flex flex-wrap items-start gap-4 rounded-xl border border-primary/25 bg-primary/[0.04] px-4 py-3.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{protocol.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{protocol.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[...protocol.steps]
                        .sort((a, b) => a.day - b.day)
                        .map((step) => (
                          <Badge key={step.id} variant="outline" className="rounded-full text-[10px]">
                            Dia {step.day} · {step.label}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <p className="shrink-0 font-display text-[15px] font-semibold tabular-nums">
                    {formatCurrency(protocol.packagePrice)}
                  </p>
                </div>
              )}
            </div>

            {/* Anexar protocolo */}
            {protocols.length > 0 && (
              <div data-print-hide className="mt-4">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Anexar um protocolo da clínica
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {protocols.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProtocolId((current) => (current === item.id ? null : item.id))}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                        protocolId === item.id
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
                      )}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Investimento */}
          <div className="px-7 py-6">
            <div className="rounded-2xl bg-gradient-to-br from-accent/70 via-card to-card px-5 py-5 ring-1 ring-primary/15">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Investimento total
                  </p>
                  <p className="mt-1.5 font-display text-3xl font-semibold tabular-nums">
                    {formatCurrency(total)}
                  </p>
                </div>

                {savings > 0 && (
                  <Badge
                    variant="outline"
                    className="border-success/25 bg-success/10 text-[11px] text-success"
                  >
                    economia de {formatCurrency(savings)}
                  </Badge>
                )}
              </div>

              <div data-print-hide className="mt-4">
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-[64px] resize-y bg-card/70 text-[12px]"
                />
              </div>
              <p className="mt-3 hidden text-[12px] leading-relaxed text-muted-foreground print:block">
                {note}
              </p>
            </div>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
              Qualquer dúvida, me chama. Estou aqui para cuidar de você. — {patient.professional}
            </p>
          </div>
        </div>

        <DialogFooter data-print-hide className="gap-2 border-t border-border/70 px-7 py-4 sm:justify-between">
          <Button variant="ghost" onClick={() => window.print()} className="text-muted-foreground">
            <Printer /> Imprimir ou salvar PDF
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                Enviar por WhatsApp
              </a>
            </Button>
            <Button onClick={send} className="rounded-full">
              <Send /> Enviar proposta
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
