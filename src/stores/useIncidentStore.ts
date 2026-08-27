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
  /** Data em que a intercorrência foi identificada. */
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
  addIncident: (input: Omit<Incident, "id" | "createdAt" | "timeline" | "status"> & {
    status?: IncidentStatus
  }) => Incident
  addEntry: (incidentId: string, note: string, author: string) => void
  setStatus: (incidentId: string, status: IncidentStatus) => void
  removeIncident: (incidentId: string) => void
}

let sequence = 0
const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`

const seedIncidents: Incident[] = [
  {
    id: "inc-seed-1",
    patientId: "p7",
    patientName: "Sofia Ribeiro",
    date: "2026-07-16",
    typeId: "edema",
    procedure: "Preenchimento",
    product: "Juvéderm Voluma 1ml · Allergan",
    lot: "JV-6011",
    report:
      "Paciente relatou inchaço acima do esperado em região malar bilateral no segundo dia. Sem dor, sem alteração de coloração.",
    conducts: ["Compressa fria orientada", "Elevação da cabeceira ao dormir", "Reavaliação em 48 h"],
    status: "acompanhando",
    timeline: [
      {
        id: "ie-1",
        date: "2026-07-16",
        note: "Contato por WhatsApp. Orientada quanto a compressa fria e repouso da região.",
        author: "Dra. Ana Corso",
      },
      {
        id: "ie-2",
        date: "2026-07-18",
        note: "Reavaliação presencial: edema reduzido em cerca de 40%. Mantida conduta conservadora.",
        author: "Dra. Ana Corso",
      },
    ],
    createdAt: "2026-07-16",
  },
]

export const useIncidentStore = create<IncidentState>((set) => ({
  incidents: seedIncidents,

  addIncident: (input) => {
    const incident: Incident = {
      ...input,
      id: nextId("inc"),
      status: input.status ?? "aberto",
      timeline: [
        {
          id: nextId("ie"),
          date: input.date,
          note: input.report,
          author: "Dra. Ana Corso",
        },
      ],
      createdAt: CLINIC_TODAY,
    }

    set((state) => ({ incidents: [incident, ...state.incidents] }))
    return incident
  },

  addEntry: (incidentId, note, author) =>
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              timeline: [
                ...incident.timeline,
                { id: nextId("ie"), date: CLINIC_TODAY, note, author },
              ],
            }
          : incident,
      ),
    })),

  setStatus: (incidentId, status) =>
    set((state) => ({
      incidents: state.incidents.map((incident) =>
        incident.id === incidentId ? { ...incident, status } : incident,
      ),
    })),

  removeIncident: (incidentId) =>
    set((state) => ({ incidents: state.incidents.filter((item) => item.id !== incidentId) })),
}))

export function incidentsForPatient(incidents: Incident[], patientId: string) {
  return incidents
    .filter((incident) => incident.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function openIncidents(incidents: Incident[]) {
  return incidents.filter((incident) => incident.status !== "resolvido")
}
