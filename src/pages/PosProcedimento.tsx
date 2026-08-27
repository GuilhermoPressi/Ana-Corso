import { useMemo, useState } from "react"
import {
  CalendarClock,
  Check,
  CheckCircle2,
  HeartPulse,
  RotateCcw,
  TriangleAlert,
} from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { railFor, type CarePoint } from "@/data/postCare"
import type { Patient, ProcedureRecord } from "@/data/patients"
import { addDays, CLINIC_TODAY } from "@/lib/clinic"
import { cn, formatDate, initials } from "@/lib/utils"
import { firstNameOf, templateById } from "@/lib/whatsapp"
import { usePatientStore } from "@/stores/usePatientStore"
import {
  logFor,
  outcomeLabel,
  usePostCareStore,
  type CareOutcome,
  type CareLog,
} from "@/stores/usePostCareStore"

type CareTask = {
  key: string
  patient: Patient
  procedure: ProcedureRecord
  point: CarePoint
  dueDate: string
  /** Negativo = atrasado, 0 = hoje, positivo = ainda vai vencer. */
  offset: number
  log?: CareLog
}

const columns = [
  {
    id: "atrasado",
    label: "Atrasados",
    hint: "Passou da data e ninguém falou com ela",
    tone: "border-destructive/25 bg-destructive/[0.04]",
    dot: "bg-destructive",
  },
  {
    id: "hoje",
    label: "Hoje",
    hint: "O contato é para agora",
    tone: "border-primary/30 bg-primary/[0.05]",
    dot: "bg-primary",
  },
  {
    id: "proximos",
    label: "Próximos 7 dias",
    hint: "Já entram na fila da semana",
    tone: "border-border/70 bg-muted/30",
    dot: "bg-[var(--chart-3)]",
  },
  {
    id: "concluido",
    label: "Concluídos",
    hint: "Contato registrado",
    tone: "border-success/25 bg-success/[0.04]",
    dot: "bg-success",
  },
] as const

type ColumnId = (typeof columns)[number]["id"]

