import { create } from "zustand"

import { CLINIC_TODAY } from "@/lib/clinic"

export type CareOutcome = "tudo-bem" | "queixa" | "sem-resposta"

export type CareLog = {
  id: string
  key: string
  patientId: string
  date: string
  outcome: CareOutcome
  note?: string
}

export const outcomeLabel: Record<CareOutcome, string> = {
  "tudo-bem": "Tudo bem",
  queixa: "Relatou queixa",
  "sem-resposta": "Sem resposta",
}

type PostCareState = {
  logs: CareLog[]
  loading: boolean
  error: string | null

  fetchPostCare: () => Promise<void>
  register: (input: { id?: string; key: string; patientId: string; outcome: CareOutcome; note?: string }) => Promise<void>
  undo: (key: string) => void
}

export function mapDbPostCareToFrontend(dbP: any): CareLog {
  const outcomeMap: Record<string, CareOutcome> = {
    COMPLETED: "tudo-bem",
    SENT: "tudo-bem",
    CANCELLED: "sem-resposta",
    PENDING: "sem-resposta",
    OVERDUE: "queixa",
  }

  return {
    id: dbP.id,
    key: dbP.id,
    patientId: dbP.patientId,
    date: dbP.completedAt ? new Date(dbP.completedAt).toISOString().split("T")[0] : CLINIC_TODAY,
    outcome: outcomeMap[dbP.status] || "tudo-bem",
    note: dbP.procedureRecord ? dbP.procedureRecord.procedureName : undefined,
  }
}

export const usePostCareStore = create<PostCareState>((set, get) => ({
  logs: [],
  loading: false,
  error: null,

  fetchPostCare: async () => {
    try {
      const res = await fetch("/api/post-care")
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.followUps || []).map(mapDbPostCareToFrontend)
        set({ logs: mapped })
      }
    } catch {
      // ignore
    }
  },

  register: async ({ id, key, patientId, outcome, note }) => {
    const targetId = id || key
    set((state) => ({
      logs: [
        ...state.logs.filter((log) => log.key !== key),
        { id: targetId, key, patientId, date: CLINIC_TODAY, outcome, note },
      ],
    }))

    try {
      const dbStatus = outcome === "tudo-bem" ? "COMPLETED" : outcome === "queixa" ? "OVERDUE" : "SENT"
      await fetch(`/api/post-care/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: dbStatus }),
      })
    } catch {
      // ignore
    }
  },

  undo: (key) => set((state) => ({ logs: state.logs.filter((log) => log.key !== key) })),
}))

export function logFor(logs: CareLog[], key: string) {
  return logs.find((log) => log.key === key)
}
