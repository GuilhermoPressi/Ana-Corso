import { create } from "zustand"

import {
  type Patient,
  type PatientStatus,
  type ProcedureRecord,
} from "@/data/patients"
import { type Lead, type LeadStage } from "@/data/leads"
import { CLINIC_TODAY, isCurrentMonth } from "@/lib/clinic"

export type NewPatientInput = {
  name: string
  phone: string
  email: string
  city: string
  birthDate: string
  mainProcedure: string
  professional: string
  origin: Patient["origin"]
  skinType: string
  allergies: string
  observations: string
}

export type NewLeadInput = {
  name: string
  phone: string
  interest: string
  source: Lead["source"]
  value: number
  note?: string
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type PatientState = {
  patients: Patient[]
  leads: Lead[]
  loading: boolean
  error: string | null
  pagination: PaginationMeta
  historicalNewPatients: number

  loadPatients: (params?: { search?: string; status?: string; page?: number; limit?: number }) => Promise<void>
  fetchPatient: (id: string) => Promise<Patient | null>
  addPatient: (input: NewPatientInput) => Promise<Patient | null>
  updatePatientApi: (id: string, patch: Partial<Patient>) => Promise<boolean>
  archivePatient: (id: string) => Promise<boolean>
  restorePatient: (id: string) => Promise<boolean>

  updatePatient: (id: string, patch: Partial<Patient>) => void
  registerProcedure: (input: {
    patientId: string
    record: Omit<ProcedureRecord, "id">
    returnDate: string
    returnReason: string
  }) => void

  fetchLeads: () => Promise<void>
  addLead: (input: NewLeadInput) => Promise<Lead | null>
  addScheduledLead: (input: NewLeadInput & { scheduledFor: string }) => Promise<Lead | null>
  moveLead: (id: string, stage: LeadStage, toIndex?: number) => Promise<boolean>
  updateLead: (id: string, patch: Partial<Lead>) => void
  removeLead: (id: string) => void
  convertLead: (id: string) => Promise<string | undefined>
}

let sequence = 0
function nextId(prefix: string) {
  sequence += 1
  return `${prefix}-${sequence}`
}

export function mapDbPatientToFrontend(dbP: any): Patient {
  const statusMap: Record<string, PatientStatus> = {
    ACTIVE: "ativa",
    ATTENTION: "atencao",
    INACTIVE: "inativa",
    ARCHIVED: "inativa",
  }

  const birthDateFormatted = dbP.birthDate
    ? new Date(dbP.birthDate).toISOString().split("T")[0]
    : ""

  const sinceFormatted = dbP.createdAt
    ? new Date(dbP.createdAt).toISOString().split("T")[0]
    : CLINIC_TODAY

  return {
    id: dbP.id,
    name: dbP.name,
    birthDate: birthDateFormatted,
    phone: dbP.phone || "",
    email: dbP.email || "",
    city: dbP.city || "",
    since: sinceFormatted,
    status: statusMap[dbP.status] || "ativa",
    lastVisit: sinceFormatted,
    totalSpent: 0,
    sessions: 0,
    ticket: 0,
    nextReturn: undefined,
    mainProcedure: dbP.mainProcedure || "Consulta / Avaliação",
    professional: dbP.responsibleProfessional || "Dra. Ana Corso",
    origin: (dbP.leadSource as any) || "Instagram",
    skinType: dbP.clinicalProfile?.skinType || "Não informado",
    allergies: dbP.clinicalProfile?.allergies || "Nenhuma relatada",
    observations: dbP.clinicalProfile?.clinicalNotes || "",
    procedures: (dbP.procedureRecords || []).map((pr: any) => ({
      id: pr.id,
      date: pr.performedAt ? new Date(pr.performedAt).toISOString().split("T")[0] : CLINIC_TODAY,
      procedure: pr.procedureName,
      regions: pr.regions || [],
      product: pr.productUsages?.[0]?.productNameSnapshot || "Produto Padrão",
      lot: pr.productUsages?.[0]?.lotSnapshot || "—",
      quantity: pr.productUsages?.[0] ? `${pr.productUsages[0].quantity} ${pr.productUsages[0].unitSnapshot}` : "—",
      professional: pr.professionalName,
      value: Number(pr.value),
      notes: pr.notes || undefined,
    })),
    timeline: [],
    returns: (dbP.returns || []).map((ret: any) => ({
      id: ret.id,
      date: ret.dueAt ? new Date(ret.dueAt).toISOString().split("T")[0] : CLINIC_TODAY,
      reason: ret.reason,
      status: ret.status === "COMPLETED" ? "realizado" : "agendado",
    })),
  }
}

const leadStageDbToFrontend: Record<string, LeadStage> = {
  NEW_CONTACT: "novos-contatos",
  EVALUATION_SCHEDULED: "avaliacao-agendada",
  PROPOSAL_SENT: "proposta-enviada",
  WON: "fechado",
  LOST: "perdido",
}

const leadStageFrontendToDb: Record<LeadStage, string> = {
  "novos-contatos": "NEW_CONTACT",
  "avaliacao-agendada": "EVALUATION_SCHEDULED",
  "proposta-enviada": "PROPOSAL_SENT",
  fechado: "WON",
  perdido: "LOST",
}

export function mapDbLeadToFrontend(dbL: any): Lead {
  return {
    id: dbL.id,
    name: dbL.name,
    phone: dbL.phone || "",
    interest: dbL.interest,
    source: dbL.source,
    stage: leadStageDbToFrontend[dbL.stage] || "novos-contatos",
    value: Number(dbL.value || 0),
    createdAt: dbL.createdAt ? new Date(dbL.createdAt).toISOString().split("T")[0] : CLINIC_TODAY,
    lastContact: dbL.lastContact ? new Date(dbL.lastContact).toISOString().split("T")[0] : CLINIC_TODAY,
    owner: dbL.owner || "Recepção",
    temperature: (dbL.temperature as any) || "morno",
    note: dbL.note || undefined,
    scheduledFor: dbL.scheduledFor ? new Date(dbL.scheduledFor).toISOString().split("T")[0] : undefined,
  }
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  leads: [],
  loading: false,
  error: null,
  pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
  historicalNewPatients: 0,

  loadPatients: async (params) => {
    set({ loading: true, error: null })
    try {
      const q = new URLSearchParams()
      if (params?.search) q.append("search", params.search)
      if (params?.status) q.append("status", params.status)
      if (params?.page) q.append("page", params.page.toString())
      if (params?.limit) q.append("limit", params.limit.toString())

      const res = await fetch(`/api/patients?${q.toString()}`)
      if (!res.ok) {
        set({ loading: false, error: "Erro ao carregar pacientes do servidor." })
        return
      }

      const data = await res.json()
      const mapped = (data.items || []).map(mapDbPatientToFrontend)

      set({
        patients: mapped,
        pagination: data.pagination || { page: 1, limit: 25, total: mapped.length, totalPages: 1 },
        loading: false,
      })
    } catch {
      set({ loading: false, error: "Erro de conexão." })
    }
  },

  fetchPatient: async (id) => {
    try {
      const res = await fetch(`/api/patients/${id}`)
      if (!res.ok) return null
      const data = await res.json()
      const mapped = mapDbPatientToFrontend(data.patient)

      set((state) => ({
        patients: state.patients.some((p) => p.id === id)
          ? state.patients.map((p) => (p.id === id ? mapped : p))
          : [mapped, ...state.patients],
      }))

      return mapped
    } catch {
      return null
    }
  },

  addPatient: async (input) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      const data = await res.json()
      if (!res.ok) {
        set({ loading: false, error: data.error?.message || "Erro ao cadastrar paciente." })
        return null
      }

      const created = mapDbPatientToFrontend(data.patient)
      set((state) => ({
        patients: [created, ...state.patients],
        loading: false,
      }))
      return created
    } catch (err: any) {
      set({ loading: false, error: err.message || "Erro de conexão." })
      return null
    }
  },

  updatePatientApi: async (id, patch) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })

      if (!res.ok) {
        set({ loading: false })
        return false
      }

      const data = await res.json()
      const updated = mapDbPatientToFrontend(data.patient)

      set((state) => ({
        patients: state.patients.map((p) => (p.id === id ? updated : p)),
        loading: false,
      }))
      return true
    } catch {
      set({ loading: false })
      return false
    }
  },

  archivePatient: async (id) => {
    try {
      const res = await fetch(`/api/patients/${id}/archive`, { method: "POST" })
      if (res.ok) {
        set((state) => ({
          patients: state.patients.filter((p) => p.id !== id),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  restorePatient: async (id) => {
    try {
      const res = await fetch(`/api/patients/${id}/restore`, { method: "POST" })
      if (res.ok) {
        await get().loadPatients()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  updatePatient: (id, patch) =>
    set((state) => ({
      patients: state.patients.map((patient) =>
        patient.id === id ? { ...patient, ...patch } : patient,
      ),
    })),

  registerProcedure: ({ patientId, record, returnDate, returnReason }) =>
    set((state) => ({
      patients: state.patients.map((patient) => {
        if (patient.id !== patientId) return patient

        const procedure: ProcedureRecord = { ...record, id: nextId("pr") }
        const sessions = patient.sessions + 1
        const totalSpent = patient.totalSpent + record.value

        return {
          ...patient,
          status: "ativa",
          lastVisit: record.date,
          nextReturn: returnDate,
          sessions,
          totalSpent,
          ticket: Math.round(totalSpent / sessions),
          procedures: [procedure, ...patient.procedures],
          timeline: [
            {
              id: nextId("t"),
              date: record.date,
              kind: "procedimento",
              title: `${record.procedure}${record.regions.length ? ` · ${record.regions.join(", ")}` : ""}`,
              description: record.notes?.trim()
                ? record.notes
                : `${record.quantity} de ${record.product}. Sem intercorrências.`,
            },
            ...patient.timeline,
          ],
          returns: [
            {
              id: nextId("rt"),
              date: returnDate,
              reason: returnReason,
              status: "agendado" as const,
            },
            ...patient.returns,
          ],
        }
      }),
    })),

  fetchLeads: async () => {
    try {
      const res = await fetch("/api/leads")
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.leads || []).map(mapDbLeadToFrontend)
        set({ leads: mapped })
      }
    } catch {
      // ignore
    }
  },

  addLead: async (input) => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          phone: input.phone || null,
          interest: input.interest,
          source: input.source,
          value: input.value,
          note: input.note || null,
        }),
      })

      if (!res.ok) return null
      const data = await res.json()
      const created = mapDbLeadToFrontend(data.lead)
      set((state) => ({ leads: [created, ...state.leads] }))
      return created
    } catch {
      return null
    }
  },

  addScheduledLead: async (input) => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          phone: input.phone || null,
          interest: input.interest,
          source: input.source,
          value: input.value,
          note: input.note || null,
          scheduledFor: input.scheduledFor,
        }),
      })

      if (!res.ok) return null
      const data = await res.json()
      const created = mapDbLeadToFrontend(data.lead)
      set((state) => ({ leads: [...state.leads, created] }))
      return created
    } catch {
      return null
    }
  },

  moveLead: async (id, stage, toIndex) => {
    const currentLeads = get().leads
    const lead = currentLeads.find((item) => item.id === id)
    if (!lead) return false

    // Optimistic update
    const dbStage = leadStageFrontendToDb[stage]
    const moved: Lead = { ...lead, stage, lastContact: CLINIC_TODAY }
    const rest = currentLeads.filter((item) => item.id !== id)

    let nextLeads: Lead[]
    if (toIndex === undefined) {
      nextLeads = [...rest, moved]
    } else {
      const targetIds = rest.filter((item) => item.stage === stage).map((item) => item.id)
      const anchorId = targetIds[toIndex]
      const absolute = anchorId ? rest.findIndex((item) => item.id === anchorId) : rest.length
      nextLeads = [...rest]
      nextLeads.splice(absolute, 0, moved)
    }

    set({ leads: nextLeads })

    try {
      const res = await fetch(`/api/leads/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: dbStage,
          position: toIndex ?? 0,
        }),
      })

      if (!res.ok) {
        set({ leads: currentLeads })
        return false
      }
      return true
    } catch {
      set({ leads: currentLeads })
      return false
    }
  },

  updateLead: (id, patch) =>
    set((state) => ({
      leads: state.leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)),
    })),

  removeLead: async (id) => {
    try {
      await fetch(`/api/leads/${id}/archive`, { method: "POST" })
      set((state) => ({ leads: state.leads.filter((l) => l.id !== id) }))
    } catch {
      // ignore
    }
  },

  convertLead: async (id) => {
    try {
      const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" })
      if (!res.ok) return undefined
      const data = await res.json()
      await get().loadPatients()
      await get().fetchLeads()
      return data.patient?.id
    } catch {
      return undefined
    }
  },
}))

export function countByStatus(patients: Patient[]) {
  return {
    todas: patients.length,
    ativa: patients.filter((p) => p.status === "ativa").length,
    atencao: patients.filter((p) => p.status === "atencao").length,
    inativa: patients.filter((p) => p.status === "inativa").length,
  } satisfies Record<"todas" | PatientStatus, number>
}

export function selectNewPatientsThisMonth(state: PatientState) {
  return state.historicalNewPatients + state.patients.filter((p) => isCurrentMonth(p.since)).length
}

export function selectScheduledLeads(leads: Lead[]) {
  return leads
    .filter((lead) => Boolean(lead.scheduledFor) && lead.stage !== "fechado")
    .sort((a, b) => (a.scheduledFor! > b.scheduledFor! ? 1 : -1))
}

export function selectOpenProposals(leads: Lead[]) {
  return leads
    .filter(isActiveProposal)
    .reduce((sum, lead) => sum + lead.value, 0)
}

export function isActiveProposal(lead: Lead) {
  return (
    lead.stage === "novos-contatos" ||
    lead.stage === "avaliacao-agendada" ||
    lead.stage === "proposta-enviada"
  )
}
