import { useMemo, useState } from "react"
import { CalendarClock, Check, Plus, Sparkles, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { planningLines } from "@/data/facialPlanning"
import { followUpFor } from "@/data/followUp"
import type { Patient } from "@/data/patients"
import { addDays, CLINIC_TODAY } from "@/lib/clinic"
import { parseDecimal } from "@/lib/number"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { useRegisterProcedure } from "@/hooks/useRegisterProcedure"
import { useFinanceStore } from "@/stores/useFinanceStore"
import { packsOf, useInventoryStore } from "@/stores/useInventoryStore"

const procedures = [
  "Toxina botulínica",
  "Preenchimento",
  "Bioestimulador",
  "Skinbooster",
  "Microagulhamento",
]

const professionals = ["Dra. Ana Corso", "Est. Marcela Reis"]

/** Reaproveita as regiões já mapeadas no Planejamento Facial. */
const regionsByProcedure: Record<string, string[]> = {
  "Toxina botulínica": planningLines[0].regions.map((region) => region.name),
  Preenchimento: planningLines[1].regions.map((region) => region.name),
  Bioestimulador: planningLines[2].regions.map((region) => region.name),
  Skinbooster: ["Face", "Pescoço", "Colo", "Mãos"],
  Microagulhamento: ["Face", "Pescoço", "Colo"],
}

export function RegisterProcedureDialog({ patient }: { patient: Patient }) {
  const [open, setOpen] = useState(false)
  const [procedure, setProcedure] = useState(procedures[0])
  const [regions, setRegions] = useState<string[]>([])
  const [productId, setProductId] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [value, setValue] = useState("")
  const [professional, setProfessional] = useState(patient.professional || professionals[0])
  const [notes, setNotes] = useState("")

  const allProducts = useInventoryStore((state) => state.products)
  const pricedProcedures = useFinanceStore((state) => state.procedures)
  const register = useRegisterProcedure()

  const options = useMemo(
    () => allProducts.filter((item) => item.category === procedure),
    [allProducts, procedure],
  )

  const product = options.find((item) => item.id === productId) ?? options[0]
  const rule = followUpFor(procedure)

  const quantityValue = Math.max(parseDecimal(quantity) || 0, 0)
  const valueNumber = Math.max(parseDecimal(value) || 0, 0)
  const shortage = product ? Math.max(quantityValue - product.quantity, 0) : 0
  const valueError = valueNumber <= 0

  const suggestedPrice = useMemo(() => {
    const match = pricedProcedures.find((item) =>
      item.name.toLowerCase().includes(procedure.toLowerCase()),
    )
    return match?.price
  }, [pricedProcedures, procedure])

  function reset() {
    setRegions([])
    setQuantity("")
    setValue("")
    setNotes("")
  }

  function submit() {
    if (valueError) return

    const outcome = register({
      patient,
      procedure,
      regions,
      productId: product?.id,
      quantity: quantityValue,
      value: valueNumber,
      professional,
      notes,
    })

    setOpen(false)
    reset()

    toast.success(`${procedure} registrado para ${patient.name.split(" ")[0]}`, {
      description: [
        outcome.directCost > 0 ? `Baixa de ${formatCurrency(outcome.directCost)} no estoque` : null,
        `retorno em ${formatDate(outcome.clinicalReturnDate)}`,
        `recontato em ${formatDate(outcome.commercialContactDate)}`,
      ]
        .filter(Boolean)
        .join(" · "),
    })

    if (outcome.shortage > 0) {
      toast.warning("Estoque insuficiente", {
        description: `Faltaram ${outcome.shortage.toLocaleString("pt-BR")} ${
          product?.contentUnit ?? ""
        } de ${product?.name}. O saldo zerou e a diferença não foi baixada.`,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]">
          <Plus /> Registrar procedimento
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Registrar procedimento</DialogTitle>
          <DialogDescription>
            Um registro alimenta a ficha, o estoque, o financeiro, a agenda e o CRM de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-[13px]">Procedimento</Label>
              <Select
                value={procedure}
                onValueChange={(next) => {
                  setProcedure(next)
                  setRegions([])
                  setProductId("")
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[13px]">Profissional</Label>
              <Select value={professional} onValueChange={setProfessional}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[13px]">Regiões tratadas</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(regionsByProcedure[procedure] ?? []).map((region) => {
                const active = regions.includes(region)
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() =>
                      setRegions((current) =>
                        active ? current.filter((item) => item !== region) : [...current, region],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
                    )}
                  >
                    {region}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-[13px]">Produto utilizado</Label>
              <Select value={product?.id ?? ""} onValueChange={setProductId}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue placeholder="Nenhum produto para esta categoria" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · saldo {item.quantity.toLocaleString("pt-BR")} {item.contentUnit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {product && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Lote {product.lot} · {packsOf(product).toLocaleString("pt-BR")} {product.packLabel} em
                  estoque
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="rp-qty" className="text-[13px]">
                Quantidade consumida
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="rp-qty"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder={product?.contentUnit === "UI" ? "42" : "1"}
                  aria-invalid={shortage > 0}
                  className="pr-12 tabular-nums"
                />
                {product && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-muted-foreground">
                    {product.contentUnit}
                  </span>
                )}
              </div>
              {shortage > 0 && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
                  <TriangleAlert className="size-3" /> Faltam{" "}
                  {shortage.toLocaleString("pt-BR")} {product?.contentUnit} no estoque
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="rp-value" className="text-[13px]">
              Valor cobrado
            </Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[160px] flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
                  R$
                </span>
                <Input
                  id="rp-value"
                  inputMode="decimal"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="1.800"
                  aria-invalid={value !== "" && valueError}
                  className="pl-9 tabular-nums"
                />
              </div>
              {suggestedPrice !== undefined && (
                <Button variant="outline" size="sm" onClick={() => setValue(String(suggestedPrice))}>
                  <Check /> Usar {formatCurrency(suggestedPrice)} da tabela
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="rp-notes" className="text-[13px]">
              Observações <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="rp-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Técnica, planos, resposta da paciente..."
              className="mt-1.5 min-h-[72px] resize-y"
            />
          </div>

          {/* Prévia da automação */}
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3.5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
              <Sparkles className="size-3.5" /> O que o sistema vai fazer sozinho
            </p>
            <div className="mt-2.5 flex flex-col gap-2">
              <AutoLine
                label={`Retorno clínico em ${rule.clinicalDays} dias`}
                detail={`${formatDate(addDays(CLINIC_TODAY, rule.clinicalDays))} · ${rule.clinicalReason}`}
              />
              <AutoLine
                label={`Recontato comercial em ${rule.commercialDays} dias`}
                detail={`${formatDate(addDays(CLINIC_TODAY, rule.commercialDays))} · ${rule.commercialReason}`}
              />
              <AutoLine
                label="Baixa no estoque e lançamento no caixa"
                detail={
                  product && quantityValue > 0
                    ? `${quantityValue.toLocaleString("pt-BR")} ${product.contentUnit} de ${product.name} · custo direto ${formatCurrency(
                        quantityValue * (product.packCost / product.contentPerPack),
                      )}`
                    : "Informe produto e quantidade para calcular o custo direto"
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={valueError} className="rounded-full">
            <Plus /> {valueError ? "Informe o valor cobrado" : "Registrar procedimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AutoLine({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Badge
        variant="outline"
        className="mt-0.5 shrink-0 border-primary/20 bg-card text-[10px] text-primary"
      >
        <CalendarClock className="size-2.5" /> auto
      </Badge>
      <div className="min-w-0">
        <p className="text-[12px] font-medium">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}
