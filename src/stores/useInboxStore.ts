import { create } from "zustand"

import { crmApi } from "@/lib/crm-api"

type InboxState = {
  unread: number
  /** Id da última mensagem recebida já conhecida (null antes da primeira consulta). */
  latestInboundId: string | null
  initialized: boolean
  /** Consulta o servidor. Retorna a nova mensagem recebida desde a última consulta, se houver. */
  refresh: () => Promise<{ conversationId: string; contactName: string } | null>
  /** Ajuste local imediato ao ler uma conversa, sem esperar a próxima consulta. */
  markConversationRead: (count: number) => void
}

export const useInboxStore = create<InboxState>((set, get) => ({
  unread: 0,
  latestInboundId: null,
  initialized: false,

  refresh: async () => {
    const data = await crmApi.unreadTotal()
    const { initialized, latestInboundId } = get()
    const latest = data.latestInbound
    const isNew = initialized && latest !== null && latest.id !== latestInboundId
    set({ unread: data.unread, latestInboundId: latest?.id ?? latestInboundId, initialized: true })
    return isNew && latest ? { conversationId: latest.conversationId, contactName: latest.contactName } : null
  },

  markConversationRead: (count) => set((state) => ({ unread: Math.max(0, state.unread - count) })),
}))
