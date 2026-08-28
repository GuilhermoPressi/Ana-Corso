import { useEffect, useState } from "react"
import { CheckCircle2, FileHeart, Plus } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
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
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate } from "@/lib/utils"
import { usePatientStore } from "@/stores/usePatientStore"

type PlanItem = {
  id: string
  nameSnapshot: string
  descriptionSnapshot?: string | null
  sessionNumber: number
  plannedDate?: string | null
  status: "PLANNED" | "SCHEDULED" | "COMPLETED" | "CANCELLED"
  priceSnapshot?: number | null
}

type TreatmentPlan = {
  id: string
  patientId: string
  name: string
  objective?: string | null
  status: "ACTIVE" | "COMPLETED" | "CANCELLED"
  createdAt: string
  items: PlanItem[]
}

export default function PlanoDaPaciente() {
  const patients = usePatientStore((state) => state.patients)
  const loadPatients = usePatientStore((state) => state.loadPatients)

  const [selectedPatientId, setSelectedPatientId] = useState<string>("")
  const [plans, setPlans] = useState<TreatmentPlan[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [planName, setPlanName] = useState("Plano de Harmonização Facial")
  const [objective, setObjective] = useState("Rejuvenecimento e sustentação do terço médio")
  const [itemProcedure, setItemProcedure] = useState("Toxina Botulínica")

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id)
    }
  }, [patients, selectedPatientId])

  useEffect(() => {
    async function fetchPlans() {
      if (!selectedPatientId) return
      try {
        const res = await fetch(`/api/patients/${selectedPatientId}/plans`)
        if (res.ok) {
          const data = await res.json()
          setPlans(data.plans || [])
        }
      } catch {
        // ignore
      }
    }
    fetchPlans()
  }, [selectedPatientId])

  const selectedPatient = patients.find((p) => p.id === selectedPatientId)
  const activePlan = plans[0]

  async function handleCreatePlan() {
    if (!selectedPatientId) return
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName,
          objective,
          items: [
            {
              nameSnapshot: itemProcedure,
              sessionNumber: 1,
              priceSnapshot: 1800,
            },
            {
              nameSnapshot: "Preenchimento Malar (Ácido Hialurônico)",
              sessionNumber: 2,
              priceSnapshot: 2400,
            },
          ],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setPlans((prev) => [data.plan, ...prev])
        setDialogOpen(false)
        toast.success("Plano de tratamento gerado com sucesso.")
      }
    } catch {
      toast.error("Erro ao criar plano.")
    }
  }

  async function toggleItemStatus(itemId: string, currentStatus: string) {
    const nextStatus = currentStatus === "COMPLETED" ? "PLANNED" : "COMPLETED"
    try {
      const res = await fetch(`/api/plans/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (res.ok) {
        setPlans((prevPlans) =>
          prevPlans.map((p) => ({
            ...p,
            items: p.items.map((i) => (i.id === itemId ? { ...i, status: nextStatus } : i)),
          })),
        )
      }
    } catch {
      // ignore
    }
  }

  const completedCount = activePlan?.items.filter((i) => i.status === "COMPLETED").length || 0
  const totalCount = activePlan?.items.length || 0
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Plano de Tratamento da Paciente"
        description="Jornada estética personalizada. Monte réguas de atendimento com sessões, procedimentos e metas evolutivas."
        actions={
          <div className="flex items-center gap-3">
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Selecione uma paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 size-4" /> Gerar Novo Plano
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerar Plano da Paciente</DialogTitle>
                  <DialogDescription>
                    Criar planejamento evolutivo para {selectedPatient?.name || "a paciente"}.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-3">
                  <div>
                    <Label>Nome do Plano</Label>
                    <Input value={planName} onChange={(e) => setPlanName(e.target.value)} />
                  </div>

                  <div>
                    <Label>Objetivo Clínico</Label>
                    <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} />
                  </div>

                  <div>
                    <Label>Primeiro Procedimento</Label>
                    <Input value={itemProcedure} onChange={(e) => setItemProcedure(e.target.value)} />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreatePlan}>Salvar e Ativar Plano</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {activePlan ? (
        <div className="flex flex-col gap-6">
          {/* Card de Progresso Geral */}
          <Card className="border-border/70 py-0 shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
              <div>
                <Badge variant="outline" className="mb-1 text-[10px] text-primary">
                  Plano Ativo
                </Badge>
                <CardTitle className="font-display text-lg">{activePlan.name}</CardTitle>
                <CardDescription className="mt-1">{activePlan.objective}</CardDescription>
              </div>

              <div className="text-right">
                <p className="text-[12px] font-semibold text-muted-foreground">Progresso do Tratamento</p>
                <p className="font-display text-2xl font-bold text-primary tabular-nums">{progressPercent}%</p>
              </div>
            </CardHeader>

            <CardContent className="border-t border-border/70 px-6 py-4">
              <Progress value={progressPercent} className="h-2" />
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>
                  {completedCount} de {totalCount} etapas concluídas
                </span>
                <span>Criado em {formatDate(activePlan.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline de Etapas */}
          <div className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-semibold">Cronograma de Sessões e Procedimentos</h3>

            <div className="grid grid-cols-1 gap-3">
              {activePlan.items.map((item) => {
                const isDone = item.status === "COMPLETED"
                return (
                  <Card key={item.id} className={`border-border/70 p-4 transition-all ${isDone ? "bg-muted/40 opacity-80" : ""}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleItemStatus(item.id, item.status)}
                          className={`grid size-8 place-items-center rounded-full border transition-colors ${
                            isDone ? "border-success bg-success text-success-foreground" : "border-border hover:border-primary"
                          }`}
                        >
                          <CheckCircle2 className="size-4" />
                        </button>

                        <div>
                          <p className={`text-[13px] font-semibold ${isDone ? "line-through text-muted-foreground" : ""}`}>
                            Sessão {item.sessionNumber} · {item.nameSnapshot}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.priceSnapshot ? formatCurrency(item.priceSnapshot) : "Incluso no protocolo"}
                          </p>
                        </div>
                      </div>

                      <Badge variant={isDone ? "secondary" : "outline"} className="text-[10px]">
                        {isDone ? "Concluído" : "Planejado"}
                      </Badge>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <FileHeart className="mx-auto size-10 opacity-40" />
          <p className="mt-3 text-[14px] font-semibold text-foreground">Nenhum plano ativo para esta paciente</p>
          <p className="mt-1 text-[12px] max-w-sm mx-auto">
            Clique em "Gerar Novo Plano" para estruturar as sessões e a evolução estética da paciente.
          </p>
        </Card>
      )}
    </div>
  )
}
