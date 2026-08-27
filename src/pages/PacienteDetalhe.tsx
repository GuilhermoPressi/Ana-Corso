import {
  ArrowLeft,
  CalendarPlus,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Sparkles,
  Syringe,
  TriangleAlert,
} from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { PhotoGallery } from "@/components/patients/PhotoGallery"
import { RegisterIncidentDialog } from "@/components/patients/RegisterIncidentDialog"
import { RegisterProcedureDialog } from "@/components/patients/RegisterProcedureDialog"
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PatientStatus, ReturnRecord, TimelineKind } from "@/data/patients"
import { usePatientStore } from "@/stores/usePatientStore"
import { CLINIC_TODAY } from "@/lib/clinic"
import {
  ageFrom,
  cn,
  formatCurrency,
  formatDate,
  formatDateLong,
  initials,
  parseLocalDate,
} from "@/lib/utils"
import { contextualMessage, firstNameOf } from "@/lib/whatsapp"
import { daysSince } from "@/lib/recovery"

const statusStyles: Record<PatientStatus, string> = {
  ativa: "border-success/25 bg-success/10 text-success",
  atencao: "border-warning/30 bg-warning/12 text-warning-foreground",
  inativa: "border-border bg-muted text-muted-foreground",
}

const statusLabels: Record<PatientStatus, string> = {
  ativa: "Paciente ativa",
  atencao: "Precisa de atenção",
  inativa: "Inativa",
}

const timelineConfig: Record<TimelineKind, { icon: typeof Syringe; className: string }> = {
  procedimento: { icon: Syringe, className: "bg-primary/12 text-primary" },
  retorno: { icon: CheckCircle2, className: "bg-success/12 text-success" },
  avaliacao: { icon: ClipboardList, className: "bg-[hsl(268_52%_70%)]/15 text-[hsl(268_45%_52%)]" },
  mensagem: { icon: MessageCircle, className: "bg-secondary text-secondary-foreground" },
  foto: { icon: Camera, className: "bg-[hsl(190_48%_60%)]/15 text-[hsl(190_45%_40%)]" },
  documento: { icon: FileText, className: "bg-muted text-muted-foreground" },
  financeiro: { icon: CreditCard, className: "bg-[hsl(20_82%_74%)]/20 text-[hsl(20_60%_45%)]" },
}

const returnStyles: Record<ReturnRecord["status"], { label: string; className: string }> = {
  agendado: { label: "Agendado", className: "border-success/25 bg-success/10 text-success" },
  pendente: { label: "A agendar", className: "border-border bg-muted text-muted-foreground" },
  atrasado: { label: "Atrasado", className: "border-destructive/25 bg-destructive/10 text-destructive" },
  concluido: { label: "Concluído", className: "border-border bg-muted text-muted-foreground" },
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-[13px] font-medium">{value}</p>
      </div>
    </div>
  )
}

