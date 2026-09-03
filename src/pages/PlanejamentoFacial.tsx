import { useEffect, useMemo, useState } from "react"
import {
  Check,
  ChevronDown,
  CircleDot,
  Info,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Syringe,
  X,
} from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { FieldControl, type FieldValue } from "@/components/planning/FieldControl"
import { ProposalDialog } from "@/components/planning/ProposalDialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { planningLines, type PlanningField, type PlanningLine } from "@/data/facialPlanning"
import { usePatientStore } from "@/stores/usePatientStore"
import { cn, initials } from "@/lib/utils"

type RegionState = Record<string, FieldValue>
type PlanningState = Record<string, RegionState>

/** Chave única de uma região dentro de uma linha de trabalho. */
function keyOf(lineId: string, regionId: string) {
  return `${lineId}:${regionId}`
}

function fieldsFor(line: PlanningLine, regionId: string): PlanningField[] {
  const region = line.regions.find((item) => item.id === regionId)
  return [...line.fields, ...(region?.extraFields ?? [])]
}

function isFilled(value: FieldValue) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "string") return value.trim().length > 0
  return value !== undefined
}

export default function PlanejamentoFacial() {
  const { patients, loadPatients } = usePatientStore()
  const [patientId, setPatientId] = useState<string>("")
  const [activeLineId, setActiveLineId] = useState(planningLines[0].id)
  const [selected, setSelected] = useState<string[]>([keyOf("toxina", "frontal")])
  const [state, setState] = useState<PlanningState>({})
  const [expanded, setExpanded] = useState<string[]>([keyOf("toxina", "frontal")])

  useEffect(() => {
    if (!patients || patients.length === 0) {
      loadPatients()
    }
  }, [loadPatients, patients?.length])

  useEffect(() => {
    if (!patientId && patients && patients.length > 0) {
      setPatientId(patients[0].id)
    }
  }, [patients, patientId])

  const safePatients = patients || []
  const patient = safePatients.find((item) => item.id === patientId) ?? safePatients[0]
  const activeLine = planningLines.find((line) => line.id === activeLineId) ?? planningLines[0]

  const selectedInLine = selected.filter((key) => key.startsWith(`${activeLine.id}:`))

  /** Percentual dos campos essenciais já respondidos em todas as regiões selecionadas. */
  const completion = useMemo(() => {
    let required = 0
    let answered = 0

    for (const key of selected) {
      const [lineId, regionId] = key.split(":")
      const line = planningLines.find((item) => item.id === lineId)
      if (!line) continue

      for (const field of fieldsFor(line, regionId)) {
        if (!field.required) continue
        required += 1
        if (isFilled(state[key]?.[field.id])) answered += 1
      }
    }

    return { required, answered, percent: required === 0 ? 0 : Math.round((answered / required) * 100) }
  }, [selected, state])

  function toggleRegion(lineId: string, regionId: string) {
    const key = keyOf(lineId, regionId)
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
    setExpanded((current) => (current.includes(key) ? current : [...current, key]))
  }

  function removeRegion(key: string) {
    setSelected((current) => current.filter((item) => item !== key))
    setState((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function setValue(key: string, fieldId: string, value: FieldValue) {
    setState((current) => ({
      ...current,
      [key]: { ...current[key], [fieldId]: value },
    }))
  }

  function toggleExpanded(key: string) {
    setExpanded((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  function reset() {
    setSelected([])
    setState({})
    setExpanded([])
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Planejamento Facial"
        description="Avaliação guiada que organiza o seu raciocínio clínico região por região."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
              <RotateCcw /> Recomeçar
            </Button>
            <Button variant="outline" size="sm">
              <Save /> Salvar rascunho
            </Button>
            {patient && <ProposalDialog patient={patient} selected={selected} state={state} />}
          </>
        }
      />

      {/* Aviso de conduta */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-[12px] leading-relaxed text-foreground/80">
          <span className="font-semibold">Esta ferramenta não sugere dose, volume ou unidades.</span> Ela estrutura a
          sua avaliação para que a decisão técnica seja tomada por você, com todos os dados organizados em um só lugar.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-5">
          {/* Passo 1 — paciente */}
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <StepTitle step={1} title="Paciente avaliada" />
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger className="w-full max-w-sm bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {patient && (
                <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3.5 py-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                      {initials(patient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[12px] font-semibold">{patient.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {patient.skinType} · {patient.sessions} sessões no histórico
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passo 2 — linha de trabalho */}
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <StepTitle step={2} title="Linha de trabalho" />
              <CardDescription className="mt-1">
                Você pode avaliar mais de uma linha no mesmo planejamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {planningLines.map((line) => {
                const active = line.id === activeLine.id
                const count = selected.filter((key) => key.startsWith(`${line.id}:`)).length

                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => setActiveLineId(line.id)}
                    className={cn(
                      "relative rounded-xl border px-4 py-3.5 text-left transition-all",
                      active
                        ? "border-primary/40 bg-primary/[0.06] shadow-[0_10px_26px_-18px_hsl(335_78%_55%/0.9)]"
                        : "border-border/70 bg-card hover:border-primary/25 hover:bg-muted/35",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-lg",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Syringe className="size-3.5" />
                      </span>
                      <p className="text-[13px] font-semibold">{line.name}</p>
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-auto h-5 rounded-full px-1.5 text-[10px]">
                          {count}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{line.subtitle}</p>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Passo 3 — regiões */}
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <StepTitle step={3} title={`Regiões · ${activeLine.name}`} />
              <CardDescription className="mt-1">{activeLine.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {activeLine.regions.map((region) => {
                const key = keyOf(activeLine.id, region.id)
                const active = selected.includes(key)

                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => toggleRegion(activeLine.id, region.id)}
                    title={region.description}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-medium transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
                    )}
                  >
                    {active ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                    {region.name}
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Passo 4 — avaliação por região */}
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <StepTitle step={4} title="Avaliação estruturada" />
              <CardDescription className="mt-1">
                {selectedInLine.length === 0
                  ? "Selecione ao menos uma região acima para começar."
                  : selectedInLine.length === 1
                    ? "1 região em avaliação nesta linha."
                    : `${selectedInLine.length} regiões em avaliação nesta linha.`}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              {selectedInLine.length === 0 && (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
                  <div className="grid size-12 place-items-center rounded-2xl bg-accent">
                    <ListChecks className="size-5 text-primary" />
                  </div>
                  <p className="mt-4 font-display text-[15px] font-semibold">Nenhuma região selecionada</p>
                  <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
                    Escolha as regiões que você vai avaliar nesta consulta e os campos aparecem aqui.
                  </p>
                </div>
              )}

              {selectedInLine.map((key) => {
                const regionId = key.split(":")[1]
                const region = activeLine.regions.find((item) => item.id === regionId)
                if (!region) return null

                const fields = fieldsFor(activeLine, regionId)
                const requiredFields = fields.filter((field) => field.required)
                const answered = requiredFields.filter((field) => isFilled(state[key]?.[field.id])).length
                const complete = answered === requiredFields.length
                const open = expanded.includes(key)

                return (
                  <div key={key} className="overflow-hidden rounded-xl border border-border/70">
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 transition-colors",
                        complete ? "bg-success/[0.06]" : "bg-muted/30",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(key)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-lg",
                            complete ? "bg-success/15 text-success" : "bg-card text-muted-foreground",
                          )}
                        >
                          {complete ? <Check className="size-3.5" /> : <CircleDot className="size-3.5" />}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">{region.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{region.description}</p>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            "ml-auto shrink-0 text-[10px]",
                            complete
                              ? "border-success/25 bg-success/10 text-success"
                              : "border-border bg-card text-muted-foreground",
                          )}
                        >
                          {answered}/{requiredFields.length} essenciais
                        </Badge>

                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeRegion(key)}
                        aria-label={`Remover ${region.name}`}
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>

                    {open && (
                      <div className="flex flex-col gap-5 border-t border-border/70 bg-card px-4 py-5">
                        {fields.map((field) => (
                          <FieldControl
                            key={field.id}
                            field={field}
                            value={state[key]?.[field.id]}
                            onChange={(value) => setValue(key, field.id, value)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Resumo lateral */}
        <div className="xl:sticky xl:top-[88px] xl:h-fit">
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Sparkles className="size-4 text-primary" /> Resumo do raciocínio
              </CardTitle>
              <CardDescription className="mt-1">
                O que você registrou até aqui, pronto para virar plano e prontuário.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-xl bg-muted/40 px-4 py-3.5">
                <div className="flex items-baseline justify-between">
                  <p className="text-[12px] font-medium text-muted-foreground">Campos essenciais</p>
                  <p className="font-display text-[15px] font-semibold tabular-nums">
                    {completion.answered}/{completion.required}
                  </p>
                </div>
                <Progress value={completion.percent} className="mt-2.5 h-1.5" />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {completion.required === 0
                    ? "Selecione regiões para começar a avaliação."
                    : completion.percent === 100
                      ? "Avaliação completa. Você pode gerar o plano."
                      : completion.required - completion.answered === 1
                        ? "Falta 1 resposta essencial."
                        : `Faltam ${completion.required - completion.answered} respostas essenciais.`}
                </p>
              </div>

              {selected.length === 0 ? (
                <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
                  Nenhuma região em avaliação. Conforme você preenche, o resumo aparece aqui em linguagem clínica.
                </p>
              ) : (
                <div className="mt-5 flex flex-col gap-5">
                  {planningLines.map((line) => {
                    const keys = selected.filter((key) => key.startsWith(`${line.id}:`))
                    if (keys.length === 0) return null

                    return (
                      <div key={line.id}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                          {line.name}
                        </p>
                        <Separator className="my-2.5" />

                        <div className="flex flex-col gap-3.5">
                          {keys.map((key) => {
                            const regionId = key.split(":")[1]
                            const region = line.regions.find((item) => item.id === regionId)
                            if (!region) return null

                            const entries = fieldsFor(line, regionId)
                              .filter((field) => isFilled(state[key]?.[field.id]))
                              .map((field) => {
                                const value = state[key]?.[field.id]
                                const display = Array.isArray(value)
                                  ? value.join(", ")
                                  : typeof value === "number"
                                    ? `${value}/5`
                                    : String(value)
                                return { id: field.id, label: field.label, display }
                              })

                            return (
                              <div key={key}>
                                <p className="text-[13px] font-semibold">{region.name}</p>
                                {entries.length === 0 ? (
                                  <p className="mt-1 text-[12px] italic text-muted-foreground">
                                    Ainda sem registros.
                                  </p>
                                ) : (
                                  <ul className="mt-1.5 flex flex-col gap-1">
                                    {entries.map((entry) => (
                                      <li key={entry.id} className="flex gap-2 text-[12px] leading-relaxed">
                                        <span className="shrink-0 text-muted-foreground">{entry.label}:</span>
                                        <span className="min-w-0 font-medium">{entry.display}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="mt-6 border-t border-border/70 pt-4 text-[11px] leading-relaxed text-muted-foreground">
                O sistema organiza a avaliação e o histórico. Produto, técnica e quantidade permanecem sendo decisão
                clínica da profissional responsável.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StepTitle({ step, title }: { step: number; title: string }) {
  return (
    <CardTitle className="flex items-center gap-2.5 font-display text-base">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
        {step}
      </span>
      {title}
    </CardTitle>
  )
}
