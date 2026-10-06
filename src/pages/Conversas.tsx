import { useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { ConversationsTab } from "@/components/crm/ConversationsTab"
import { PageHeader } from "@/components/layout/PageHeader"

export default function Conversas() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const selectedId = params.get("conversa")

  const select = useCallback(
    (id: string | null) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (id) next.set("conversa", id)
          else next.delete("conversa")
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Conversas"
        description="Atendimento pelo WhatsApp da clínica: responda, organize e acompanhe cada contato."
        className="mb-4"
      />
      <ConversationsTab
        selectedId={selectedId}
        onSelect={select}
        onOpenContact={(contactId) => navigate(`/crm?aba=contatos&contato=${contactId}`)}
      />
    </div>
  )
}