export default function PacienteDetalhe() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const patient = usePatientStore((state) =>
    patientId ? state.patients.find((item) => item.id === patientId) : undefined,
  )

  if (!patient) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent">
          <TriangleAlert className="size-6 text-primary" />
        </div>
        <h1 className="mt-5 font-display text-xl font-semibold">Paciente não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este cadastro pode ter sido removido ou o endereço está incorreto.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/pacientes">Voltar para a lista</Link>
        </Button>
      </div>
    )
  }

  const openReturns = patient.returns.filter((item) => item.status !== "concluido")
  const nextReturn = openReturns[0]

  const sinceLastVisit = daysSince(patient.lastVisit)
  const birthdayThisMonth =
    patient.birthDate.slice(5, 7) === CLINIC_TODAY.slice(5, 7) && patient.sessions >= 0

  // O rascunho é escolhido pelo contexto e vai invisível no link.
  const whatsappMessage = contextualMessage({
    vars: {
      firstName: firstNameOf(patient.name),
      procedure: patient.mainProcedure,
      lastVisit: patient.lastVisit,
      nextDate: patient.nextReturn,
      monthsSince: Math.round(sinceLastVisit / 30),
      value: patient.ticket,
      professional: patient.professional,
    },
    daysSinceLastVisit: sinceLastVisit,
    hasOverdueReturn: openReturns.some((item) => item.status === "atrasado"),
    hasScheduledReturn: nextReturn?.status === "agendado",
    isInactive: patient.status === "inativa",
    birthdayThisMonth,
  })

  const stats = [
    { label: "Total investido", value: formatCurrency(patient.totalSpent) },
    { label: "Sessões realizadas", value: String(patient.sessions) },
    { label: "Ticket médio", value: formatCurrency(patient.ticket) },
    { label: "Paciente desde", value: formatDate(patient.since) },
  ]

  return (
    <div className="mx-auto max-w-[1200px]">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/pacientes")}
        className="-ml-2 mb-4 text-muted-foreground"
      >
        <ArrowLeft /> Pacientes
      </Button>

      {/* Cabeçalho da ficha */}
      <Card className="mb-5 gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
        <div className="relative isolate">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_140%_at_0%_0%,hsl(335_78%_65%/0.10),transparent_60%)]"
          />

          <CardContent className="px-5 py-5">
            <div className="flex flex-wrap items-start gap-5">
              <Avatar className="size-16 shrink-0 ring-4 ring-primary/10">
                <AvatarFallback className="bg-primary/12 font-display text-lg font-semibold text-primary">
                  {initials(patient.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl font-semibold tracking-tight">{patient.name}</h1>
                  <Badge variant="outline" className={cn("text-[10px]", statusStyles[patient.status])}>
                    {statusLabels[patient.status]}
                  </Badge>
                </div>

                <p className="mt-1 text-[13px] text-muted-foreground">
                  {ageFrom(patient.birthDate)} anos · {patient.skinType} · origem {patient.origin}
                </p>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {patient.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-full text-[10px] font-medium">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <WhatsAppButton phone={patient.phone} message={whatsappMessage} />
                <Button variant="outline" size="sm" asChild>
                  <Link to="/planejamento-facial">
                    <Sparkles /> Planejar
                  </Link>
                </Button>
                <RegisterIncidentDialog patient={patient} />
                <RegisterProcedureDialog patient={patient} />
              </div>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 font-display text-lg font-semibold tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>

      {nextReturn && (
        <Card
          className={cn(
            "mb-5 gap-0 py-0 shadow-[var(--shadow-soft)]",
            nextReturn.status === "atrasado" ? "border-destructive/25 bg-destructive/[0.04]" : "border-border/70",
          )}
        >
          <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl",
                nextReturn.status === "atrasado"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Clock className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">{nextReturn.reason}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {formatDateLong(nextReturn.date)}
                {nextReturn.note ? ` · ${nextReturn.note}` : ""}
              </p>
            </div>
            <Badge variant="outline" className={cn("text-[10px]", returnStyles[nextReturn.status].className)}>
              {returnStyles[nextReturn.status].label}
            </Badge>
            <Button size="sm" variant="outline">
              Confirmar retorno
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="visao-geral">
        <TabsList className="mb-4 h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-muted/60 p-1">
          {[
            { value: "visao-geral", label: "Visão geral" },
            { value: "procedimentos", label: `Procedimentos (${patient.procedures.length})` },
            { value: "linha-do-tempo", label: "Linha do tempo" },
            { value: "retornos", label: `Retornos (${openReturns.length})` },
            { value: "fotos", label: `Antes e depois (${patient.photos.length})` },
            { value: "produtos", label: "Produtos" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Visão geral */}
        <TabsContent value="visao-geral">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <Card className="border-border/70 shadow-[var(--shadow-soft)]">
              <CardHeader>
                <CardTitle className="font-display text-base">Dados de contato</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <InfoRow icon={Phone} label="Telefone" value={patient.phone} />
                <InfoRow icon={Mail} label="E-mail" value={patient.email} />
                <InfoRow icon={MapPin} label="Cidade" value={patient.city} />
                <InfoRow
                  icon={CalendarPlus}
                  label="Nascimento"
                  value={`${formatDate(patient.birthDate)} · ${ageFrom(patient.birthDate)} anos`}
                />
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-[var(--shadow-soft)]">
              <CardHeader>
                <CardTitle className="font-display text-base">Informações clínicas</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Tipo de pele</p>
                    <p className="mt-1 text-[13px] font-medium">{patient.skinType}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Profissional responsável</p>
                    <p className="mt-1 text-[13px] font-medium">{patient.professional}</p>
                  </div>
                </div>

                <div
                  className={cn(
                    "rounded-xl border px-3.5 py-3",
                    patient.allergies.toLowerCase().includes("alergia")
                      ? "border-destructive/25 bg-destructive/[0.05]"
                      : "border-border/70 bg-muted/40",
                  )}
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <TriangleAlert className="size-3" /> Alergias e restrições
                  </p>
                  <p className="mt-1.5 text-[13px]">{patient.allergies}</p>
                </div>

                <div>
                  <p className="text-[11px] text-muted-foreground">Observações da profissional</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/85">{patient.observations}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Procedimentos */}
        <TabsContent value="procedimentos">
          {patient.procedures.length === 0 ? (
            <EmptyState
              icon={Syringe}
              title="Nenhum procedimento registrado"
              description="Os procedimentos aparecem aqui assim que o primeiro atendimento for finalizado."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {patient.procedures.map((record) => (
                <Card key={record.id} className="gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]">
                  <CardContent className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-[15px] font-semibold">{record.procedure}</h3>
                          <span className="text-[12px] text-muted-foreground">{formatDateLong(record.date)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {record.regions.map((region) => (
                            <Badge key={region} variant="outline" className="rounded-full text-[10px]">
                              {region}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <p className="font-display text-[15px] font-semibold tabular-nums">
                        {formatCurrency(record.value)}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-4 rounded-xl bg-muted/35 px-4 py-3 sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Produto</p>
                        <p className="mt-0.5 text-[12px] font-medium">{record.product}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Quantidade</p>
                        <p className="mt-0.5 text-[12px] font-medium">{record.quantity}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Lote</p>
                        <p className="mt-0.5 text-[12px] font-medium">{record.lot ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Profissional</p>
                        <p className="mt-0.5 text-[12px] font-medium">{record.professional}</p>
                      </div>
                    </div>

                    {record.notes && (
                      <p className="mt-3 border-l-2 border-primary/30 pl-3 text-[12px] leading-relaxed text-muted-foreground">
                        {record.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Linha do tempo */}
        <TabsContent value="linha-do-tempo">
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="font-display text-base">Linha do tempo</CardTitle>
              <CardDescription className="mt-1">
                Tudo que aconteceu com {patient.name.split(" ")[0]}, do mais recente ao mais antigo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patient.timeline.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Sem histórico ainda"
                  description="Os eventos aparecem conforme os atendimentos acontecem."
                />
              ) : (
                <div className="relative">
                  <div aria-hidden className="absolute bottom-2 left-[15px] top-2 w-px bg-border" />
                  <div className="flex flex-col gap-5">
                    {patient.timeline.map((event) => {
                      const config = timelineConfig[event.kind]
                      const Icon = config.icon
                      return (
                        <div key={event.id} className="relative flex gap-4">
                          <span
                            className={cn(
                              "z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-card",
                              config.className,
                            )}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <div className="min-w-0 flex-1 pb-0.5">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <p className="text-[13px] font-semibold">{event.title}</p>
                              <span className="text-[11px] text-muted-foreground">{formatDate(event.date)}</span>
                            </div>
                            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retornos */}
        <TabsContent value="retornos">
          {patient.returns.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nenhum retorno programado"
              description="Programe o retorno ao finalizar um procedimento para não perder o acompanhamento."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {patient.returns.map((item) => {
                const style = returnStyles[item.status]
                return (
                  <Card key={item.id} className="gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]">
                    <CardContent className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <div className="w-24 shrink-0">
                        <p className="text-[13px] font-semibold tabular-nums">{formatDate(item.date)}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(parseLocalDate(item.date))}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{item.reason}</p>
                        {item.note && <p className="mt-0.5 text-[12px] text-muted-foreground">{item.note}</p>}
                      </div>

                      <Badge variant="outline" className={cn("text-[10px]", style.className)}>
                        {style.label}
                      </Badge>

                      {item.status !== "concluido" && (
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <MessageCircle /> Lembrar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Antes e depois */}
        <TabsContent value="fotos">
          {patient.photos.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="Nenhuma foto registrada"
              description="Registre fotos padronizadas com consentimento para acompanhar a evolução."
            />
          ) : (
            <PhotoGallery patient={patient} />
          )}
        </TabsContent>

        {/* Produtos */}
        <TabsContent value="produtos">
          {patient.products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum produto utilizado"
              description="Os produtos são registrados automaticamente ao lançar um procedimento."
            />
          ) : (
            <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Produto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-right">Quantidade total</TableHead>
                      <TableHead className="text-right">Sessões</TableHead>
                      <TableHead className="pr-4 text-right">Último uso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.products.map((product) => (
                      <TableRow key={product.id} className="border-border/60">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Syringe className="size-3.5" />
                            </span>
                            <span className="text-[13px] font-medium">{product.product}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">{product.brand}</TableCell>
                        <TableCell className="text-right text-[13px] font-medium tabular-nums">
                          {product.totalQuantity}
                        </TableCell>
                        <TableCell className="text-right text-[13px] tabular-nums">{product.sessions}</TableCell>
                        <TableCell className="pr-4 text-right text-[13px] tabular-nums">
                          {formatDate(product.lastUse)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Syringe
  title: string
  description: string
}) {
  return (
    <Card className="border-border/70 shadow-[var(--shadow-soft)]">
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-accent">
          <Icon className="size-5 text-primary" />
        </div>
        <p className="mt-4 font-display text-[15px] font-semibold">{title}</p>
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