function dayDiff(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  return Math.round(
    (new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86_400_000,
  )
}

export default function PosProcedimento() {
  const patients = usePatientStore((state) => state.patients)
  const logs = usePostCareStore((state) => state.logs)
  const register = usePostCareStore((state) => state.register)
  const undo = usePostCareStore((state) => state.undo)

  const [showAll, setShowAll] = useState(false)

  const tasks = useMemo<CareTask[]>(() => {
    const result: CareTask[] = []

    for (const patient of patients) {
      for (const procedure of patient.procedures) {
        // Só procedimentos recentes geram régua ativa.
        if (dayDiff(procedure.date, CLINIC_TODAY) > 45) continue

        for (const point of railFor(procedure.procedure)) {
          const dueDate = addDays(procedure.date, point.day)
          const key = `${patient.id}:${procedure.id}:${point.id}`
          result.push({
            key,
            patient,
            procedure,
            point,
            dueDate,
            offset: dayDiff(CLINIC_TODAY, dueDate),
            log: logFor(logs, key),
          })
        }
      }
    }

    return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [patients, logs])

  const grouped = useMemo(() => {
    const buckets: Record<ColumnId, CareTask[]> = {
      atrasado: [],
      hoje: [],
      proximos: [],
      concluido: [],
    }

    for (const task of tasks) {
      if (task.log) {
        buckets.concluido.push(task)
        continue
      }
      if (task.offset < 0) buckets.atrasado.push(task)
      else if (task.offset === 0) buckets.hoje.push(task)
      else if (task.offset <= 7) buckets.proximos.push(task)
      else if (showAll) buckets.proximos.push(task)
    }

    return buckets
  }, [tasks, showAll])

  const pending = grouped.atrasado.length + grouped.hoje.length

  function complete(task: CareTask, outcome: CareOutcome) {
    register({ key: task.key, patientId: task.patient.id, outcome })

    toast.success(`${firstNameOf(task.patient.name)} · ${outcomeLabel[outcome]}`, {
      description:
        outcome === "queixa"
          ? "Considere registrar uma intercorrência na ficha se o quadro exigir acompanhamento."
          : `Contato de ${task.point.label} registrado.`,
    })
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Pós-procedimento"
        description="A régua de contato de cada paciente, calculada a partir do que foi feito nela."
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowAll((current) => !current)}>
            <CalendarClock /> {showAll ? "Só os próximos 7 dias" : "Ver régua completa"}
          </Button>
        }
      />

      {/* Resumo */}
      <Card
        className={cn(
          "mb-5 gap-0 py-0 shadow-[var(--shadow-soft)]",
          pending > 0
            ? "border-primary/20 bg-gradient-to-br from-accent/70 via-card to-card"
            : "border-success/25 bg-success/[0.04]",
        )}
      >
        <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl",
              pending > 0 ? "bg-primary/12 text-primary" : "bg-success/12 text-success",
            )}
          >
            {pending > 0 ? <HeartPulse className="size-5" /> : <CheckCircle2 className="size-5" />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold">
              {pending > 0
                ? `${pending} ${pending === 1 ? "contato precisa" : "contatos precisam"} acontecer`
                : "Nenhum contato pendente"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {pending > 0
                ? `${grouped.atrasado.length} atrasados e ${grouped.hoje.length} para hoje. Um "como você está?" no dia certo evita a maioria das intercorrências virarem problema.`
                : "Todo mundo que passou por aqui já foi contatado no prazo."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Colunas */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => {
          const items = grouped[column.id]

          return (
            <div key={column.id} className="flex flex-col">
              <div className="mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", column.dot)} />
                  <p className="text-[13px] font-semibold">{column.label}</p>
                  <Badge
                    variant="secondary"
                    className="ml-auto h-5 rounded-full px-2 text-[10px] tabular-nums"
                  >
                    {items.length}
                  </Badge>
                </div>
                <p className="mt-1.5 pl-4 text-[11px] text-muted-foreground">{column.hint}</p>
              </div>

              <div
                className={cn(
                  "flex flex-1 flex-col gap-2.5 rounded-2xl border p-2.5",
                  column.tone,
                )}
              >
                {items.length === 0 && (
                  <p className="px-2 py-8 text-center text-[11px] leading-relaxed text-muted-foreground/70">
                    Nada aqui.
                  </p>
                )}

                {items.map((task) => (
                  <TaskCard
                    key={task.key}
                    task={task}
                    onComplete={(outcome) => complete(task, outcome)}
                    onUndo={() => undo(task.key)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  onComplete,
  onUndo,
}: {
  task: CareTask
  onComplete: (outcome: CareOutcome) => void
  onUndo: () => void
}) {
  const { patient, procedure, point, log } = task

  const message = templateById("pos-procedimento").build({
    firstName: firstNameOf(patient.name),
    procedure: procedure.procedure,
  })

  return (
    <Card className="gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]">
      <CardContent className="px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
              {initials(patient.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <Link
              to={`/pacientes/${patient.id}`}
              className="truncate text-[13px] font-semibold hover:text-primary hover:underline"
            >
              {patient.name}
            </Link>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {procedure.procedure} · {formatDate(procedure.date)}
            </p>
          </div>
        </div>

        <div className="mt-2.5 rounded-lg bg-muted/50 px-2.5 py-2">
          <p className="text-[11px] font-semibold text-foreground/80">{point.label}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{point.question}</p>
        </div>

        {point.watchFor && !log && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-warning/25 bg-warning/[0.07] px-2.5 py-1.5 text-[10px] leading-relaxed text-warning-foreground">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" />
            Atenção a: {point.watchFor}
          </p>
        )}

        {log ? (
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                log.outcome === "queixa"
                  ? "border-warning/30 bg-warning/12 text-warning-foreground"
                  : log.outcome === "sem-resposta"
                    ? "border-border bg-muted text-muted-foreground"
                    : "border-success/25 bg-success/10 text-success",
              )}
            >
              {outcomeLabel[log.outcome]} · {formatDate(log.date)}
            </Badge>

            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Desfazer registro"
              onClick={onUndo}
              className="text-muted-foreground"
            >
              <RotateCcw />
            </Button>
          </div>
        ) : (
          <div className="mt-2.5 flex items-center gap-1.5">
            <WhatsAppButton
              phone={patient.phone}
              message={message}
              label="Chamar"
              size="sm"
              className="flex-1"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Registrar contato">
                  <Check />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onComplete("tudo-bem")}>
                  <CheckCircle2 /> Tudo bem
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onComplete("queixa")}>
                  <TriangleAlert /> Relatou queixa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onComplete("sem-resposta")}>
                  Sem resposta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <p className="mt-2 text-[10px] tabular-nums text-muted-foreground">
          Previsto para {formatDate(task.dueDate)}
          {task.offset < 0 && !log && ` · ${Math.abs(task.offset)} dias de atraso`}
        </p>
      </CardContent>
    </Card>
  )
}
