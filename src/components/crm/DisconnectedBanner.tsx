import { AlertTriangle } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/useAuthStore"
import { useInboxStore } from "@/stores/useInboxStore"

/**
 * Aviso laranja, em todas as telas, quando o WhatsApp da clínica cai.
 * O status vem do InboxNotifier (consulta a cada poucos segundos e o
 * servidor confere o estado real na Evolution).
 */
export function DisconnectedBanner() {
  const status = useInboxStore((s) => s.whatsappStatus)
  const role = useAuthStore((s) => s.clinicRole)
  if (!status || status === "CONNECTED") return null

  const canReconnect = role === "OWNER" || role === "ADMIN"
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-orange-300 bg-orange-100 px-4 py-2.5 text-[13px] font-medium text-orange-900 lg:px-8 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-100"
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1">
        {status === "CONNECTING"
          ? "O WhatsApp da clínica está reconectando. Mensagens podem não chegar até concluir."
          : "O WhatsApp da clínica está desconectado. Mensagens não estão sendo enviadas nem recebidas."}
      </span>
      {canReconnect ? (
        <Button size="sm" variant="outline" className="h-7 border-orange-400 bg-white/70 text-orange-900 hover:bg-white" asChild>
          <Link to="/configuracoes?aba=whatsapp">Reconectar</Link>
        </Button>
      ) : (
        <span className="text-[12px] font-normal">Avise a administradora da clínica para reconectar.</span>
      )}
    </div>
  )
}
