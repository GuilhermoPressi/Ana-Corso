import { create } from "zustand"

import { CLINIC_TODAY } from "@/lib/clinic"

export type ProtocolStep = {
  id: string
  procedure: string
  label: string
  day: number
  listPrice: number
}

export type Protocol = {
  id: string
  name: string
  description: string
  steps: ProtocolStep[]
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
  status: "rascunho" | "enviada" | "aceita" | "rejeitada"
}

type CatalogState = {
  protocols: Protocol[]
  proposals: Proposal[]
  loading: boolean
  error: string | null

  fetchProtocols: () => Promise<void>
  fetchProposals: () => Promise<void>
  addProtocol: (input: Omit<Protocol, "id" | "createdAt">) => Promise<Protocol | null>
  removeProtocol: (id: string) => void
  addProposal: (input: Omit<Proposal, "id" | "createdAt">) => Promise<Proposal | null>
}

export function mapDbProtocolToFrontend(dbP: any): Protocol {
  return {
    id: dbP.id,
    name: dbP.name,
    description: dbP.description || "",
    packagePrice: Number(dbP.packagePrice),
    createdAt: dbP.createdAt ? new Date(dbP.createdAt).toISOString().split("T")[0] : CLINIC_TODAY,
    steps: (dbP.steps || []).map((s: any) => ({
      id: s.id,
      procedure: s.procedureName,
      label: s.label,
      day: s.dayOffset,
      listPrice: Number(s.listPrice),
    })),
  }
}

export function mapDbProposalToFrontend(dbP: any): Proposal {
  const statusMap: Record<string, Proposal["status"]> = {
    DRAFT: "rascunho",
    SENT: "enviada",
    ACCEPTED: "aceita",
    REJECTED: "rejeitada",
  }

  return {
    id: dbP.id,
    patientId: dbP.patientId,
    patientName: dbP.patient ? dbP.patient.name : "",
    title: dbP.title,
    note: dbP.note || "",
    total: Number(dbP.total),
    createdAt: dbP.createdAt ? new Date(dbP.createdAt).toISOString().split("T")[0] : CLINIC_TODAY,
    status: statusMap[dbP.status] || "rascunho",
    items: (dbP.items || []).map((i: any) => ({
      id: i.id,
      label: i.nameSnapshot,
      detail: i.detailSnapshot || "",
      value: Number(i.totalPrice),
    })),
  }
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  protocols: [],
  proposals: [],
  loading: false,
  error: null,

  fetchProtocols: async () => {
    try {
      const res = await fetch("/api/protocols")
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.protocols || []).map(mapDbProtocolToFrontend)
        set({ protocols: mapped })
      }
    } catch {
      // ignore
    }
  },

  fetchProposals: async () => {
    try {
      const res = await fetch("/api/proposals")
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.proposals || []).map(mapDbProposalToFrontend)
        set({ proposals: mapped })
      }
    } catch {
      // ignore
    }
  },

  addProtocol: async (input) => {
    set({ loading: true })
    try {
      const res = await fetch("/api/protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          description: input.description || null,
          packagePrice: input.packagePrice,
          steps: input.steps.map((s, idx) => ({
            procedureName: s.procedure,
            label: s.label,
            dayOffset: s.day,
            listPrice: s.listPrice,
            position: idx,
          })),
        }),
      })

      if (!res.ok) {
        set({ loading: false })
        return null
      }

      const data = await res.json()
      const created = mapDbProtocolToFrontend(data.protocol)
      set((state) => ({
        protocols: [created, ...state.protocols],
        loading: false,
      }))
      return created
    } catch {
      set({ loading: false })
      return null
    }
  },

  removeProtocol: (id) =>
    set((state) => ({ protocols: state.protocols.filter((item) => item.id !== id) })),

  addProposal: async (input) => {
    set({ loading: true })
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: input.patientId,
          title: input.title,
          note: input.note || null,
          total: input.total,
          status: input.status === "enviada" ? "SENT" : "DRAFT",
          items: input.items.map((i, idx) => ({
            nameSnapshot: i.label,
            detailSnapshot: i.detail || null,
            quantity: 1,
            unitPrice: i.value,
            totalPrice: i.value,
            position: idx,
          })),
        }),
      })

      if (!res.ok) {
        set({ loading: false })
        return null
      }

      const data = await res.json()
      const created = mapDbProposalToFrontend(data.proposal)
      set((state) => ({
        proposals: [created, ...state.proposals],
        loading: false,
      }))
      return created
    } catch {
      set({ loading: false })
      return null
    }
  },
}))

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

export const fallbackListPrice: Record<string, number> = {
  "Toxina botulínica": 1800,
  Preenchimento: 2400,
  Bioestimulador: 3200,
  Skinbooster: 1600,
  Microagulhamento: 700,
}
