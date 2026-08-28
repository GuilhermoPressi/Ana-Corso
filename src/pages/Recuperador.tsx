import { useEffect, useMemo, useState } from "react"
import { ExternalLink, Megaphone, Sparkles, TrendingUp, UserRoundPlus } from "lucide-react"
import { Link } from "react-router-dom"

import { PageHeader } from "@/components/layout/PageHeader"
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buildSegments, type RecoveryTarget, type SegmentId } from "@/lib/recovery"
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils"
import { buildWhatsAppLink, firstNameOf, templateById } from "@/lib/whatsapp"
import { usePatientStore } from "@/stores/usePatientStore"

const segmentAccent: Record<SegmentId, string> = {
  "toxina-vencendo": "bg-[var(--chart-1)]",
  "sem-atendimento": "bg-[var(--chart-3)]",
  "retorno-pendente": "bg-[var(--chart-4)]",
  "orcamento-parado": "bg-[var(--chart-5)]",
}

function varsFor(target: RecoveryTarget) {
  return {
    firstName: firstNameOf(target.name),
    procedure: target.procedure,
    lastVisit: target.lastActivity,
    monthsSince: target.monthsSince,
    value: target.potential,
  }
}

export default function Recuperador() {
  const patients = usePatientStore((state) => state.patients)
  const leads = usePatientStore((state) => state.leads)
  const loadPatients = usePatientStore((state) => state.loadPatients)
  const fetchLeads = usePatientStore((state) => state.fetchLeads)

  useEffect(() => {
    loadPatients()
    fetchLeads()
  }, [loadPatients, fetchLeads])

  const [inactivityMonths, setInactivityMonths] = useState(6)
  const [toxinaMonths, setToxinaMonths] = useState(4)
  const [active, setActive] = useState<SegmentId>("toxina-vencendo")

  const segments = useMemo(
    () => buildSegments(patients, leads, inactivityMonths, toxinaMonths),
    [patients, leads, inactivityMonths, toxinaMonths],
  )

  const current = segments.find((segment) => segment.id === active) ?? segments[0]
  const totalPotential = segments.reduce((sum, segment) => sum + segment.potential, 0)

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Recuperador de Pacientes"
        description="Quem já confiou em você e está prestes a escapar — com o motivo do contato pronto."
        actions={<CampaignDialog segmentLabel={current.label} targets={current.targets} />}
      />

      {/* Potencial total */}
      <Card className="mb-5 gap-0 overflow-hidden border-primary/15 bg-gradient-to-br from-accent/70 via-card to-card py-0 shadow-[var(--shadow-soft)]">
        <CardContent className="flex flex-wrap items-center gap-5 px-5 py-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
            <TrendingUp className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-muted-foreground">Potencial esquecido</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-primary">
              {formatCurrency(totalPotential)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Somando as quatro listas. É o que essas pacientes deixariam se todas voltassem uma vez.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="mb-1.5 text-[11px] text-muted-foreground">Considerar inativa após</p>
              <Select
                value={String(inactivityMonths)}
                onValueChange={(value) => setInactivityMonths(Number(value))}
              >
                <SelectTrigger size="sm" className="w-[130px] bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 6, 9, 12].map((months) => (
                    <SelectItem key={months} value={String(months)}>
                      {months} meses
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] text-muted-foreground">Toxina vence em</p>
              <Select value={String(toxinaMonths)} onValueChange={(value) => setToxinaMonths(Number(value))}>
                <SelectTrigger size="sm" className="w-[130px] bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6].map((months) => (
                    <SelectItem key={months} value={String(months)}>
                      {months} meses
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segmentos */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {segments.map((segment) => {
          const selected = segment.id === active
          return (
            <button key={segment.id} onClick={() => setActive(segment.id)} className="text-left">
              <Card
                className={cn(
                  "h-full gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5",
                  selected && "border-primary/40 ring-1 ring-primary/20",
                )}
              >
                <CardContent className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", segmentAccent[segment.id])} />
                    <p className="text-[12px] font-medium text-muted-foreground">{segment.label}</p>
                  </div>
                  <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">
                    {segment.targets.length}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {segment.description}
                  </p>
                  <p className="mt-2 text-[11px] font-medium tabular-nums text-primary">
                    {formatCurrency(segment.potential)} em jogo
                  </p>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      {/* Lista do segmento ativo */}
      <Card className="border-border/70 shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-base">
              {current.targets.length}{" "}
              {current.targets.length === 1 ? "paciente" : "pacientes"} · {current.label}
            </CardTitle>
            <CardDescription className="mt-1">{current.description}</CardDescription>
          </div>
          <Badge variant="secondary" className="rounded-full text-[11px] tabular-nums">
            {formatCurrency(current.potential)} em jogo
          </Badge>
        </CardHeader>

        <CardContent className="flex flex-col gap-2">
          {current.targets.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-success/10">
                <Sparkles className="size-5 text-success" />
              </div>
              <p className="mt-4 font-display text-[15px] font-semibold">Lista vazia — e isso é ótimo</p>
              <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
                Nenhuma paciente se encaixa neste filtro agora.
              </p>
            </div>
          )}

          {current.targets.map((target) => (
            <div
              key={target.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 px-3.5 py-3 transition-colors hover:bg-muted/40"
            >
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                  {initials(target.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                {target.patientId ? (
                  <Link
                    to={`/pacientes/${target.patientId}`}
                    className="text-[13px] font-semibold hover:text-primary hover:underline"
                  >
                    {target.name}
                  </Link>
                ) : (
                  <p className="text-[13px] font-semibold">{target.name}</p>
                )}
                <p className="mt-0.5 text-[12px] text-muted-foreground">{target.detail}</p>
              </div>

              <Badge variant="outline" className="shrink-0 text-[10px]">
                {target.reason}
              </Badge>

              <div className="shrink-0 text-right">
                <p className="text-[13px] font-semibold tabular-nums">
                  {formatCurrency(target.potential)}
                </p>
                <p className="text-[10px] text-muted-foreground">ticket estimado</p>
              </div>

              <WhatsAppButton
                phone={target.phone}
                message={templateById(target.template).build(varsFor(target))}
                label="Chamar"
                className="shrink-0"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function CampaignDialog({
  segmentLabel,
  targets,
}: {
  segmentLabel: string
  targets: RecoveryTarget[]
}) {
  const [open, setOpen] = useState(false)

  const messages = useMemo(
    () =>
      targets.map((target) => {
        const text = templateById(target.template).build(varsFor(target))
        return { target, text, link: buildWhatsAppLink(target.phone, text) }
      }),
    [targets],
  )

  const potential = targets.reduce((sum, target) => sum + target.potential, 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={targets.length === 0}
          className="rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]"
        >
          <Megaphone /> Criar campanha
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Campanha · {segmentLabel}</DialogTitle>
          <DialogDescription>
            Uma mensagem escrita para cada paciente, com o motivo dela. Revise antes de abrir cada conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-muted/40 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[12px] font-medium text-muted-foreground">
              {targets.length} {targets.length === 1 ? "mensagem" : "mensagens"} na fila
            </p>
            <p className="font-display text-[15px] font-semibold tabular-nums text-primary">
              {formatCurrency(potential)} em jogo
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 py-1">
          {messages.map(({ target, text, link }) => (
            <div key={target.id} className="rounded-xl border border-border/70 px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                      {initials(target.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[13px] font-semibold">{target.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {target.reason} · {formatDate(target.lastActivity)}
                    </p>
                  </div>
                </div>

                <Button asChild size="sm" variant="outline">
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> Abrir
                  </a>
                </Button>
              </div>

              <p className="mt-2.5 rounded-lg bg-muted/50 px-3 py-2 text-[12px] leading-relaxed text-foreground/80">
                {text}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/crm">
              <UserRoundPlus /> Acompanhar no CRM
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
