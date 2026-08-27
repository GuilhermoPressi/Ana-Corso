import { create } from "zustand"

import { CLINIC_TODAY } from "@/lib/clinic"

export type CareOutcome = "tudo-bem" | "queixa" | "sem-resposta"

export type CareLog = {
  id: string
  /** Identifica o contato: paciente + procedimento + ponto da régua. */
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
  register: (input: { key: string; patientId: string; outcome: CareOutcome; note?: string }) => void
  undo: (key: string) => void
}

let sequence = 0

const seedLogs: CareLog[] = [
  { id: "log-s1", key: "p1:pr1:d1", patientId: "p1", date: "2026-08-25", outcome: "tudo-bem" },
]

export const usePostCareStore = create<PostCareState>((set) => ({
  logs: seedLogs,

  register: ({ key, patientId, outcome, note }) =>
    set((state) => ({
      logs: [
        ...state.logs.filter((log) => log.key !== key),
        { id: `log-${(sequence += 1)}`, key, patientId, date: CLINIC_TODAY, outcome, note },
      ],
    })),

  undo: (key) => set((state) => ({ logs: state.logs.filter((log) => log.key !== key) })),
}))

export function logFor(logs: CareLog[], key: string) {
  return logs.find((log) => log.key === key)
}
