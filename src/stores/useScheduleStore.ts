import { create } from "zustand"

import { CLINIC_TODAY } from "@/lib/clinic"

export type EventKind = "atendimento" | "retorno" | "avaliacao" | "contato-comercial" | "bloqueio"

export type EventStatus = "confirmado" | "aguardando" | "concluido" | "cancelado"

export type ScheduleEvent = {
  id: string
  date: string
  time: string
  durationMin: number
  title: string
  kind: EventKind
  status: EventStatus
  patientId?: string
  patientName?: string
  professional?: string
  room?: string
  value?: number
  note?: string
  /** Criado pela automação de pós-procedimento, não pela recepção. */
  auto?: boolean
}

export const eventKindLabel: Record<EventKind, string> = {
  atendimento: "Atendimento",
  retorno: "Retorno clínico",
  avaliacao: "Avaliação",
  "contato-comercial": "Contato comercial",
  bloqueio: "Bloqueio",
}

type ScheduleState = {
  events: ScheduleEvent[]
  addEvent: (event: Omit<ScheduleEvent, "id">) => ScheduleEvent
  updateEvent: (id: string, patch: Partial<ScheduleEvent>) => void
  removeEvent: (id: string) => void
}



let sequence = 0
const nextId = () => `ev-${(sequence += 1)}`

export const useScheduleStore = create<ScheduleState>((set) => ({
  events: [],


  addEvent: (event) => {
    const created: ScheduleEvent = { ...event, id: nextId() }
    set((state) => ({ events: [...state.events, created] }))
    return created
  },

  updateEvent: (id, patch) =>
    set((state) => ({
      events: state.events.map((event) => (event.id === id ? { ...event, ...patch } : event)),
    })),

  removeEvent: (id) => set((state) => ({ events: state.events.filter((event) => event.id !== id) })),
}))



/* ------------------------------------------------------------------ *
 * Seletores derivados
 * ------------------------------------------------------------------ */

export function eventsOn(events: ScheduleEvent[], iso: string) {
  return events.filter((event) => event.date === iso).sort((a, b) => a.time.localeCompare(b.time))
}

export function eventsInMonth(events: ScheduleEvent[], yearMonth: string) {
  return events.filter((event) => event.date.slice(0, 7) === yearMonth)
}

/** Horas ocupadas no dia, para medir a taxa de ocupação. */
export function occupiedHours(events: ScheduleEvent[], iso: string) {
  return eventsOn(events, iso)
    .filter((event) => event.status !== "cancelado")
    .reduce((sum, event) => sum + event.durationMin, 0) / 60
}

export function upcomingEvents(events: ScheduleEvent[], fromIso = CLINIC_TODAY, limit = 5) {
  return events
    .filter((event) => event.date >= fromIso && event.status !== "concluido")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, limit)
}
