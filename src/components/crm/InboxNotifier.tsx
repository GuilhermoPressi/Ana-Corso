import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

import { ApiError } from "@/lib/crm-api"
import { playNotificationSound, unlockNotificationSound } from "@/lib/notification-sound"
import { useInboxStore } from "@/stores/useInboxStore"

const POLL_MS = 8000

/**
 * Montado uma vez no layout: acompanha as mensagens do WhatsApp em qualquer
 * tela, mantém o contador de não lidas (menu e título da aba do navegador) e
 * toca um som a cada mensagem nova recebida.
 */
export function InboxNotifier() {
  const refresh = useInboxStore((s) => s.refresh)
  const unread = useInboxStore((s) => s.unread)
  const location = useLocation()
  const locationRef = useRef(location)
  const baseTitle = useRef(document.title.replace(/^\(\d+\)\s*/, ""))

  useEffect(() => {
    locationRef.current = location
  }, [location])

  useEffect(() => {
    unlockNotificationSound()
  }, [])

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    // Continua consultando com a aba em segundo plano (o navegador apenas
    // espaça os timers), para o som tocar mesmo com o app em outra aba.
    async function tick() {
      try {
        const incoming = await refresh()
        if (incoming) {
          const { pathname, search } = locationRef.current
          const viewingThisConversation =
            document.visibilityState === "visible" &&
            pathname.startsWith("/conversas") &&
            new URLSearchParams(search).get("conversa") === incoming.conversationId
          if (!viewingThisConversation) playNotificationSound()
        }
      } catch (err) {
        // Sem permissão para o CRM: não há o que acompanhar.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) stopped = true
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS)
    }

    tick()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [refresh])

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) ${baseTitle.current}` : baseTitle.current
  }, [unread])

  useEffect(() => {
    const title = baseTitle.current
    return () => {
      document.title = title
    }
  }, [])

  return null
}
