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
  auto?: boolean
}

export const eventKindLabel: Record<EventKind, string> = {
  atendimento: "Atendimento",
  retorno: "Retorno clínico",
  avaliacao: "Avaliação",
  "contato-comercial": "Contato comercial",
  bloqueio: "Bloqueio",
}

const kindMapToDb: Record<EventKind, string> = {
  atendimento: "PROCEDURE",
  retorno: "RETURN",
  avaliacao: "EVALUATION",
  "contato-comercial": "COMMERCIAL_CONTACT",
  bloqueio: "BLOCK",
}

const kindMapToFrontend: Record<string, EventKind> = {
  PROCEDURE: "atendimento",
  RETURN: "retorno",
  EVALUATION: "avaliacao",
  COMMERCIAL_CONTACT: "contato-comercial",
  BLOCK: "bloqueio",
}

const statusMapToFrontend: Record<string, EventStatus> = {
  CONFIRMED: "confirmado",
  WAITING: "aguardando",
  COMPLETED: "concluido",
  CANCELLED: "cancelado",
}

type ScheduleState = {
  events: ScheduleEvent[]
  loading: boolean
  error: string | null

  fetchEvents: (from?: string, to?: string) => Promise<void>
  addEvent: (event: Omit<ScheduleEvent, "id">) => Promise<ScheduleEvent | null>
  updateEvent: (id: string, patch: Partial<ScheduleEvent>) => Promise<boolean>
  cancelEvent: (id: string) => Promise<boolean>
}

export function mapDbEventToFrontend(dbE: any): ScheduleEvent {
  const dt = new Date(dbE.startsAt)
  const year = dt.getFullYear()
  const month = String(dt.getMonth() + 1).padStart(2, "0")
  const day = String(dt.getDate()).padStart(2, "0")
  const dateStr = `${year}-${month}-${day}`

  const hours = String(dt.getHours()).padStart(2, "0")
  const minutes = String(dt.getMinutes()).padStart(2, "0")
  const timeStr = `${hours}:${minutes}`

  return {
    id: dbE.id,
    date: dateStr,
    time: timeStr,
    durationMin: dbE.durationMin || 30,
    title: dbE.title,
    kind: kindMapToFrontend[dbE.kind] || "atendimento",
    status: statusMapToFrontend[dbE.status] || "confirmado",
    patientId: dbE.patientId || undefined,
    patientName: dbE.patientName || undefined,
    professional: dbE.professionalName || undefined,
    room: dbE.room || undefined,
    value: dbE.value ? Number(dbE.value) : undefined,
    note: dbE.note || undefined,
    auto: dbE.auto || false,
  }
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async (from, to) => {
    set({ loading: true, error: null })
    try {
      const q = new URLSearchParams()
      if (from) q.append("from", from)
      if (to) q.append("to", to)

      const res = await fetch(`/api/schedule?${q.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.events || []).map(mapDbEventToFrontend)
        set({ events: mapped, loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  addEvent: async (event) => {
    set({ loading: true, error: null })
    try {
      const startsAt = new Date(`${event.date}T${event.time}:00`).toISOString()
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: event.title,
          kind: kindMapToDb[event.kind] || "PROCEDURE",
          startsAt,
          durationMin: event.durationMin,
          patientId: event.patientId || null,
          patientName: event.patientName || null,
          professionalName: event.professional || null,
          room: event.room || null,
          value: event.value || null,
          note: event.note || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        set({ loading: false, error: data.error?.message || "Erro ao agendar." })
        return null
      }

      const created = mapDbEventToFrontend(data.event)
      set((state) => ({
        events: [...state.events, created],
        loading: false,
      }))
      return created
    } catch (err: any) {
      set({ loading: false, error: err.message || "Erro de conexão." })
      return null
    }
  },

  updateEvent: async (id, patch) => {
    set({ loading: true })
    try {
      const payload: any = {}
      if (patch.title !== undefined) payload.title = patch.title
      if (patch.kind !== undefined) payload.kind = kindMapToDb[patch.kind]
      if (patch.status !== undefined) payload.status = patch.status.toUpperCase()
      if (patch.date && patch.time) {
        payload.startsAt = new Date(`${patch.date}T${patch.time}:00`).toISOString()
      }
      if (patch.durationMin !== undefined) payload.durationMin = patch.durationMin
      if (patch.patientId !== undefined) payload.patientId = patch.patientId
      if (patch.patientName !== undefined) payload.patientName = patch.patientName
      if (patch.professional !== undefined) payload.professionalName = patch.professional
      if (patch.room !== undefined) payload.room = patch.room
      if (patch.value !== undefined) payload.value = patch.value
      if (patch.note !== undefined) payload.note = patch.note

      const res = await fetch(`/api/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        set({ loading: false })
        return false
      }

      const data = await res.json()
      const updated = mapDbEventToFrontend(data.event)
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? updated : e)),
        loading: false,
      }))
      return true
    } catch {
      set({ loading: false })
      return false
    }
  },

  cancelEvent: async (id) => {
    try {
      const res = await fetch(`/api/schedule/${id}/cancel`, { method: "POST" })
      if (res.ok) {
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, status: "cancelado" } : e)),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },
}))

export function eventsOn(events: ScheduleEvent[], iso: string) {
  return events.filter((event) => event.date === iso).sort((a, b) => a.time.localeCompare(b.time))
}

export function eventsInMonth(events: ScheduleEvent[], yearMonth: string) {
  return events.filter((event) => event.date.slice(0, 7) === yearMonth)
}

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
