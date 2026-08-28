import { create } from "zustand"

import { CLINIC_TODAY } from "@/lib/clinic"

export type IncidentStatus = "aberto" | "acompanhando" | "resolvido"

export const incidentStatusLabel: Record<IncidentStatus, string> = {
  aberto: "Em aberto",
  acompanhando: "Em acompanhamento",
  resolvido: "Resolvido",
}

export type IncidentEntry = {
  id: string
  date: string
  note: string
  author: string
}

export type Incident = {
  id: string
  patientId: string
  patientName: string
  date: string
  typeId: string
  procedure: string
  product?: string
  lot?: string
  report: string
  conducts: string[]
  status: IncidentStatus
  timeline: IncidentEntry[]
  createdAt: string
}

type IncidentState = {
  incidents: Incident[]
  loading: boolean
  error: string | null

  fetchIncidents: (patientId?: string) => Promise<void>
  addIncident: (input: {
    patientId: string
    procedureRecordId?: string
    type: string
    severity?: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
    report: string
    identifiedAt?: string
  }) => Promise<Incident | null>
  addEntry: (incidentId: string, note: string) => Promise<boolean>
  setStatus: (incidentId: string, status: IncidentStatus) => Promise<boolean>
  removeIncident: (incidentId: string) => Promise<boolean>
}

export function mapDbIncidentToFrontend(dbI: any): Incident {
  const statusMap: Record<string, IncidentStatus> = {
    OPEN: "aberto",
    MONITORING: "acompanhando",
    RESOLVED: "resolvido",
    ARCHIVED: "resolvido",
  }

  const firstUsage = dbI.procedureRecord?.productUsages?.[0]

  return {
    id: dbI.id,
    patientId: dbI.patientId,
    patientName: dbI.patient ? dbI.patient.name : "Paciente",
    date: dbI.identifiedAt ? new Date(dbI.identifiedAt).toISOString().split("T")[0] : CLINIC_TODAY,
    typeId: dbI.type,
    procedure: dbI.procedureRecord ? dbI.procedureRecord.procedureName : "Procedimento",
    product: firstUsage ? firstUsage.productNameSnapshot : undefined,
    lot: firstUsage ? firstUsage.lotSnapshot : undefined,
    report: dbI.report,
    conducts: [],
    status: statusMap[dbI.status] || "aberto",
    createdAt: dbI.createdAt ? new Date(dbI.createdAt).toISOString().split("T")[0] : CLINIC_TODAY,
    timeline: (dbI.updates || []).map((u: any) => ({
      id: u.id,
      date: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : CLINIC_TODAY,
      note: u.note,
      author: "Dra. Profissional",
    })),
  }
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [],
  loading: false,
  error: null,

  fetchIncidents: async (patientId) => {
    set({ loading: true })
    try {
      const url = patientId ? `/api/incidents?patientId=${patientId}` : "/api/incidents"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.incidents || []).map(mapDbIncidentToFrontend)
        set({ incidents: mapped, loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  addIncident: async (input) => {
    set({ loading: true })
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        set({ loading: false })
        return null
      }

      const data = await res.json()
      const created = mapDbIncidentToFrontend(data.incident)
      set((state) => ({
        incidents: [created, ...state.incidents],
        loading: false,
      }))
      return created
    } catch {
      set({ loading: false })
      return null
    }
  },

  addEntry: async (incidentId, note) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })

      if (res.ok) {
        await get().fetchIncidents()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  setStatus: async (incidentId, status) => {
    try {
      let res: Response
      if (status === "resolvido") {
        res = await fetch(`/api/incidents/${incidentId}/resolve`, { method: "POST" })
      } else {
        const dbStatus = status === "acompanhando" ? "MONITORING" : "OPEN"
        res = await fetch(`/api/incidents/${incidentId}/updates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: `Status alterado para ${incidentStatusLabel[status]}`, status: dbStatus }),
        })
      }

      if (res.ok) {
        await get().fetchIncidents()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  removeIncident: async (incidentId) => {
    set((state) => ({ incidents: state.incidents.filter((item) => item.id !== incidentId) }))
    return true
  },
}))

export function incidentsForPatient(incidents: Incident[], patientId: string) {
  return incidents
    .filter((incident) => incident.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function openIncidents(incidents: Incident[]) {
  return incidents.filter((incident) => incident.status !== "resolvido")
}
