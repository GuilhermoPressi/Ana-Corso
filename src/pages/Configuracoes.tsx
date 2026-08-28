import { useEffect, useState } from "react"
import { Check, Mail, Plus, Save, Trash2, User, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate } from "@/lib/utils"
import { useClinicStore } from "@/stores/useClinicStore"

type Member = {
  id: string
  name: string
  email: string
  phone?: string | null
  role: "OWNER" | "ADMIN" | "PROFESSIONAL" | "RECEPTIONIST"
  status: string
  joinedAt: string
}

type Invitation = {
  id: string
  email: string
  role: string
  expiresAt: string
  inviteUrl: string
}

export default function Configuracoes() {
  const { profile, fetchProfile, update, loading, error } = useClinicStore()
  const [form, setForm] = useState({ ...profile })
  const [saved, setSaved] = useState(false)

  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"PROFESSIONAL" | "RECEPTIONIST" | "ADMIN">("PROFESSIONAL")
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    setForm({ ...profile })
  }, [profile])

  async function loadTeam() {
    try {
      const res = await fetch("/api/team")
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
        setInvitations(data.invitations || [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadTeam()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await update(form)
    if (success) {
      setSaved(true)
      toast.success("Configurações da clínica salvas com sucesso!")
      setTimeout(() => setSaved(false), 3000)
    } else {
      toast.error(error || "Erro ao salvar configurações.")
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail) return
    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Convite gerado com sucesso! Link: ${window.location.origin}${data.invitation.inviteUrl}`)
        setInviteDialogOpen(false)
        setInviteEmail("")
        loadTeam()
      } else {
        const data = await res.json()
        toast.error(data.error?.message || "Erro ao enviar convite.")
      }
    } catch {
      toast.error("Erro de conexão ao convidar membro.")
    }
  }

  async function handleChangeRole(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/team/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        toast.success("Função do membro atualizada.")
        loadTeam()
      } else {
        const data = await res.json()
        toast.error(data.error?.message || "Erro ao alterar função.")
      }
    } catch {
      toast.error("Erro de conexão.")
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Tem certeza que deseja remover o acesso deste membro da equipe?")) return
    try {
      const res = await fetch(`/api/team/members/${userId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("Membro removido da equipe.")
        loadTeam()
      } else {
        const data = await res.json()
        toast.error(data.error?.message || "Erro ao remover membro.")
      }
    } catch {
      toast.error("Erro de conexão.")
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Configurações da Clínica</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie a identidade da clínica, permissões e membros da equipe profissional.
        </p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="perfil">Perfil da Clínica</TabsTrigger>
          <TabsTrigger value="equipe">Equipe e Profissionais ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="size-5 text-primary" /> Dados Profissionais & Identidade
              </CardTitle>
              <CardDescription>
                Estas informações aparecem no cabeçalho do sistema, fichas de pacientes e relatórios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clinic-name">Nome da Clínica</Label>
                    <Input
                      id="clinic-name"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Clínica Dra. Maria Silva"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="professional-name">Nome da Profissional</Label>
                    <Input
                      id="professional-name"
                      value={form.professional}
                      onChange={(e) => setForm((prev) => ({ ...prev, professional: e.target.value }))}
                      placeholder="Ex: Dra. Maria Silva"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registry">Registro Profissional / Conselho</Label>
                    <Input
                      id="registry"
                      value={form.registry}
                      onChange={(e) => setForm((prev) => ({ ...prev, registry: e.target.value }))}
                      placeholder="Ex: CRM 123456 / CRBM 7890"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade e Estado</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Ex: São Paulo · SP"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço da Clínica</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Ex: Av. Paulista, 1000 · Sala 50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Ex: (11) 99999-8888"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail de Contato</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Ex: contato@suaclinica.com.br"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={form.instagram}
                      onChange={(e) => setForm((prev) => ({ ...prev, instagram: e.target.value }))}
                      placeholder="Ex: @suaclinica"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={loading} className="gap-2">
                    {saved ? <Check className="size-4" /> : <Save className="size-4" />}
                    {saved ? "Alterações Salvas!" : loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipe">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="size-5 text-primary" /> Equipe e Profissionais
                </CardTitle>
                <CardDescription>
                  Gerencie os usuários ativos na clínica e defina permissões por função.
                </CardDescription>
              </div>

              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1 size-4" /> Convidar Membro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convidar Membro para a Equipe</DialogTitle>
                    <DialogDescription>
                      Um link de convite único será gerado para adição na clínica.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSendInvite} className="space-y-4 py-2">
                    <div>
                      <Label>E-mail do Convidado</Label>
                      <Input
                        type="email"
                        placeholder="profissional@clinica.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label>Função / Nível de Acesso</Label>
                      <Select value={inviteRole} onValueChange={(val: any) => setInviteRole(val)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PROFESSIONAL">Profissional da Saúde (Atendimento)</SelectItem>
                          <SelectItem value="RECEPTIONIST">Recepcionista (Agenda & CRM)</SelectItem>
                          <SelectItem value="ADMIN">Administrador da Clínica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setInviteDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Gerar Convite</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Membros Ativos */}
              <div className="divide-y divide-border/60 border rounded-xl overflow-hidden">
                {members.map((member) => (
                  <div key={member.id} className="flex flex-wrap items-center justify-between p-4 gap-3 bg-card">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold">{member.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{member.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {member.role !== "OWNER" && (
                        <Select value={member.role} onValueChange={(role) => handleChangeRole(member.id, role)}>
                          <SelectTrigger className="h-8 w-[140px] text-[12px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="PROFESSIONAL">PROFESSIONAL</SelectItem>
                            <SelectItem value="RECEPTIONIST">RECEPTIONIST</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {member.role !== "OWNER" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveMember(member.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Convites Pendentes */}
              {invitations.length > 0 && (
                <div className="pt-4">
                  <h4 className="mb-2 text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Convites Pendentes</h4>
                  <div className="divide-y divide-border/50 border rounded-xl overflow-hidden">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/20 text-xs">
                        <div className="flex items-center gap-2">
                          <Mail className="size-4 text-muted-foreground" />
                          <span>{inv.email}</span>
                          <Badge variant="secondary" className="text-[9px]">{inv.role}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Expira em {formatDate(inv.expiresAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
