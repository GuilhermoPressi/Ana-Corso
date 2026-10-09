import { useEffect, useState, type ReactNode } from "react"
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
import { parseMoney } from "@/lib/money"
import { useFinanceStore, type LedgerEntry, type LedgerKind } from "@/stores/useFinanceStore"

const EXPENSE_CATEGORIES = [
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

const REVENUE_CATEGORIES = [
  "Procedimentos",
  "Consultas / Avaliações",
  "Pacotes / Protocolos",
  "Venda de produtos",
  "Sinal / Entrada",
  "Outras receitas",
]

function formatMoneyInput(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Cria um lançamento (sem `entry`) ou edita um existente (com `entry`).
 * `onSaved` recebe a data salva para a tela poder ir ao mês do lançamento.
 */
export function NewEntryDialog({
  entry,
  open: controlledOpen,
  onOpenChange,
  onSaved,
  trigger,
}: {
  entry?: LedgerEntry | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: (date: string) => void
  trigger?: ReactNode
} = {}) {
  const editing = Boolean(entry)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const [kind, setKind] = useState<LedgerKind>("despesa")
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(CLINIC_TODAY)
  const [loading, setLoading] = useState(false)

  const { registerExpense, registerRevenue, updateEntry } = useFinanceStore()

  // Ao abrir para editar, carrega os dados do lançamento.
  useEffect(() => {
    if (!open || !entry) return
    setKind(entry.kind)
    setCategory(entry.category)
    setDescription(entry.description)
    setAmount(formatMoneyInput(entry.amount))
    setDate(entry.date)
  }, [open, entry])

  const handleKindChange = (newKind: LedgerKind) => {
    setKind(newKind)
    if (newKind === "despesa") {
      setCategory(EXPENSE_CATEGORIES[0])
    } else {
      setCategory(REVENUE_CATEGORIES[0])
    }
  }

  const baseCategories = kind === "despesa" ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES
  // Mantém a categoria original de um lançamento antigo, mesmo que não esteja na lista.
  const currentCategories = baseCategories.includes(category) ? baseCategories : [category, ...baseCategories]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = parseMoney(amount)
    if (!description.trim()) {
      toast.error("Informe a descrição do lançamento.")
      return
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Informe um valor válido maior que zero. Ex.: 1.500,00")
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("Informe a data do lançamento.")
      return
    }

    setLoading(true)

    let res: { success: boolean; error?: string }
    const input = { description: description.trim(), category, amount: numAmount, occurredAt: date }
    if (entry) {
      res = await updateEntry(entry.id, input)
    } else if (kind === "despesa") {
      res = await registerExpense(input)
    } else {
      res = await registerRevenue(input)
    }

    setLoading(false)

    if (res.success) {
      toast.success(
        editing ? "Lançamento atualizado." : kind === "despesa" ? "Despesa registrada com sucesso!" : "Receita registrada com sucesso!",
      )
      onSaved?.(date)
      setOpen(false)
      if (!editing) {
        setDescription("")
        setAmount("")
        setDate(CLINIC_TODAY)
      }
    } else {
      toast.error(res.error || "Não foi possível salvar o lançamento financeiro.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" className="gap-2 rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]">
              <Plus className="size-4" /> Novo lançamento
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {editing ? "Editar lançamento" : "Novo Lançamento Financeiro"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editing
              ? "Corrija os dados do lançamento. Os totais do mês são recalculados na hora."
              : "Registre uma despesa manual ou receita avulsa para manter o caixa atualizado."}
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
                onClick={() => handleKindChange("despesa")}
                disabled={editing && kind !== "despesa"}
                className="gap-2 text-xs"
              >
                <ArrowDownRight className="size-4 text-destructive" /> Saída / Despesa
              </Button>
              <Button
                type="button"
                variant={kind === "receita" ? "default" : "outline"}
                size="sm"
                onClick={() => handleKindChange("receita")}
                disabled={editing && kind !== "receita"}
                className="gap-2 text-xs"
              >
                <ArrowUpRight className="size-4 text-success" /> Entrada / Receita
              </Button>
            </div>
          </div>

          {/* Categoria adaptativa */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              {kind === "despesa" ? "Categoria da despesa *" : "Categoria da receita *"}
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentCategories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição adaptativa */}
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição *</Label>
            <Input
              placeholder={
                kind === "despesa"
                  ? "Ex: Aluguel da clínica - Setembro"
                  : "Ex: Procedimento realizado / Receita avulsa"
              }
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
                inputMode="decimal"
                placeholder="0,00"
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
              {loading ? "Gravando..." : editing ? "Salvar alterações" : "Salvar Lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
