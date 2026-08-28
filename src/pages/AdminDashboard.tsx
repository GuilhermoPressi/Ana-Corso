import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Building2, ShieldAlert, UserCheck, UserPlus, Users, UserX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AdminStats = {
  totalUsers: number
  activeUsers: number
  blockedUsers: number
  totalClinics: number
  newUsersLast7Days: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar estatísticas.")
        return res.json()
      })
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
            <ShieldAlert className="size-4" /> ADMIN PAINEL
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight mt-1">Visão Geral do SaaS</h1>
          <p className="text-xs text-muted-foreground">
            Métricas em tempo real vindas do banco de dados PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/users">
              <Users className="size-4 mr-2" /> Gerenciar Usuários
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/clinics">
              <Building2 className="size-4 mr-2" /> Listar Clínicas
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-muted/40" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6 text-xs text-destructive">{error}</CardContent>
        </Card>
      ) : stats ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total de Usuários</CardTitle>
                <Users className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Contas registradas na plataforma</p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Usuários Ativos</CardTitle>
                <UserCheck className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.activeUsers}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Contas com acesso liberado</p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Usuários Bloqueados</CardTitle>
                <UserX className="size-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {stats.blockedUsers}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Acesso temporariamente suspenso</p>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total de Clínicas</CardTitle>
                <Building2 className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClinics}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Organizações cadastradas</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="size-4 text-primary" /> Novos Cadastros (Últimos 7 dias)
              </CardTitle>
              <CardDescription>
                Crescimento recente de usuários registrados no banco.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.newUsersLast7Days}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Novas contas criadas nos últimos 7 dias.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
