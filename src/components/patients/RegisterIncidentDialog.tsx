import { useState } from "react"
import { LifeBuoy, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { incidentTypeById, incidentTypes } from "@/data/incidents"
import type { Patient } from "@/data/patients"
import { CLINIC_TODAY } from "@/lib/clinic"
import { cn, formatDate } from "@/lib/utils"
import { useIncidentStore } from "@/stores/useIncidentStore"

const severityStyles = {
  critica: "border-destructive/25 bg-destructive/10 text-destructive",
  alta: "border-warning/30 bg-warning/12 text-warning-foreground",
  moderada: "border-border bg-muted text-muted-foreground",
} as const

export function RegisterIncidentDialog({ patient }: { patient: Patient }) {
  const [open, setOpen] = useState(false)
  const [typeId, setTypeId] = useState(incidentTypes[0].id)
  const [date, setDate] = useState(CLINIC_TODAY)
  const [procedureId, setProcedureId] = useState(patient.procedures[0]?.id ?? "")
  const [report, setReport] = useState("")
  const [conducts, setConducts] = useState<string[]>([])
  const [touched, setTouched] = useState(false)

  const addIncident = useIncidentStore((state) => state.addIncident)
  const navigate = useNavigate()

  const type = incidentTypeById(typeId)
  const procedure = patient.procedures.find((item) => item.id === procedureId)
  const reportError = report.trim().length < 15

  function toggleConduct(item: string) {
    setConducts((current) =>
      current.includes(item) ? current.filter((c) => c !== item) : [...current, item],
    )
  }

  function submit() {
    setTouched(true)
    if (reportError) return

    addIncident({
      patientId: patient.id,
      patientName: patient.name,
      date,
      typeId,
      procedure: procedure?.procedure ?? patient.mainProcedure,
      product: procedure?.product,
      lot: procedure?.lot,
      report: report.trim(),
      conducts,
    })

    setOpen(false)
    setReport("")
    setConducts([])
    setTouched(false)

    toast.success("Intercorrência registrada", {
      description: `${type.label} · ${patient.name}. O caso entra na central para acompanhamento.`,
      action: { label: "Abrir central", onClick: () => navigate("/intercorrencias") },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTouched(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LifeBuoy /> Intercorrência
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar intercorrência</DialogTitle>
          <DialogDescription>
            O sistema não avalia o quadro — ele garante que o registro fique completo e datado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-[13px]">Tipo</Label>
              <Select
                value={typeId}
                onValueChange={(value) => {
                  setTypeId(value)
                  setConducts([])
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {type.description}
              </p>
            </div>

            <div>
              <Label htmlFor="ri-date" className="text-[13px]">
                Data da identificação
              </Label>
              <Input
                id="ri-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1.5"
              />
              <Badge
                variant="outline"
                className={cn("mt-2 text-[10px] capitalize", severityStyles[type.severity])}
              >
                gravidade {type.severity}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-[13px]">Procedimento relacionado</Label>
            <Select value={procedureId} onValueChange={setProcedureId}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Nenhum procedimento na ficha" />
              </SelectTrigger>
              <SelectContent>
                {patient.procedures.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.procedure} · {formatDate(item.date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {procedure && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {procedure.product}
                {procedure.lot ? ` · lote ${procedure.lot}` : ""} — produto e lote entram no registro.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="ri-report" className="text-[13px]">
              Relato
            </Label>
            <Textarea
              id="ri-report"
              value={report}
              onChange={(event) => setReport(event.target.value)}
              placeholder="O que a paciente relatou, o que você observou, quando começou, evolução até aqui..."
              aria-invalid={touched && reportError}
              className="mt-1.5 min-h-[110px] resize-y text-[13px]"
            />
            {touched && reportError && (
              <p className="mt-1.5 text-[11px] text-destructive">
                Descreva o quadro com pelo menos uma frase completa — este texto é o seu registro.
              </p>
            )}
          </div>

          <div>
            <Label className="text-[13px]">Condutas adotadas</Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Marque o que já foi feito. O que não for marcado fica fora do registro.
            </p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {type.conducts.map((item) => {
                const checked = conducts.includes(item)
                return (
                  <label
                    key={item}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                      checked
                        ? "border-primary/35 bg-primary/[0.06]"
                        : "border-border/70 bg-card hover:bg-muted/40",
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleConduct(item)} />
                    <span className="text-[12px] leading-snug">{item}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-[12px] leading-relaxed text-foreground/80">
              O registro guarda data, procedimento, produto, lote, relato e condutas. A partir daí, cada
              evolução entra na linha do tempo do caso — é isso que sustenta a sua conduta se um dia for
              preciso comprová-la.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} className="rounded-full">
            <LifeBuoy /> Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
