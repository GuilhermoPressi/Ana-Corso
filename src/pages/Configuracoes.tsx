import { useState } from "react"
import { Building2, Check, Database, RefreshCw, Save, Trash2, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useClinicStore } from "@/stores/useClinicStore"
import { useFinanceStore } from "@/stores/useFinanceStore"
import { useIncidentStore } from "@/stores/useIncidentStore"
import { useInventoryStore } from "@/stores/useInventoryStore"
import { usePatientStore } from "@/stores/usePatientStore"
import { useScheduleStore } from "@/stores/useScheduleStore"

export default function Configuracoes() {
  const { profile, update, resetToClean, restoreDemo } = useClinicStore()
  const patientStore = usePatientStore()
  const financeStore = useFinanceStore()
  const scheduleStore = useScheduleStore()
  const inventoryStore = useInventoryStore()
  const incidentStore = useIncidentStore()

  const [form, setForm] = useState({ ...profile })
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    update(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleResetApp = () => {
    // Limpa todas as stores
    resetToClean()
    patientStore.clearAllData()
    financeStore.clearAllData()
    scheduleStore.clearAllData()
    inventoryStore.clearAllData()
    incidentStore.clearAllData()
    setForm({
      name: "Minha Clínica",
      professional: "Dra. Profissional",
      registry: "CRBM 00.000",
      address: "Endereço da Clínica",
      city: "Sua Cidade · UF",
      phone: "(00) 00000-0000",
      email: "contato@minhaclinica.com.br",
      instagram: "@minhaclinica",
    })
    setConfirmReset(false)
  }

  const handleRestoreDemo = () => {
    restoreDemo()
    patientStore.restoreDemoData()
    financeStore.restoreDemoData()
    scheduleStore.restoreDemoData()
    inventoryStore.restoreDemoData()
    incidentStore.restoreDemoData()
    setForm({
      name: "Clínica Ana Corso",
      professional: "Dra. Ana Corso",
      registry: "CRBM 12.345",
      address: "Rua Padre Chagas, 240 · sala 703",
      city: "Porto Alegre · RS",
      phone: "(51) 3333-4455",
      email: "contato@anacorso.com.br",
      instagram: "@clinicaanacorso",
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 lg:p-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Configurações & Dados</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o perfil da clínica, os dados exibidos nos documentos e zere a aplicação para uso real.
        </p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="perfil" className="gap-2">
            <Building2 className="size-4" /> Perfil da Clínica
          </TabsTrigger>
          <TabsTrigger value="dados" className="gap-2">
            <Database className="size-4" /> Reset de Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="size-5 text-primary" /> Dados Profissionais & Identidade
              </CardTitle>
              <CardDescription>
                Estas informações aparecem no cabeçalho do sistema, fichas de pacientes e orçamentos.
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
                  <Button type="submit" className="gap-2">
                    {saved ? <Check className="size-4" /> : <Save className="size-4" />}
                    {saved ? "Alterações Salvas!" : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="size-5 text-primary" /> Status dos Dados no Sistema
                </CardTitle>
                <CardDescription>
                  Resumo dos registros armazenados atualmente na aplicação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{patientStore.patients.length}</p>
                    <p className="text-xs font-medium text-muted-foreground">Pacientes Cadastrados</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{patientStore.leads.length}</p>
                    <p className="text-xs font-medium text-muted-foreground">Leads no CRM</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{scheduleStore.events.length}</p>
                    <p className="text-xs font-medium text-muted-foreground">Compromissos na Agenda</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{financeStore.ledger.length}</p>
                    <p className="text-xs font-medium text-muted-foreground">Lançamentos no Caixa</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                  <Trash2 className="size-5" /> Zerar Aplicativo (Remover Dados Fictícios)
                </CardTitle>
                <CardDescription>
                  Remove todos os dados fictícios de demonstração (pacientes, histórico financeiro, agendamentos e estoque) para deixar o sistema 100% limpo para seu uso real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!confirmReset ? (
                  <Button variant="destructive" className="gap-2" onClick={() => setConfirmReset(true)}>
                    <Trash2 className="size-4" /> Resetar Todos os Dados Fictícios
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-xl border border-destructive/40 bg-background p-4">
                    <p className="text-sm font-semibold text-destructive">
                      Tem certeza que deseja zerar o aplicativo?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Esta ação limpará as tabelas de pacientes, leads, financeiro e agenda fictícia.
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <Button variant="destructive" size="sm" onClick={handleResetApp}>
                        Sim, Zerar Aplicativo Agora
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="size-5 text-muted-foreground" /> Restauração de Demonstração
                </CardTitle>
                <CardDescription>
                  Se precisar testar o sistema novamente com dados de exemplo (Dra. Ana Corso), você pode restaurar o banco fictício a qualquer momento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="gap-2" onClick={handleRestoreDemo}>
                  <RefreshCw className="size-4" /> Restaurar Dados de Demonstração
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
