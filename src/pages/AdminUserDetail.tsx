import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Building2, Clock, KeyRound, Lock, User, UserCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuthStore } from "@/stores/useAuthStore"

type UserDetail = {
  id: string
  name: string
  email: string
  phone: string | null
  systemRole: string
  status: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  blockedAt: string | null
  blockedReason: string | null
  clinics: Array<{
    role: string
    clinic: { id: string; name: string; slug: string; status: string }
  }>
  sessions: Array<{
    id: string
    createdAt: string
    lastUsedAt: string
    ipAddress: string | null
    userAgent: string | null
  }>
  loginEvents: Array<{
    id: string
    event: string
    ipAddress: string | null
    createdAt: string
  }>
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [userData, setUserData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const currentUser = useAuthStore((state) => state.user)

  const fetchUserDetail = () => {
    if (!id) return
    setLoading(true)
    fetch(`/api/admin/users/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Usuário não encontrado.")
        return res.json()
      })
      .then((data) => {
        setUserData(data.user)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchUserDetail()
  }, [id])

  const handleToggleBlock = async () => {
    if (!userData) return
    const isBlocking = userData.status === "active"
    const action = isBlocking ? "bloquear" : "desbloquear"

    if (!confirm(`Deseja ${action} o usuário ${userData.email}?`)) return
    setActionLoading(true)

    try {
      const endpoint = isBlocking ? `/api/admin/users/${id}/block` : `/api/admin/users/${id}/unblock`
      const res = await fetch(endpoint, { method: "POST" })
      if (res.ok) {
        fetchUserDetail()
      } else {
        const data = await res.json()
        alert(data.error?.message || `Erro ao ${action}.`)
      }
    } catch {
      alert("Erro de conexão.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeSessions = async () => {
    if (!userData) return
    if (!confirm(`Encerrar todas as sessões ativas de ${userData.email}?`)) return

    try {
      const res = await fetch(`/api/admin/users/${id}/revoke-sessions`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        fetchUserDetail()
      } else {
        alert(data.error?.message || "Erro ao revogar sessões.")
      }
    } catch {
      alert("Erro de conexão.")
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !userData) {
    return (
      <div className="mx-auto max-w-5xl p-4 lg:p-8">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="mr-2 size-4" /> Voltar
        </Button>
        <Card className="mt-4 border-destructive/30 bg-destructive/10">
          <CardContent className="p-6 text-xs text-destructive">{error || "Usuário não encontrado."}</CardContent>
        </Card>
      </div>
    )
  }

  const primaryClinicRel = userData.clinics[0]

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="mr-2 size-4" /> Voltar para Usuários
        </Button>

        {userData.id !== currentUser?.id && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRevokeSessions}>
              <KeyRound className="mr-2 size-4 text-amber-500" /> Revogar Sessões
            </Button>

            {userData.status === "active" ? (
              <Button variant="destructive" size="sm" onClick={handleToggleBlock} disabled={actionLoading}>
                <Lock className="mr-2 size-4" /> Bloquear Usuário
              </Button>
            ) : (
              <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleToggleBlock} disabled={actionLoading}>
                <UserCheck className="mr-2 size-4" /> Desbloquear Usuário
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card do Usuário */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="size-5 text-primary" /> {userData.name}
              </CardTitle>
              {userData.status === "active" ? (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="destructive">Bloqueado</Badge>
              )}
            </div>
            <CardDescription>{userData.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground">ID do Usuário:</span>
                <p className="font-mono text-[11px] mt-0.5">{userData.id}</p>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Telefone:</span>
                <p className="mt-0.5">{userData.phone || "Não informado"}</p>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">System Role (Global):</span>
                <p className="mt-0.5 font-semibold text-primary">{userData.systemRole}</p>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Data de Cadastro:</span>
                <p className="mt-0.5">{new Date(userData.createdAt).toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Último Login:</span>
                <p className="mt-0.5">{userData.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleString("pt-BR") : "Nunca"}</p>
              </div>
            </div>

            {userData.blockedAt && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <p className="font-semibold">Bloqueado em: {new Date(userData.blockedAt).toLocaleString("pt-BR")}</p>
                <p className="mt-1">Motivo: {userData.blockedReason || "Não especificado"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card da Clínica Vinculada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4 text-amber-500" /> Clínica Vinculada
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-3">
            {primaryClinicRel ? (
              <>
                <div>
                  <p className="font-semibold text-sm">{primaryClinicRel.clinic.name}</p>
                  <p className="text-[11px] text-muted-foreground">slug: {primaryClinicRel.clinic.slug}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Função na Clínica:</span>
                  <Badge variant="outline" className="ml-2">
                    {primaryClinicRel.role}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Status da Clínica:</span>
                  <Badge variant="outline" className="ml-2 border-emerald-500 text-emerald-600">
                    {primaryClinicRel.clinic.status}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Nenhuma clínica vinculada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Sessões Ativas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-primary" /> Sessões Ativas ({userData.sessions.length})
          </CardTitle>
          <CardDescription>Conexões em andamento mantidas no banco de dados.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criada em</TableHead>
                <TableHead>Última Atividade</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Navegador / User Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userData.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                    Nenhuma sessão ativa no momento.
                  </TableCell>
                </TableRow>
              ) : (
                userData.sessions.map((sess) => (
                  <TableRow key={sess.id}>
                    <TableCell className="text-xs">{new Date(sess.createdAt).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{new Date(sess.lastUsedAt).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs font-mono">{sess.ipAddress || "—"}</TableCell>
                    <TableCell className="text-xs truncate max-w-xs text-muted-foreground">{sess.userAgent || "—"}</TableCell>
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

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}
