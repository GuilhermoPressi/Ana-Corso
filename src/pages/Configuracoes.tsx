import { useEffect, useState } from "react"
import { Check, Save, User } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useClinicStore } from "@/stores/useClinicStore"

export default function Configuracoes() {
  const { profile, fetchProfile, update, loading, error } = useClinicStore()
  const [form, setForm] = useState({ ...profile })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    setForm({ ...profile })
  }, [profile])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await update(form)
    if (success) {
      setSaved(true)
      toast.success("Configurações da clínica salvas no banco de dados com sucesso!")
      setTimeout(() => setSaved(false), 3000)
    } else {
      toast.error(error || "Erro ao salvar configurações.")
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 lg:p-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Configurações da Clínica</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o perfil da clínica, os dados exibidos nos documentos, fichas e orçamentos.
        </p>
      </div>

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
    </div>
  )
}
