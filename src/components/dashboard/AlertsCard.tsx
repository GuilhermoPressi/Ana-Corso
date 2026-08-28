import { useMemo } from "react"
import {
  AlertTriangle,
  CalendarX2,
  ChevronRight,
  FileText,
  Info,
  PackageX,
  UserRoundX,
} from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CLINIC_TODAY } from "@/lib/clinic"
import { cn, formatCurrency } from "@/lib/utils"
import {
  daysUntilExpiry,
  selectExpiringSoon,
  selectLowStock,
  useInventoryStore,
} from "@/stores/useInventoryStore"
import { selectLeadsByStage, usePatientStore } from "@/stores/usePatientStore"

type AlertLevel = "critico" | "atencao" | "info"

type DashboardAlert = {
  id: string
  level: AlertLevel
  icon: typeof PackageX
  title: string
  description: string
  action: string
  to: string
}

const levelConfig: Record<AlertLevel, { wrapper: string; iconClass: string }> = {
  critico: {
    wrapper: "border-destructive/20 bg-destructive/[0.04] hover:bg-destructive/[0.07]",
    iconClass: "bg-destructive/10 text-destructive",
  },
  atencao: {
    wrapper: "border-warning/25 bg-warning/[0.05] hover:bg-warning/[0.09]",
    iconClass: "bg-warning/15 text-warning",
  },
  info: {
    wrapper: "border-border/70 bg-muted/40 hover:bg-muted/70",
    iconClass: "bg-secondary text-secondary-foreground",
  },
}

const decimal = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })

export function AlertsCard() {
  const products = useInventoryStore((state) => state.products)
  const expiryWindow = useInventoryStore((state) => state.expiryWindowDays)
  const patients = usePatientStore((state) => state.patients)
  const leads = usePatientStore((state) => state.leads)

  const alerts = useMemo<DashboardAlert[]>(() => {
    const result: DashboardAlert[] = []

    // Estoque abaixo do mínimo
    const lowStock = selectLowStock(products)
    if (lowStock.length > 0) {
      const worst = lowStock[0]
      result.push({
        id: "estoque-minimo",
        level: "critico",
        icon: PackageX,
        title: `${worst.name} · restam ${decimal(worst.quantity)} ${worst.contentUnit}`,
        description: [
          `O mínimo é ${decimal(worst.minQuantity)} ${worst.contentUnit}.`,
          lowStock.length > 1
            ? `Mais ${lowStock.length - 1} ${
                lowStock.length - 1 === 1 ? "produto também está" : "produtos também estão"
              } em falta.`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
        action: "Ver estoque",
        to: "/estoque",
      })
    }

    // Lotes vencendo
    const expiring = selectExpiringSoon(products, expiryWindow)
    if (expiring.length > 0) {
      const nearest = expiring[0]
      const days = daysUntilExpiry(nearest)
      result.push({
        id: "estoque-validade",
        level: "atencao",
        icon: CalendarX2,
        title: `${expiring.length} ${
          expiring.length === 1 ? "produto próximo" : "produtos próximos"
        } do vencimento`,
        description: `O mais urgente é ${nearest.name}, lote ${nearest.lot}, em ${days} ${
          days === 1 ? "dia" : "dias"
        }.`,
        action: "Ver lotes",
        to: "/estoque",
      })
    }

    // Pacientes inativas
    const inactive = patients.filter((patient) => patient.status === "inativa")
    if (inactive.length > 0) {
      const value = inactive.reduce((sum, patient) => sum + patient.totalSpent, 0)
      result.push({
        id: "pacientes-inativas",
        level: "critico",
        icon: UserRoundX,
        title: `${inactive.length} ${
          inactive.length === 1 ? "paciente sem retorno" : "pacientes sem retorno"
        } há mais de 90 dias`,
        description: `${
          inactive.length === 1 ? "Soma" : "Juntas somam"
        } ${formatCurrency(value)} em ticket histórico.`,
        action: "Abrir recuperador",
        to: "/recuperador",
      })
    }

import type { Lead } from "@/data/leads"

    // Leads parados
    const stalled = selectLeadsByStage(leads, "novos-contatos").filter(
      (lead: Lead) => lead.createdAt < CLINIC_TODAY && !lead.scheduledFor,
    )
    if (stalled.length > 0) {
      result.push({
        id: "leads-parados",
        level: "atencao",
        icon: AlertTriangle,
        title: `${stalled.length} ${
          stalled.length === 1 ? "lead sem resposta" : "leads sem resposta"
        } há mais de um dia`,
        description: "Leads de Instagram costumam esfriar depois da primeira hora.",
        action: "Abrir CRM",
        to: "/crm",
      })
    }

    result.push({
      id: "documentos",
      level: "info",
      icon: FileText,
      title: "5 termos de consentimento pendentes",
      description: "Assinaturas pendentes de atendimentos desta semana.",
      action: "Ver documentos",
      to: "/documentos",
    })

    return result
  }, [products, expiryWindow, patients, leads])

  const criticalCount = alerts.filter((alert) => alert.level === "critico").length

  return (
    <Card className="border-border/70 shadow-[var(--shadow-soft)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="font-display text-base">Precisa da sua atenção</CardTitle>
          {criticalCount > 0 && (
            <Badge className="h-5 rounded-full bg-destructive px-2 text-[10px] font-semibold text-white">
              {criticalCount} urgente{criticalCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <CardDescription className="mt-1">
          Estoque, retornos e relacionamento — lidos direto da operação
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {alerts.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <div className="grid size-11 place-items-center rounded-2xl bg-success/10">
              <Info className="size-5 text-success" />
            </div>
            <p className="mt-3.5 text-[13px] text-muted-foreground">
              Nada pendente por aqui. Dia tranquilo na operação.
            </p>
          </div>
        )}

        {alerts.map((alert) => {
          const config = levelConfig[alert.level]
          const Icon = alert.icon

          return (
            <Link
              key={alert.id}
              to={alert.to}
              className={cn(
                "group flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                config.wrapper,
              )}
            >
              <span
                className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", config.iconClass)}
              >
                <Icon className="size-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug">{alert.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {alert.description}
                </p>
              </div>

              <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                <span className="hidden sm:inline">{alert.action}</span>
                <ChevronRight className="size-3.5" />
              </span>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
