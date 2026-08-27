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

const seedEvents: ScheduleEvent[] = [
  {
    id: "ev-s1",
    date: "2026-08-24",
    time: "08:30",
    durationMin: 45,
    title: "Toxina botulínica · terço superior",
    kind: "atendimento",
    status: "concluido",
    patientId: "p1",
    patientName: "Juliana Prado",
    professional: "Dra. Ana Corso",
    room: "Sala 1",
    value: 1800,
  },
  {
    id: "ev-s2",
    date: "2026-08-24",
    time: "09:45",
    durationMin: 60,
    title: "Preenchimento de lábios",
    kind: "atendimento",
    status: "confirmado",
    patientId: "p3",
    patientName: "Marina Bittencourt",
    professional: "Dra. Ana Corso",
    room: "Sala 2",
    value: 2400,
  },
  {
    id: "ev-s3",
    date: "2026-08-24",
    time: "11:15",
    durationMin: 75,
    title: "Bioestimulador de colágeno · face",
    kind: "atendimento",
    status: "confirmado",
    patientId: "p4",
    patientName: "Fernanda Rocha",
    professional: "Dra. Ana Corso",
    room: "Sala 1",
    value: 3200,
    note: "Primeira sessão do protocolo de 3",
  },
  {
    id: "ev-s4",
    date: "2026-08-24",
    time: "14:00",
    durationMin: 50,
    title: "Skinbooster · face e pescoço",
    kind: "atendimento",
    status: "confirmado",
    patientId: "p6",
    patientName: "Camila Duarte",
    professional: "Est. Marcela Reis",
    room: "Sala 2",
    value: 1600,
  },
  {
    id: "ev-s5",
    date: "2026-08-24",
    time: "15:30",
    durationMin: 40,
    title: "Avaliação facial completa",
    kind: "avaliacao",
    status: "aguardando",
    patientId: "p8",
    patientName: "Renata Nogueira",
    professional: "Dra. Ana Corso",
    room: "Sala 1",
    note: "Ainda não confirmou pelo WhatsApp",
  },
  {
    id: "ev-s6",
    date: "2026-08-24",
    time: "16:45",
    durationMin: 30,
    title: "Toxina botulínica · retoque",
    kind: "atendimento",
    status: "confirmado",
    patientId: "p9",
    patientName: "Patrícia Lemos",
    professional: "Dra. Ana Corso",
    room: "Sala 1",
    value: 600,
  },
  {
    id: "ev-s7",
    date: "2026-08-25",
    time: "09:00",
    durationMin: 60,
    title: "Preenchimento malar",
    kind: "atendimento",
    status: "confirmado",
    patientId: "p7",
    patientName: "Sofia Ribeiro",
    professional: "Dra. Ana Corso",
    room: "Sala 1",
    value: 3800,
  },
  {
    id: "ev-s8",
    date: "2026-08-25",
    time: "13:00",
    durationMin: 120,
    title: "Bloqueio · reunião de equipe",
    kind: "bloqueio",
    status: "confirmado",
    professional: "Equipe",
  },
  {
    id: "ev-s9",
    date: "2026-08-26",
    time: "10:00",
    durationMin: 45,
    title: "Retorno de 15 dias · toxina",
    kind: "retorno",
    status: "confirmado",
    patientId: "p2",
    patientName: "Beatriz Almeida",
    professional: "Dra. Ana Corso",
    room: "Sala 1",
  },
  {
    id: "ev-s10",
    date: "2026-08-27",
    time: "10:00",
    durationMin: 60,
    title: "Avaliação · bioestimulador + toxina",
    kind: "avaliacao",
    status: "confirmado",
    patientName: "Cláudia Ferrari",
    professional: "Dra. Ana Corso",
    room: "Sala 2",
  },
  {
    id: "ev-s11",
    date: "2026-08-28",
    time: "14:30",
    durationMin: 50,
    title: "Skinbooster · 3ª sessão",
    kind: "atendimento",
    status: "confirmado",
    patientId: "p10",
    patientName: "Helena Costa",
    professional: "Est. Marcela Reis",
    room: "Sala 2",
    value: 1400,
  },
  {
    id: "ev-s12",
    date: "2026-09-08",
    time: "11:00",
    durationMin: 30,
    title: "Retorno de 15 dias · toxina",
    kind: "retorno",
    status: "confirmado",
    patientId: "p1",
    patientName: "Juliana Prado",
    professional: "Dra. Ana Corso",
    room: "Sala 1",
  },
]

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
