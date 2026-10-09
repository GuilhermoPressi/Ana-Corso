import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CalendarCheck2, CheckCircle2, Loader2, RefreshCw, Unplug } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type GoogleStatus = {
  configured: boolean
  account: { email: string; connectedAt: string; lastError: string | null } | null
  failedEvents: number
}

async function api<T>(method: string, url: string): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? "{}" : undefined,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message ?? `Erro ${res.status}`)
  return json as T
}

/** Conexão do Google Agenda do usuário logado (agendamentos vão para a agenda dele). */
export function GoogleCalendarCard() {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null)

  const load = useCallback(async () => {
    try {
      setStatus(await api<GoogleStatus>("GET", "/api/integrations/google"))
    } catch {
      setStatus({ configured: false, account: null, failedEvents: 0 })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function connect() {
    setBusy("connect")
    try {
      const { url } = await api<{ url: string }>("POST", "/api/integrations/google/connect")
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar a conexão.")
      setBusy(null)
    }
  }

  async function sync() {
    setBusy("sync")
    try {
      const result = await api<{ total: number; failed: number }>("POST", "/api/integrations/google/sync")
      if (result.failed > 0) toast.error(`${result.failed} de ${result.total} agendamentos não puderam ser enviados.`)
      else toast.success(`${result.total} agendamento(s) enviados ao Google Agenda.`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao sincronizar.")
    } finally {
      setBusy(null)
    }
  }

  async function disconnect() {
    if (!window.confirm("Desconectar o Google Agenda? Os eventos já enviados continuam no Google, mas novos agendamentos deixam de ir para lá.")) {
      return
    }
    setBusy("disconnect")
    try {
      await api("POST", "/api/integrations/google/disconnect")
      toast.success("Google Agenda desconectado.")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desconectar.")
    } finally {
      setBusy(null)
    }
  }

  const account = status?.account

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-display">
            <CalendarCheck2 className="size-5 text-primary" /> Google Agenda
          </CardTitle>
          {status && (
            <Badge
              variant="outline"
              className={account && !account.lastError ? "rounded-full border-success/30 bg-success/10 text-success" : "rounded-full"}
            >
              {account ? (account.lastError ? "Precisa reconectar" : "Conectado") : "Desconectado"}
            </Badge>
          )}
        </div>
        <CardDescription>
          Cada agendamento criado, alterado ou cancelado no app vai automaticamente para o seu Google Agenda.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!status ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Verificando…
          </div>
        ) : !status.configured ? (
          <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            A integração com o Google Agenda ainda não foi habilitada no servidor. Peça ao suporte para configurar.
          </p>
        ) : account ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-7 text-success" />
                <div>
                  <p className="font-medium">{account.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Conectado em {new Date(account.connectedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={sync} disabled={busy !== null}>
                  {busy === "sync" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Enviar agendamentos futuros
                </Button>
                <Button variant="ghost" size="sm" onClick={disconnect} disabled={busy !== null}>
                  <Unplug /> Desconectar
                </Button>
              </div>
            </div>
            {account.lastError && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-[13px] text-warning-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-2">
                  <p>{account.lastError}</p>
                  <Button size="sm" variant="outline" onClick={connect} disabled={busy !== null}>
                    Reconectar
                  </Button>
                </div>
              </div>
            )}
            {status.failedEvents > 0 && !account.lastError && (
              <p className="text-[12px] text-muted-foreground">
                {status.failedEvents} agendamento(s) futuros não foram enviados. Clique em "Enviar agendamentos futuros" para tentar de novo.
              </p>
            )}
            <p className="text-[12px] text-muted-foreground">
              Os agendamentos vão para a agenda da profissional responsável. Se ela não conectou o Google, vão para a
              agenda da dona da clínica.
            </p>
          </>
        ) : (
          <Button onClick={connect} disabled={busy !== null}>
            {busy === "connect" ? <Loader2 className="animate-spin" /> : <CalendarCheck2 />} Conectar Google Agenda
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
