import { useEffect, useState } from "react"
import { Building2, ShieldAlert, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ClinicItem = {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
  usersCount: number
  owner: { id: string; name: string; email: string } | null
}

export default function AdminClinics() {
  const [clinics, setClinics] = useState<ClinicItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/clinics")
      .then((res) => res.json())
      .then((data) => {
        setClinics(data.clinics || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
            <ShieldAlert className="size-4" /> ADMIN
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight mt-1">Clínicas Cadastradas</h1>
          <p className="text-xs text-muted-foreground">
            Listagem de todas as organizações e seus respectivos responsáveis no PostgreSQL.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-5 text-amber-500" /> Organizações ({clinics.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Clínica</TableHead>
                <TableHead>Slug Único</TableHead>
                <TableHead>Proprietário (Owner)</TableHead>
                <TableHead>Usuários Vinculados</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    Carregando clínicas...
                  </TableCell>
                </TableRow>
              ) : clinics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    Nenhuma clínica cadastrada no momento.
                  </TableCell>
                </TableRow>
              ) : (
                clinics.map((clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell className="font-semibold text-xs">{clinic.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{clinic.slug}</TableCell>
                    <TableCell className="text-xs">
                      {clinic.owner ? (
                        <div>
                          <p className="font-medium text-foreground">{clinic.owner.name}</p>
                          <p className="text-[11px] text-muted-foreground">{clinic.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-muted-foreground" />
                        {clinic.usersCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      {clinic.status === "active" ? (
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-[10px]">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Bloqueada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(clinic.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
