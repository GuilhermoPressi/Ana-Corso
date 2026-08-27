import { useMemo, useState } from "react"
import {
  CheckCircle2,
  ClipboardCheck,
  LifeBuoy,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { incidentTypeById } from "@/data/incidents"
import { cn, formatDate, formatDateLong, initials } from "@/lib/utils"
import {
  incidentStatusLabel,
  useIncidentStore,
  type Incident,
  type IncidentStatus,
} from "@/stores/useIncidentStore"

const statusStyles: Record<IncidentStatus, string> = {
  aberto: "border-destructive/25 bg-destructive/10 text-destructive",
  acompanhando: "border-warning/30 bg-warning/12 text-warning-foreground",
  resolvido: "border-success/25 bg-success/10 text-success",
}

const severityStyles = {
  critica: "border-destructive/25 bg-destructive/10 text-destructive",
  alta: "border-warning/30 bg-warning/12 text-warning-foreground",
  moderada: "border-border bg-muted text-muted-foreground",
} as const

const filters: { id: "abertos" | "todos" | IncidentStatus; label: string }[] = [
  { id: "abertos", label: "Em acompanhamento" },
  { id: "resolvido", label: "Resolvidos" },
  { id: "todos", label: "Todos" },
]

export default function Intercorrencias() {
  const incidents = useIncidentStore((state) => state.incidents)
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("abertos")

  const visible = useMemo(() => {
    const list =
      filter === "todos"
        ? incidents
        : filter === "abertos"
          ? incidents.filter((item) => item.status !== "resolvido")
          : incidents.filter((item) => item.status === filter)

    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [incidents, filter])

  const counts = useMemo(
    () => ({
      abertas: incidents.filter((item) => item.status !== "resolvido").length,
      criticas: incidents.filter(
        (item) => item.status !== "resolvido" && incidentTypeById(item.typeId).severity === "critica",
      ).length,
      total: incidents.length,
    }),
    [incidents],
  )

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Central de Intercorrências"
        description="Todo caso registrado, datado e com as condutas que você adotou."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/pacientes">
              <Plus /> Registrar pela ficha
            </Link>
          </Button>
        }
      />

      <Card
        className={cn(
          "mb-5 gap-0 py-0 shadow-[var(--shadow-soft)]",
          counts.abertas > 0
            ? "border-border/70"
            : "border-success/25 bg-success/[0.04]",
        )}
      >
        <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl",
              counts.abertas > 0 ? "bg-primary/12 text-primary" : "bg-success/12 text-success",
            )}
          >
            {counts.abertas > 0 ? <LifeBuoy className="size-5" /> : <ShieldCheck className="size-5" />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold">
              {counts.abertas > 0
                ? `${counts.abertas} ${counts.abertas === 1 ? "caso em acompanhamento" : "casos em acompanhamento"}`
                : "Nenhum caso em aberto"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {counts.criticas > 0
                ? `${counts.criticas} de gravidade crítica ${
                    counts.criticas === 1 ? "exige" : "exigem"
                  } contato diário.`
                : `${counts.total} ${counts.total === 1 ? "registro" : "registros"} no histórico da clínica.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  filter === item.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-success/10">
              <ShieldCheck className="size-5 text-success" />
            </div>
            <p className="mt-4 font-display text-[15px] font-semibold">Nada por aqui</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
              Registre uma intercorrência pela ficha da paciente para acompanhá-la nesta central.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  )
}

function IncidentCard({ incident }: { incident: Incident }) {
  const addEntry = useIncidentStore((state) => state.addEntry)
  const setStatus = useIncidentStore((state) => state.setStatus)
  const removeIncident = useIncidentStore((state) => state.removeIncident)

  const [note, setNote] = useState("")
  const type = incidentTypeById(incident.typeId)

  function submitEntry() {
    if (note.trim().length < 5) return
    addEntry(incident.id, note.trim(), "Dra. Ana Corso")
    setNote("")
    toast.success("Evolução registrada")
  }

  return (
    <Card className="gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]">
      <CardContent className="px-5 py-5">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                {initials(incident.patientName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[15px] font-semibold">{type.label}</h3>
                <Badge variant="outline" className={cn("text-[10px]", statusStyles[incident.status])}>
                  {incidentStatusLabel[incident.status]}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] capitalize", severityStyles[type.severity])}
                >
                  {type.severity}
                </Badge>
              </div>

              <p className="mt-1 text-[12px] text-muted-foreground">
                <Link
                  to={`/pacientes/${incident.patientId}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {incident.patientName}
                </Link>{" "}
                · {formatDateLong(incident.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {incident.status !== "resolvido" ? (
              <>
                {incident.status === "aberto" && (
                  <Button variant="outline" size="sm" onClick={() => setStatus(incident.id, "acompanhando")}>
                    Acompanhar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatus(incident.id, "resolvido")
                    toast.success("Caso marcado como resolvido")
                  }}
                >
                  <CheckCircle2 /> Resolver
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setStatus(incident.id, "acompanhando")}>
                Reabrir
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remover registro"
              onClick={() => removeIncident(incident.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        {/* Contexto clínico */}
        <div className="mt-4 grid gap-3 rounded-xl bg-muted/35 px-4 py-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Procedimento</p>
            <p className="mt-0.5 text-[12px] font-medium">{incident.procedure}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Produto</p>
            <p className="mt-0.5 text-[12px] font-medium">{incident.product ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Lote</p>
            <p className="mt-0.5 text-[12px] font-medium tabular-nums">{incident.lot ?? "—"}</p>
          </div>
        </div>

        <p className="mt-4 border-l-2 border-primary/30 pl-3 text-[13px] leading-relaxed text-foreground/80">
          {incident.report}
        </p>

        {/* Condutas */}
        {incident.conducts.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <ClipboardCheck className="size-3" /> Condutas adotadas
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {incident.conducts.map((conduct) => (
                <Badge
                  key={conduct}
                  variant="outline"
                  className="border-success/25 bg-success/[0.07] text-[10px] text-success"
                >
                  <CheckCircle2 className="size-2.5" /> {conduct}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Linha do tempo */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Evolução
        </p>

        <div className="relative mt-3">
          <div aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
          <div className="flex flex-col gap-3.5">
            {incident.timeline.map((entry) => (
              <div key={entry.id} className="relative flex gap-3">
                <span className="z-10 mt-1 size-3.5 shrink-0 rounded-full bg-primary/15 ring-4 ring-card">
                  <span className="block size-full scale-50 rounded-full bg-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[11px] font-semibold tabular-nums">
                      {formatDate(entry.date)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{entry.author}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/80">{entry.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {incident.status !== "resolvido" && (
          <div className="mt-4">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Registrar nova evolução: o que observou hoje, o que orientou..."
              className="min-h-[68px] resize-y bg-card text-[13px]"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={submitEntry} disabled={note.trim().length < 5}>
                <Plus /> Adicionar evolução
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
