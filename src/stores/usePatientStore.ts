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
  
  // Legacy / Store Operations
  updatePatient: (id: string, patch: Partial<Patient>) => void
  registerProcedure: (input: {
    patientId: string
    record: Omit<ProcedureRecord, "id">
    returnDate: string
    returnReason: string
  }) => void

  addLead: (input: NewLeadInput) => Lead
  addScheduledLead: (input: NewLeadInput & { scheduledFor: string }) => Lead
  moveLead: (id: string, stage: LeadStage, toIndex?: number) => void
  updateLead: (id: string, patch: Partial<Lead>) => void
  removeLead: (id: string) => void
  convertLead: (id: string) => Promise<string | undefined>
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
    tags: ["Paciente cadastrada"],
    mainProcedure: dbP.mainProcedure || "Procedimento Geral",
    professional: dbP.responsibleProfessional || "Dra. Profissional",
    origin: (dbP.leadSource as Patient["origin"]) || "Recepção",
    skinType: dbP.clinicalProfile?.skinType || "A definir na anamnese",
    allergies: dbP.clinicalProfile?.allergies || "Nenhuma relatada",
    observations: dbP.clinicalProfile?.clinicalNotes || "",
    procedures: [],
    timeline: [
      {
        id: `t-${dbP.id}`,
        date: sinceFormatted,
        kind: "mensagem",
        title: "Cadastro no PostgreSQL",
        description: `Ficha registrada no banco real · origem ${dbP.leadSource || "Recepção"}.`,
      },
    ],
    returns: [],
    photos: [],
    products: [],
  }
}

let sequence = 0
function nextId(prefix: string) {
  sequence += 1
  return `${prefix}-${sequence}`
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
      
      // Update local state if present
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
        body: JSON.stringify({
          name: input.name,
          phone: input.phone,
          email: input.email,
          city: input.city,
          birthDate: input.birthDate,
          mainProcedure: input.mainProcedure,
          responsibleProfessional: input.professional,
          leadSource: input.origin,
          skinType: input.skinType,
          allergies: input.allergies,
          clinicalNotes: input.observations,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        set({ loading: false, error: data.error?.message || "Erro ao criar paciente." })
        return null
      }

      const newPatient = mapDbPatientToFrontend(data.patient)
      set((state) => ({
        patients: [newPatient, ...state.patients],
        loading: false,
      }))

      return newPatient
    } catch (err: any) {
      set({ loading: false, error: err.message || "Erro de conexão." })
      return null
    }
  },

  updatePatientApi: async (id, patch) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: patch.name,
          phone: patch.phone,
          email: patch.email,
          city: patch.city,
          birthDate: patch.birthDate,
          mainProcedure: patch.mainProcedure,
          responsibleProfessional: patch.professional,
          skinType: patch.skinType,
          allergies: patch.allergies,
          clinicalNotes: patch.observations,
        }),
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

  addLead: (input) => {
    const lead: Lead = {
      id: nextId("l"),
      name: input.name.trim(),
      phone: input.phone,
      interest: input.interest,
      source: input.source,
      stage: "novos-contatos",
      value: input.value,
      createdAt: CLINIC_TODAY,
      lastContact: CLINIC_TODAY,
      owner: "Recepção",
      temperature: "quente",
      note: input.note,
    }

    set((state) => ({ leads: [lead, ...state.leads] }))
    return lead
  },

  addScheduledLead: (input) => {
    const lead: Lead = {
      id: nextId("l"),
      name: input.name.trim(),
      phone: input.phone,
      interest: input.interest,
      source: input.source,
      stage: "novos-contatos",
      value: input.value,
      createdAt: CLINIC_TODAY,
      lastContact: CLINIC_TODAY,
      owner: "Automação",
      temperature: "frio",
      note: input.note,
      scheduledFor: input.scheduledFor,
    }

    set((state) => ({ leads: [...state.leads, lead] }))
    return lead
  },

  moveLead: (id, stage, toIndex) =>
    set((state) => {
      const lead = state.leads.find((item) => item.id === id)
      if (!lead) return state

      const moved: Lead = { ...lead, stage, lastContact: CLINIC_TODAY }
      const rest = state.leads.filter((item) => item.id !== id)

      if (toIndex === undefined) return { leads: [...rest, moved] }

      const targetIds = rest.filter((item) => item.stage === stage).map((item) => item.id)
      const anchorId = targetIds[toIndex]
      const absolute = anchorId ? rest.findIndex((item) => item.id === anchorId) : rest.length

      const next = [...rest]
      next.splice(absolute, 0, moved)
      return { leads: next }
    }),

  updateLead: (id, patch) =>
    set((state) => ({
      leads: state.leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)),
    })),

  removeLead: (id) => set((state) => ({ leads: state.leads.filter((lead) => lead.id !== id) })),

  // Refinement 15: Convert Lead to Patient calls REAL API POST /api/patients
  convertLead: async (id) => {
    const lead = get().leads.find((item) => item.id === id)
    if (!lead || lead.stage === "fechado") return undefined

    const newPatient = await get().addPatient({
      name: lead.name,
      phone: lead.phone,
      email: "",
      city: "Porto Alegre · RS",
      birthDate: "1990-01-01",
      mainProcedure: lead.interest,
      professional: "Dra. Profissional",
      origin: lead.source,
      skinType: "A definir na anamnese",
      allergies: "A confirmar na anamnese",
      observations: `Veio do CRM · proposta de ${lead.value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}.`,
    })

    if (newPatient) {
      get().moveLead(id, "fechado")
      return newPatient.id
    }
    return undefined
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

export function selectLeadsByStage(leads: Lead[], stage: LeadStage) {
  return leads.filter((lead) => lead.stage === stage)
}

const openStages: LeadStage[] = ["novos-contatos", "avaliacao-agendada", "proposta-enviada"]

export function isActiveProposal(lead: Lead) {
  if (!openStages.includes(lead.stage)) return false
  return !lead.scheduledFor || lead.scheduledFor <= CLINIC_TODAY
}

export function selectOpenProposals(leads: Lead[]) {
  return leads.filter(isActiveProposal).reduce((sum, lead) => sum + lead.value, 0)
}

export function selectScheduledLeads(leads: Lead[]) {
  return leads.filter((lead) => lead.scheduledFor && lead.scheduledFor > CLINIC_TODAY)
}
