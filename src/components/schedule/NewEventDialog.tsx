import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CLINIC_TODAY } from "@/lib/clinic"
import { parseMoney } from "@/lib/money"
import { PatientPicker, type PickedPatient } from "@/components/schedule/PatientPicker"
import {
  eventKindLabel,
  useScheduleStore,
  type EventKind,
  type ScheduleEvent,
} from "@/stores/useScheduleStore"

interface Props {
  /** Quando informado, a janela edita/remarca este agendamento. */
  event?: ScheduleEvent | null
  defaultDate?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function NewEventDialog({ event, defaultDate, open: controlledOpen, onOpenChange, trigger }: Props) {
  const editing = Boolean(event)
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const setOpen = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    if (!isControlled) setInternalOpen(val)
  }

  const { addEvent, updateEvent, loading } = useScheduleStore()

  const [date, setDate] = useState(defaultDate || CLINIC_TODAY)
  const [time, setTime] = useState("09:00")
  const [durationMin, setDurationMin] = useState("45")
  const [kind, setKind] = useState<EventKind>("atendimento")
  const [patient, setPatient] = useState<PickedPatient | null>(null)
  const [customTitle, setCustomTitle] = useState("")
  const [professional, setProfessional] = useState("Dra. Ana Corso")
  const room = "Gabinete 01"
  const [value, setValue] = useState("")
  const [note, setNote] = useState("")

  // Ao abrir: na edição carrega o agendamento; na criação começa no dia
  // selecionado na agenda (antes ficava preso no primeiro dia aberto).
  useEffect(() => {
    if (!isOpen) return
    if (event) {
      setDate(event.date)
      setTime(event.time)
      setDurationMin(String(event.durationMin))
      setKind(event.kind)
      setPatient(event.patientName ? { id: event.patientId ?? null, name: event.patientName } : null)
      setCustomTitle(event.title === event.patientName ? "" : event.title)
      setProfessional(event.professional ?? "")
      setValue(
        event.value !== undefined
          ? event.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "",
      )
      setNote(event.auto ? "" : (event.note ?? ""))
    } else {
      setDate(defaultDate || CLINIC_TODAY)
    }
  }, [isOpen, defaultDate, event])

  const durationOptions = ["15", "30", "45", "60", "90", "120"]
  if (!durationOptions.includes(durationMin)) durationOptions.unshift(durationMin)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!patient && !customTitle.trim()) {
      toast.error("Selecione a paciente ou informe o título do compromisso.")
      return
    }
    const parsedValue = value.trim() ? parseMoney(value) : undefined
    if (parsedValue !== undefined && Number.isNaN(parsedValue)) {
      toast.error("Valor inválido. Ex.: 1.200,00")
      return
    }
    const title = customTitle.trim() || patient?.name || "Agendamento"

    const payload = {
      date: date || defaultDate || CLINIC_TODAY,
      time,
      durationMin: Number(durationMin) || 30,
      title,
      kind,
      patientId: patient?.id ?? undefined,
      patientName: patient?.name,
      professional,
      value: parsedValue,
      note: note.trim() || undefined,
    }

    const result = event
      ? await updateEvent(event.id, {
          ...payload,
          patientId: patient?.id ?? null,
          patientName: patient?.name ?? null,
          note: note.trim() || (event.auto ? event.note : undefined) || null,
        } as unknown as Partial<ScheduleEvent>)
      : await addEvent({ ...payload, status: "confirmado", room })

    if (result) {
      toast.success(editing ? "Agendamento atualizado!" : "Agendamento criado com sucesso!")
      setOpen(false)
      // Reset defaults
      setCustomTitle("")
      setNote("")
      setValue("")
      setPatient(null)
    } else {
      toast.error(editing ? "Não foi possível salvar as alterações." : "Não foi possível criar o agendamento.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {editing ? null : trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button size="sm" className="gap-2 rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]">
            <Plus className="size-4" /> Novo agendamento
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {editing ? "Editar / remarcar agendamento" : "Novo Agendamento"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editing
              ? "Altere data, horário ou dados do atendimento. O Google Agenda é atualizado junto."
              : "Preencha as informações para agendar na agenda da clínica."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Paciente */}
          <div className="space-y-1.5">
            <Label className="text-xs">Paciente *</Label>
            <PatientPicker value={patient} onChange={setPatient} />
          </div>

          {/* Título Personalizado */}
          <div className="space-y-1.5">
            <Label className="text-xs">Título / Descrição do compromisso</Label>
            <Input
              placeholder="Ex: Toxina Botulínica - Terço Superior"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Tipo e Duração */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Evento</Label>
              <Select value={kind} onValueChange={(val) => setKind(val as EventKind)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(eventKindLabel) as EventKind[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {eventKindLabel[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Duração (minutos)</Label>
              <Select value={durationMin} onValueChange={setDurationMin}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((minutes) => {
                    const m = Number(minutes)
                    const label = m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} hora${m > 60 ? "s" : ""}` : `${Math.floor(m / 60)}h ${m % 60}min`
                    return (
                      <SelectItem key={minutes} value={minutes}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Horário *</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Profissional e Sala */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Profissional</Label>
              <Input
                value={professional}
                onChange={(e) => setProfessional(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Valor R$ (Opcional)</Label>
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea
              placeholder="Notas adicionais sobre o atendimento..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-16 text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Salvando..." : editing ? "Salvar alterações" : "Salvar Agendamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
