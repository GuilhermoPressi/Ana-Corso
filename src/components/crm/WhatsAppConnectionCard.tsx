import { useCallback, useRef, useState } from "react"
import { CheckCircle2, Loader2, QrCode, RefreshCw, Smartphone, Unplug } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePolling } from "@/hooks/usePolling"
import { crmApi, formatPhone, type WhatsAppInstance } from "@/lib/crm-api"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/useAuthStore"

const statusLabel = {
  CONNECTED: "Conectado",
  CONNECTING: "Aguardando leitura do QR",
  DISCONNECTED: "Desconectado",
} as const

function canManageWhatsApp(role: string | null) {
  return role === "OWNER" || role === "ADMIN"
}

/**
 * Conexão do WhatsApp da clínica via Evolution API: gera o QR Code, acompanha
 * a leitura e permite desconectar. Usado em Configurações e na aba Conversas.
 */
export function WhatsAppConnectionCard({
  compact = false,
  onConnected,
}: {
  compact?: boolean
  onConnected?: () => void
}) {
  const clinicRole = useAuthStore((s) => s.clinicRole)
  const canManage = canManageWhatsApp(clinicRole)
  const [loaded, setLoaded] = useState(false)
  const [configured, setConfigured] = useState(true)
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null)
  const [busy, setBusy] = useState(false)
  const lastStatus = useRef<string | null>(null)

  const status = instance?.status ?? "DISCONNECTED"

  const refresh = useCallback(async () => {
    try {
      const data = await crmApi.whatsappStatus()
      setConfigured(data.configured)
      const next = data.instance?.status ?? "DISCONNECTED"
      if (lastStatus.current === "CONNECTING" && next === "CONNECTED") {
        toast.success("WhatsApp conectado!")
        onConnected?.()
      }
      lastStatus.current = next
      setInstance(data.instance)
    } catch {
      // mantém o último estado conhecido
    } finally {
      setLoaded(true)
    }
  }, [onConnected])

  // Enquanto aguarda o QR, consulta com mais frequência.
  usePolling(refresh, status === "CONNECTING" ? 3000 : 30000, [status])

  async function connect() {
    setBusy(true)
    try {
      const { instance: next } = await crmApi.connectWhatsapp()
      lastStatus.current = next.status
      setInstance(next)
      if (next.status === "CONNECTED") onConnected?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar a conexão.")
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (!window.confirm("Desconectar o WhatsApp da clínica? As conversas ficam salvas, mas novas mensagens deixam de chegar.")) {
      return
    }
    setBusy(true)
    try {
      const { instance: next } = await crmApi.disconnectWhatsapp()
      lastStatus.current = next?.status ?? "DISCONNECTED"
      setInstance(next)
      toast.success("WhatsApp desconectado.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desconectar.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={cn(compact && "mx-auto max-w-xl")}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-display">
            <Smartphone className="size-5 text-primary" /> WhatsApp da clínica
          </CardTitle>
          {loaded && (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full",
                status === "CONNECTED" && "border-success/30 bg-success/10 text-success",
                status === "CONNECTING" && "border-warning/30 bg-warning/10 text-warning-foreground",
              )}
            >
              {statusLabel[status]}
            </Badge>
          )}
        </div>
        <CardDescription>
          Conecte o número de atendimento para receber e responder as mensagens direto pelo CRM.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!loaded ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Verificando conexão…
          </div>
        ) : !configured ? (
          <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            A integração com o WhatsApp ainda não foi habilitada no servidor. Peça ao suporte para configurar a Evolution API.
          </p>
        ) : status === "CONNECTED" ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-8 text-success" />
              <div>
                <p className="font-medium">{instance?.profileName || "Número conectado"}</p>
                {instance?.phoneNumber && (
                  <p className="text-sm text-muted-foreground">{formatPhone(instance.phoneNumber)}</p>
                )}
              </div>
            </div>
            {canManage && (
              <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>
                <Unplug /> Desconectar
              </Button>
            )}
          </div>
        ) : status === "CONNECTING" && instance?.qrCode ? (
          <div className="grid items-center gap-6 sm:grid-cols-[220px_1fr]">
            <img
              src={instance.qrCode.startsWith("data:") ? instance.qrCode : `data:image/png;base64,${instance.qrCode}`}
              alt="QR Code para conectar o WhatsApp"
              className="size-[220px] rounded-xl border bg-white p-2"
            />
            <div className="space-y-3 text-sm">
              <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
                <li>Abra o WhatsApp no celular da clínica.</li>
                <li>
                  Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong> → <strong>Aparelhos conectados</strong>.
                </li>
                <li>
                  Toque em <strong>Conectar um aparelho</strong> e aponte a câmera para este código.
                </li>
              </ol>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> O código se renova sozinho. Esta tela atualiza quando a leitura terminar.
              </p>
              {canManage && (
                <Button variant="outline" size="sm" onClick={connect} disabled={busy}>
                  <RefreshCw /> Gerar novo código
                </Button>
              )}
            </div>
          </div>
        ) : canManage ? (
          <Button onClick={connect} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <QrCode />} Conectar WhatsApp
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            O WhatsApp não está conectado. Peça a uma pessoa administradora da clínica para conectar.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
