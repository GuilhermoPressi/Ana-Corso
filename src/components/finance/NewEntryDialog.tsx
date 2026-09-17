import { useState } from "react"
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { CLINIC_TODAY } from "@/lib/clinic"
import { useFinanceStore, type LedgerKind } from "@/stores/useFinanceStore"

const categories = [
  "Aluguel",
  "Funcionários",
  "Marketing",
  "Contabilidade",
  "Fornecedores",
  "Materiais",
  "Equipamentos",
  "Manutenção",
  "Impostos",
  "Serviços",
  "Despesas gerais",
  "Outros",
]

export function NewEntryDialog() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<LedgerKind>("despesa")
  const [category, setCategory] = useState(categories[0])
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(CLINIC_TODAY)
  const [loading, setLoading] = useState(false)

  const { registerExpense, registerRevenue } = useFinanceStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = Number(amount)
    if (!description.trim()) {
      toast.error("Informe a descrição do lançamento.")
      return
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Informe um valor válido maior que zero.")
      return
    }

    setLoading(true)

    let success = false
    if (kind === "despesa") {
      success = await registerExpense({
        description: description.trim(),
        category,
        amount: numAmount,
      })
    } else {
      success = await registerRevenue({
        description: description.trim(),
        category,
        amount: numAmount,
      })
    }

    setLoading(false)

    if (success) {
      toast.success(kind === "despesa" ? "Despesa registrada com sucesso!" : "Receita registrada com sucesso!")
      setOpen(false)
      setDescription("")
      setAmount("")
    } else {
      toast.error("Falha ao salvar lançamento financeiro.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]">
          <Plus className="size-4" /> Novo lançamento
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Novo Lançamento Financeiro</DialogTitle>
          <DialogDescription className="text-xs">
            Registre uma despesa manual ou receita avulsa para manter o caixa atualizado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Tipo (Receita / Despesa) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de Movimentação</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={kind === "despesa" ? "default" : "outline"}
                size="sm"
                onClick={() => setKind("despesa")}
                className="gap-2 text-xs"
              >
                <ArrowDownRight className="size-4 text-destructive" /> Saída / Despesa
              </Button>
              <Button
                type="button"
                variant={kind === "receita" ? "default" : "outline"}
                size="sm"
                onClick={() => setKind("receita")}
                className="gap-2 text-xs"
              >
                <ArrowUpRight className="size-4 text-success" /> Entrada / Receita
              </Button>
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label className="text-xs">Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição *</Label>
            <Input
              placeholder="Ex: Aluguel da clínica - Mês 09"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data de Ocorrência</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Gravando..." : "Salvar Lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
