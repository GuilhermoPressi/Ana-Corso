import { create } from "zustand"

import { CLINIC_TODAY } from "@/lib/clinic"

export type ProtocolStep = {
  id: string
  procedure: string
  label: string
  /** Dia do cronograma, contado a partir da primeira sessão (dia 1). */
  day: number
  /** Preço se a paciente fizesse esse procedimento avulso. */
  listPrice: number
}

export type Protocol = {
  id: string
  name: string
  description: string
  steps: ProtocolStep[]
  /** Preço fechado do pacote, definido pela profissional. */
  packagePrice: number
  createdAt: string
}

export type ProposalItem = {
  id: string
  label: string
  detail: string
  value: number
}

export type Proposal = {
  id: string
  patientId: string
  patientName: string
  title: string
  items: ProposalItem[]
  total: number
  note: string
  createdAt: string
  status: "rascunho" | "enviada"
}

type CatalogState = {
  protocols: Protocol[]
  proposals: Proposal[]

  addProtocol: (input: Omit<Protocol, "id" | "createdAt">) => Protocol
  removeProtocol: (id: string) => void
  addProposal: (input: Omit<Proposal, "id" | "createdAt">) => Proposal
}

let sequence = 0
const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`

const seedProtocols: Protocol[] = [
  {
    id: "proto-seed-1",
    name: "Plano Rejuvenescimento 90 dias",
    description:
      "Firmeza e qualidade de pele em três etapas, com intervalo suficiente para o colágeno responder.",
    steps: [
      {
        id: "step-s1",
        procedure: "Bioestimulador",
        label: "Bioestimulador · terço médio e inferior",
        day: 1,
        listPrice: 3200,
      },
      {
        id: "step-s2",
        procedure: "Toxina botulínica",
        label: "Toxina · terço superior",
        day: 30,
        listPrice: 1800,
      },
      {
        id: "step-s3",
        procedure: "Bioestimulador",
        label: "Bioestimulador · 2ª sessão",
        day: 90,
        listPrice: 3200,
      },
    ],
    packagePrice: 7300,
    createdAt: "2026-08-14",
  },
  {
    id: "proto-seed-2",
    name: "Combo Viço 60 dias",
    description: "Hidratação profunda e textura, para quem quer resultado natural e progressivo.",
    steps: [
      {
        id: "step-s4",
        procedure: "Skinbooster",
        label: "Skinbooster · face",
        day: 1,
        listPrice: 1600,
      },
      {
        id: "step-s5",
        procedure: "Skinbooster",
        label: "Skinbooster · 2ª sessão",
        day: 30,
        listPrice: 1600,
      },
      {
        id: "step-s6",
        procedure: "Microagulhamento",
        label: "Microagulhamento · face",
        day: 60,
        listPrice: 700,
      },
    ],
    packagePrice: 3400,
    createdAt: "2026-08-06",
  },
]

export const useCatalogStore = create<CatalogState>((set) => ({
  protocols: seedProtocols,
  proposals: [],

  addProtocol: (input) => {
    const protocol: Protocol = { ...input, id: nextId("proto"), createdAt: CLINIC_TODAY }
    set((state) => ({ protocols: [protocol, ...state.protocols] }))
    return protocol
  },

  removeProtocol: (id) =>
    set((state) => ({ protocols: state.protocols.filter((item) => item.id !== id) })),

  addProposal: (input) => {
    const proposal: Proposal = { ...input, id: nextId("prop"), createdAt: CLINIC_TODAY }
    set((state) => ({ proposals: [proposal, ...state.proposals] }))
    return proposal
  },
}))

/* ------------------------------------------------------------------ *
 * Seletores derivados
 * ------------------------------------------------------------------ */

export type ProtocolSummary = {
  listTotal: number
  discount: number
  discountPercent: number
  durationDays: number
  sessions: number
}

export function summarizeProtocol(protocol: {
  steps: ProtocolStep[]
  packagePrice: number
}): ProtocolSummary {
  const listTotal = protocol.steps.reduce((sum, step) => sum + step.listPrice, 0)
  const discount = listTotal - protocol.packagePrice
  const days = protocol.steps.map((step) => step.day)

  return {
    listTotal,
    discount,
    discountPercent: listTotal === 0 ? 0 : (discount / listTotal) * 100,
    durationDays: days.length === 0 ? 0 : Math.max(...days),
    sessions: protocol.steps.length,
  }
}

/** Preço avulso de referência quando a clínica ainda não precificou o procedimento. */
export const fallbackListPrice: Record<string, number> = {
  "Toxina botulínica": 1800,
  Preenchimento: 2400,
  Bioestimulador: 3200,
  Skinbooster: 1600,
  Microagulhamento: 700,
}
