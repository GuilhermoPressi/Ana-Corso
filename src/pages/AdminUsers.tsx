import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Eye, KeyRound, Lock, Search, ShieldAlert, UserCheck, UserX } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuthStore } from "@/stores/useAuthStore"

type AdminUserItem = {
  id: string
  name: string
  email: string
  phone: string | null
  systemRole: string
  status: string
  createdAt: string
  lastLoginAt: string | null
  blockedAt: string | null
  blockedReason: string | null
  clinic: { id: string; name: string; slug: string } | null
  clinicRole: string | null
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modal block state
  const [blockingUser, setBlockingUser] = useState<AdminUserItem | null>(null)
  const [blockReason, setBlockReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const currentUser = useAuthStore((state) => state.user)

  const fetchUsers = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search.trim()) params.append("search", search.trim())
    if (statusFilter !== "all") params.append("status", statusFilter)

    fetch(`/api/admin/users?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleBlockUser = async () => {
    if (!blockingUser) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/admin/users/${blockingUser.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: blockReason }),
      })

      if (res.ok) {
        setBlockingUser(null)
        setBlockReason("")
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error?.message || "Erro ao bloquear usuário.")
      }
    } catch {
      alert("Erro ao conectar com o servidor.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnblockUser = async (user: AdminUserItem) => {
    if (!confirm(`Deseja desbloquear o acesso para ${user.email}?`)) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/admin/users/${user.id}/unblock`, {
        method: "POST",
      })

      if (res.ok) {
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error?.message || "Erro ao desbloquear usuário.")
      }
    } catch {
      alert("Erro de conexão.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeSessions = async (user: AdminUserItem) => {
    if (!confirm(`Encerrar todas as sessões ativas do usuário ${user.email}?`)) return

    try {
      const res = await fetch(`/api/admin/users/${user.id}/revoke-sessions`, {
        method: "POST",
      })

      const data = await res.json()
      if (res.ok) {
        alert(data.message)
      } else {
        alert(data.error?.message || "Erro ao revogar sessões.")
      }
    } catch {
      alert("Erro de conexão.")
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
            <ShieldAlert className="size-4" /> ADMIN
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight mt-1">Gerenciamento de Usuários</h1>
          <p className="text-xs text-muted-foreground">
            Listagem de todos os usuários registrados no PostgreSQL com controle de acesso e bloqueio.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold">Filtros de Busca</CardTitle>
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar nome, e-mail ou telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-64 pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter === "active" ? "bg-background text-emerald-600 shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Ativos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("blocked")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    statusFilter === "blocked" ? "bg-background text-rose-600 shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Bloqueados
                </button>
              </div>

              <Button type="submit" size="sm" variant="secondary">
                Buscar
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Clínica Vinculada</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    Carregando usuários...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-xs text-foreground">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {user.clinic ? (
                        <div>
                          <span className="font-medium">{user.clinic.name}</span>
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {user.clinicRole}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.systemRole === "admin" ? (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          User
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.status === "active" ? (
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Bloqueado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("pt-BR") : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="size-8" asChild title="Ver detalhes">
                          <Link to={`/admin/users/${user.id}`}>
                            <Eye className="size-3.5" />
                          </Link>
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-amber-600 hover:text-amber-700"
                          onClick={() => handleRevokeSessions(user)}
                          title="Revogar sessões ativas"
                        >
                          <KeyRound className="size-3.5" />
                        </Button>

                        {user.id !== currentUser?.id && (
                          user.status === "active" ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-rose-600 hover:text-rose-700"
                              onClick={() => setBlockingUser(user)}
                              title="Bloquear usuário"
                              disabled={actionLoading}
                            >
                              <Lock className="size-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleUnblockUser(user)}
                              title="Desbloquear usuário"
                              disabled={actionLoading}
                            >
                              <UserCheck className="size-3.5" />
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal para motivo do bloqueio */}
      <Dialog open={!!blockingUser} onOpenChange={(open) => !open && setBlockingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <UserX className="size-5" /> Bloquear Acesso do Usuário
            </DialogTitle>
            <DialogDescription>
              O usuário <strong>{blockingUser?.email}</strong> perderá o acesso imediato ao sistema e todas as suas sessões ativas serão encerradas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="reason" className="text-xs">Motivo do Bloqueio (Opcional)</Label>
            <Input
              id="reason"
              placeholder="Ex: Violação de termos ou solicitação judicial"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockingUser(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBlockUser} disabled={actionLoading}>
              {actionLoading ? "Bloqueando..." : "Confirmar Bloqueio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
