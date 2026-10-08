import { useCallback, useRef, useState } from "react"
import { CheckCircle2, Loader2, QrCode, RefreshCw, Smartphone, Unplug, X } from "lucide-react"
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
  // Pareamento em andamento: o QR fica na tela até conectar ou a pessoa cancelar.
  const [pairing, setPairing] = useState(false)
  // Último QR exibido, mantido enquanto um código novo é gerado (evita a tela "piscar").
  const [lastQr, setLastQr] = useState<string | null>(null)
  const [pairingError, setPairingError] = useState<string | null>(null)
  const pairingRef = useRef(false)
  const regenerating = useRef(false)
  const lastRegenerateAt = useRef(0)
  const initialLoadDone = useRef(false)

  const status = instance?.status ?? "DISCONNECTED"

  function finishPairing(connected: boolean) {
    pairingRef.current = false
    setPairing(false)
    setLastQr(null)
    setPairingError(null)
    if (connected) {
      toast.success("WhatsApp conectado!")
      onConnected?.()
    }
  }

  /** Pede um QR novo à Evolution sem tirar o cartão da tela (QR expirado ou tentativa encerrada). */
  const regenerate = useCallback(async () => {
    if (regenerating.current || Date.now() - lastRegenerateAt.current < 10_000) return
    regenerating.current = true
    lastRegenerateAt.current = Date.now()
    try {
      const { instance: next } = await crmApi.connectWhatsapp()
      if (!pairingRef.current) return
      setInstance(next)
      if (next.qrCode) setLastQr(next.qrCode)
      setPairingError(null)
    } catch (err) {
      setPairingError(err instanceof Error ? err.message : "Não foi possível gerar um novo código.")
    } finally {
      regenerating.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await crmApi.whatsappStatus()
      setConfigured(data.configured)
      const next = data.instance
      setInstance(next)

      // Reabriu a tela no meio de um pareamento: continua mostrando o QR.
      // Só na primeira carga, para uma consulta atrasada não desfazer um "Cancelar".
      const firstLoad = !initialLoadDone.current
      initialLoadDone.current = true
      if (firstLoad && !pairingRef.current && next?.status === "CONNECTING" && canManage) {
        pairingRef.current = true
        setPairing(true)
      }

      if (pairingRef.current) {
        if (next?.status === "CONNECTED") {
          finishPairing(true)
        } else if (next?.qrCode) {
          setLastQr(next.qrCode)
        } else {
          // A Evolution encerrou a tentativa (QR expirou): gera outro automaticamente.
          regenerate()
        }
      }
    } catch {
      // mantém o último estado conhecido
    } finally {
      setLoaded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, regenerate])

  // Durante o pareamento consulta a cada 3s; fora dele, só de vez em quando.
  usePolling(refresh, pairing ? 3000 : 30000, [pairing])

  async function connect() {
    setBusy(true)
    setPairingError(null)
    try {
      const { instance: next } = await crmApi.connectWhatsapp()
      setInstance(next)
      if (next.status === "CONNECTED") {
        finishPairing(true)
      } else {
        pairingRef.current = true
        lastRegenerateAt.current = Date.now()
        setPairing(true)
        setLastQr(next.qrCode)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar a conexão.")
    } finally {
      setBusy(false)
    }
  }

  async function cancelPairing() {
    finishPairing(false)
    setBusy(true)
    try {
      const { instance: next } = await crmApi.disconnectWhatsapp()
      setInstance(next)
    } catch {
      // a instância pode já estar fechada; nada a fazer
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
      setInstance(next)
      toast.success("WhatsApp desconectado.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desconectar.")
    } finally {
      setBusy(false)
    }
  }

  const qrToShow = pairing ? (instance?.qrCode ?? lastQr) : null
  const qrIsFresh = Boolean(pairing && instance?.status === "CONNECTING" && instance.qrCode)
  const badgeStatus = pairing && status !== "CONNECTED" ? "CONNECTING" : status

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
                badgeStatus === "CONNECTED" && "border-success/30 bg-success/10 text-success",
                badgeStatus === "CONNECTING" && "border-warning/30 bg-warning/10 text-warning-foreground",
              )}
            >
              {statusLabel[badgeStatus]}
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
        ) : pairing ? (
          <div className="grid items-center gap-6 sm:grid-cols-[220px_1fr]">
            <div className="relative size-[220px]">
              {qrToShow ? (
                <img
                  src={qrToShow.startsWith("data:") ? qrToShow : `data:image/png;base64,${qrToShow}`}
                  alt="QR Code para conectar o WhatsApp"
                  className={cn("size-full rounded-xl border bg-white p-2 transition-opacity", !qrIsFresh && "opacity-30")}
                />
              ) : (
                <div className="size-full rounded-xl border bg-muted/40" />
              )}
              {!qrIsFresh && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs font-medium text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  Gerando novo código…
                </div>
              )}
            </div>
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
                <Loader2 className="size-3.5 animate-spin" /> Aguardando a leitura. O código é renovado automaticamente até
                você conectar ou cancelar.
              </p>
              {pairingError && <p className="text-xs text-destructive">{pairingError}</p>}
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      lastRegenerateAt.current = 0
                      regenerate()
                    }}
                    disabled={busy}
                  >
                    <RefreshCw /> Gerar novo código
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelPairing} disabled={busy}>
                    <X /> Cancelar
                  </Button>
                </div>
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
