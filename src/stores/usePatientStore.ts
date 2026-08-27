import { create } from "zustand"

import {
  patients as seedPatients,
  type Patient,
  type PatientStatus,
  type ProcedureRecord,
} from "@/data/patients"
import { seedLeads, type Lead, type LeadStage } from "@/data/leads"
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

type PatientState = {
  patients: Patient[]
  leads: Lead[]
  /**
   * Pacientes novas do mês que não estão individualizadas na lista — o histórico
   * completo da clínica não cabe no mock. As cadastradas na sessão somam a isto.
   */
  historicalNewPatients: number

  addPatient: (input: NewPatientInput) => Patient
  updatePatient: (id: string, patch: Partial<Patient>) => void
  /**
   * Lança um procedimento na ficha: histórico, linha do tempo, retorno
   * programado e os totais da paciente, tudo de uma vez.
   */
  registerProcedure: (input: {
    patientId: string
    record: Omit<ProcedureRecord, "id">
    returnDate: string
    returnReason: string
  }) => void

  addLead: (input: NewLeadInput) => Lead
  /** Lembrete de recontato comercial gerado pela automação. */
  addScheduledLead: (input: NewLeadInput & { scheduledFor: string }) => Lead
  moveLead: (id: string, stage: LeadStage, toIndex?: number) => void
  updateLead: (id: string, patch: Partial<Lead>) => void
  removeLead: (id: string) => void
  /** Fecha o lead e cria a paciente correspondente, devolvendo o id da nova ficha. */
  convertLead: (id: string) => string | undefined
}

/** Acumula o consumo do produto na ficha, em vez de criar linhas repetidas. */
function upsertProduct(
  products: Patient["products"],
  record: Omit<ProcedureRecord, "id">,
  newId: string,
) {
  const [name, brand = "—"] = record.product.split(" · ")
  const existing = products.find((item) => item.product === name)

  if (!existing) {
    return [
      {
        id: newId,
        product: name,
        brand,
        totalQuantity: record.quantity,
        lastUse: record.date,
        sessions: 1,
      },
      ...products,
    ]
  }

  return products.map((item) =>
    item.product === name
      ? {
          ...item,
          totalQuantity: `${item.totalQuantity} + ${record.quantity}`,
          lastUse: record.date,
          sessions: item.sessions + 1,
        }
      : item,
  )
}

let sequence = 0
function nextId(prefix: string) {
  sequence += 1
  return `${prefix}-${sequence}-${seedPatients.length + sequence}`
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: seedPatients,
  leads: seedLeads,
  historicalNewPatients: 17,

  addPatient: (input) => {
    const patient: Patient = {
      id: nextId("p"),
      name: input.name.trim(),
      birthDate: input.birthDate,
      phone: input.phone,
      email: input.email,
      city: input.city,
      since: CLINIC_TODAY,
      status: "ativa",
      lastVisit: CLINIC_TODAY,
      totalSpent: 0,
      sessions: 0,
      ticket: 0,
      tags: ["Primeira consulta"],
      mainProcedure: input.mainProcedure,
      professional: input.professional,
      origin: input.origin,
      skinType: input.skinType,
      allergies: input.allergies,
      observations: input.observations,
      procedures: [],
      timeline: [
        {
          id: nextId("t"),
          date: CLINIC_TODAY,
          kind: "mensagem",
          title: "Cadastro criado",
          description: `Ficha aberta na recepção · origem ${input.origin}.`,
        },
      ],
      returns: [],
      photos: [],
      products: [],
    }

    set((state) => ({ patients: [patient, ...state.patients] }))
    return patient
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
          products: upsertProduct(patient.products, record, nextId("pu")),
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

      // O índice recebido é relativo à coluna de destino; converte para o índice
      // absoluto na lista única que a store mantém.
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

  convertLead: (id) => {
    const lead = get().leads.find((item) => item.id === id)
    if (!lead) return undefined

    const patient = get().addPatient({
      name: lead.name,
      phone: lead.phone,
      email: "",
      city: "Porto Alegre · RS",
      birthDate: "1990-01-01",
      mainProcedure: lead.interest,
      professional: "Dra. Ana Corso",
      origin: lead.source,
      skinType: "A definir na anamnese",
      allergies: "A confirmar na anamnese",
      observations: `Veio do CRM · proposta de ${lead.value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}.`,
    })

    get().moveLead(id, "fechado")
    return patient.id
  },
}))

/* ------------------------------------------------------------------ *
 * Seletores derivados
 * ------------------------------------------------------------------ */

export function countByStatus(patients: Patient[]) {
  return {
    todas: patients.length,
    ativa: patients.filter((p) => p.status === "ativa").length,
    atencao: patients.filter((p) => p.status === "atencao").length,
    inativa: patients.filter((p) => p.status === "inativa").length,
  } satisfies Record<"todas" | PatientStatus, number>
}

/** Pacientes que abriram ficha no mês corrente, somando o histórico não individualizado. */
export function selectNewPatientsThisMonth(state: PatientState) {
  return state.historicalNewPatients + state.patients.filter((p) => isCurrentMonth(p.since)).length
}

export function selectLeadsByStage(leads: Lead[], stage: LeadStage) {
  return leads.filter((lead) => lead.stage === stage)
}

/** Soma das propostas que ainda podem virar receita (exclui fechado e perdido). */
const openStages: LeadStage[] = ["novos-contatos", "avaliacao-agendada", "proposta-enviada"]

/** Um recontato agendado para o futuro ainda não é proposta em aberto. */
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
