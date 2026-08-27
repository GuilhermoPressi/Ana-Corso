import { useMemo, useState } from "react"
import { ArrowUpDown, ChevronRight, Filter, MessageCircle, Search, X } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/layout/PageHeader"
import { NewPatientDialog } from "@/components/patients/NewPatientDialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { procedureFilters, type PatientStatus } from "@/data/patients"
import { countByStatus, usePatientStore } from "@/stores/usePatientStore"
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils"

const statusStyles: Record<PatientStatus, string> = {
  ativa: "border-success/25 bg-success/10 text-success",
  atencao: "border-warning/30 bg-warning/12 text-warning-foreground",
  inativa: "border-border bg-muted text-muted-foreground",
}

const statusLabels: Record<PatientStatus, string> = {
  ativa: "Ativa",
  atencao: "Atenção",
  inativa: "Inativa",
}

const sortOptions = [
  { id: "recentes", label: "Última visita" },
  { id: "valor", label: "Maior investimento" },
  { id: "nome", label: "Nome (A-Z)" },
  { id: "sessoes", label: "Mais sessões" },
] as const

type SortId = (typeof sortOptions)[number]["id"]

export default function Pacientes() {
  const navigate = useNavigate()
  const patients = usePatientStore((state) => state.patients)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"todas" | PatientStatus>("todas")
  const [procedure, setProcedure] = useState(procedureFilters[0])
  const [sort, setSort] = useState<SortId>("recentes")

  const counts = useMemo(() => countByStatus(patients), [patients])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    const result = patients.filter((patient) => {
      const matchesSearch =
        !term ||
        patient.name.toLowerCase().includes(term) ||
        patient.phone.includes(term) ||
        patient.email.toLowerCase().includes(term) ||
        patient.tags.some((tag) => tag.toLowerCase().includes(term))

      const matchesStatus = status === "todas" || patient.status === status
      const matchesProcedure =
        procedure === procedureFilters[0] ||
        patient.mainProcedure === procedure ||
        patient.procedures.some((item) => item.procedure === procedure)

      return matchesSearch && matchesStatus && matchesProcedure
    })

    return [...result].sort((a, b) => {
      if (sort === "valor") return b.totalSpent - a.totalSpent
      if (sort === "nome") return a.name.localeCompare(b.name, "pt-BR")
      if (sort === "sessoes") return b.sessions - a.sessions
      return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
    })
  }, [patients, search, status, procedure, sort])

  const hasFilters = search !== "" || status !== "todas" || procedure !== procedureFilters[0]

  function clearFilters() {
    setSearch("")
    setStatus("todas")
    setProcedure(procedureFilters[0])
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Pacientes"
        description={`${counts.todas} pacientes cadastradas · ${counts.ativa} ativas neste trimestre`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <MessageCircle /> Disparo em massa
            </Button>
            <NewPatientDialog />
          </>
        }
      />

      {/* Filtros rápidos por status */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            { id: "todas", label: "Todas as pacientes", value: counts.todas, tone: "text-foreground" },
            { id: "ativa", label: "Ativas", value: counts.ativa, tone: "text-success" },
            { id: "atencao", label: "Precisam de atenção", value: counts.atencao, tone: "text-warning" },
            { id: "inativa", label: "Inativas há 6+ meses", value: counts.inativa, tone: "text-muted-foreground" },
          ] as const
        ).map((item) => (
          <button key={item.id} onClick={() => setStatus(item.id)} className="text-left">
            <Card
              className={cn(
                "gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5",
                status === item.id && "border-primary/40 ring-1 ring-primary/20",
              )}
            >
              <CardContent className="px-4 py-3.5">
                <p className="text-[12px] font-medium text-muted-foreground">{item.label}</p>
                <p className={cn("mt-1.5 font-display text-2xl font-semibold tabular-nums", item.tone)}>
                  {item.value}
                </p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
        {/* Barra de filtros */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border/70 bg-muted/25 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, telefone, e-mail ou tag..."
              className="h-9 bg-card pl-9 text-[13px]"
            />
          </div>

          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger size="sm" className="w-[170px] bg-card text-[13px]">
              <Filter className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os status</SelectItem>
              <SelectItem value="ativa">Ativas</SelectItem>
              <SelectItem value="atencao">Atenção</SelectItem>
              <SelectItem value="inativa">Inativas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={procedure} onValueChange={setProcedure}>
            <SelectTrigger size="sm" className="w-[210px] bg-card text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {procedureFilters.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value) => setSort(value as SortId)}>
            <SelectTrigger size="sm" className="w-[180px] bg-card text-[13px]">
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X /> Limpar
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[240px] pl-4">Paciente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-[180px]">Procedimento principal</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead>Próximo retorno</TableHead>
                <TableHead className="text-right">Sessões</TableHead>
                <TableHead className="text-right">Investimento</TableHead>
                <TableHead className="w-10 pr-4" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((patient) => (
                <TableRow
                  key={patient.id}
                  onClick={() => navigate(`/pacientes/${patient.id}`)}
                  className="cursor-pointer border-border/60"
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                          {initials(patient.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{patient.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {patient.phone} · {patient.city}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", statusStyles[patient.status])}>
                      {statusLabels[patient.status]}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <p className="text-[13px]">{patient.mainProcedure}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{patient.professional}</p>
                  </TableCell>

                  <TableCell className="text-[13px] tabular-nums">{formatDate(patient.lastVisit)}</TableCell>

                  <TableCell>
                    {patient.nextReturn ? (
                      <span className="text-[13px] tabular-nums">{formatDate(patient.nextReturn)}</span>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right text-[13px] tabular-nums">{patient.sessions}</TableCell>

                  <TableCell className="text-right text-[13px] font-semibold tabular-nums">
                    {formatCurrency(patient.totalSpent)}
                  </TableCell>

                  <TableCell className="pr-4">
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-accent">
              <Search className="size-5 text-primary" />
            </div>
            <p className="mt-4 font-display text-[15px] font-semibold">Nenhuma paciente encontrada</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
              Ajuste os filtros ou cadastre uma nova paciente para começar o acompanhamento.
            </p>
            <Button variant="outline" size="sm" className="mt-5" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/70 bg-muted/25 px-4 py-3 text-[12px] text-muted-foreground">
            <span>
              Exibindo {filtered.length} de {patients.length} pacientes
            </span>
            <span className="tabular-nums">
              Investimento somado: {formatCurrency(filtered.reduce((sum, p) => sum + p.totalSpent, 0))}
            </span>
          </div>
        )}
      </Card>
    </div>
  )
}
