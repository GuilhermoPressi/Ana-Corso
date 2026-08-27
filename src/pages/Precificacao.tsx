import { useMemo, useState } from "react"
import {
  BadgeDollarSign,
  Check,
  Info,
  Plus,
  Timer,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { toast } from "sonner"

import { NumberField } from "@/components/calculators/NumberField"
import { parseDecimal } from "@/lib/number"
import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { breakdownPrice, calculatePricing, type PricingInput } from "@/lib/pricing"
import { cn, formatCurrency, formatCurrencyPrecise } from "@/lib/utils"
import { useFinanceStore } from "@/stores/useFinanceStore"

const percent = (value: number) =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

const emptyForm = {
  name: "",
  productCost: "",
  materialCost: "",
  roomCost: "",
  cardFeePercent: "3.5",
  taxPercent: "6",
  marginPercent: "40",
}

export default function Precificacao() {
  const [form, setForm] = useState(emptyForm)
  const [roomMinutes, setRoomMinutes] = useState("60")
  const [hourlyCost, setHourlyCost] = useState("180")
  const [priceOverride, setPriceOverride] = useState<string | null>(null)

  const procedures = useFinanceStore((state) => state.procedures)
  const addProcedure = useFinanceStore((state) => state.addProcedure)
  const removeProcedure = useFinanceStore((state) => state.removeProcedure)

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const input = useMemo<PricingInput>(
    () => ({
      productCost: Math.max(parseDecimal(form.productCost) || 0, 0),
      materialCost: Math.max(parseDecimal(form.materialCost) || 0, 0),
      roomCost: Math.max(parseDecimal(form.roomCost) || 0, 0),
      cardFeePercent: Math.max(parseDecimal(form.cardFeePercent) || 0, 0),
      taxPercent: Math.max(parseDecimal(form.taxPercent) || 0, 0),
      marginPercent: Math.max(parseDecimal(form.marginPercent) || 0, 0),
    }),
    [form],
  )

  const result = useMemo(() => calculatePricing(input), [input])

  const practicedPrice =
    priceOverride !== null ? Math.max(parseDecimal(priceOverride) || 0, 0) : result.commercialPrice

  const breakdown = useMemo(() => breakdownPrice(practicedPrice, input), [practicedPrice, input])

  const roomAssist = useMemo(() => {
    const minutes = parseDecimal(roomMinutes)
    const hourly = parseDecimal(hourlyCost)
    if (!(minutes > 0) || !(hourly > 0)) return null
    return (minutes / 60) * hourly
  }, [roomMinutes, hourlyCost])

  const hasCost = result.realCost > 0
  const nameError = form.name.trim().length < 3

  function save() {
    if (nameError || !hasCost || result.impossible) return

    addProcedure({
      name: form.name.trim(),
      productCost: input.productCost,
      materialCost: input.materialCost,
      roomCost: input.roomCost,
      cardFeePercent: input.cardFeePercent,
      taxPercent: input.taxPercent,
      marginPercent: input.marginPercent,
      price: practicedPrice,
    })

    toast.success(`${form.name.trim()} foi salvo na tabela`, {
      description: `Preço de ${formatCurrency(practicedPrice)} com margem real de ${percent(
        breakdown.marginPercent,
      )}.`,
    })

    setForm(emptyForm)
    setPriceOverride(null)
  }

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Precificação Inteligente"
        description="Descubra o preço que cobre o custo real, as taxas e ainda entrega a margem que você quer."
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-[12px] leading-relaxed text-foreground/80">
          <span className="font-semibold">Margem incide sobre a venda, não sobre o custo.</span> Somar 40% ao
          custo deixa a margem real perto de 28% depois das taxas — por isso o cálculo aqui usa markup divisor.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Formulário */}
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-base">Criar procedimento</CardTitle>
            <CardDescription className="mt-1">
              Lance tudo que sai do caixa para realizar um atendimento.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="pr-name" className="text-[13px] font-medium">
                Nome do procedimento
              </Label>
              <Input
                id="pr-name"
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Ex.: Toxina 3 regiões"
                className="mt-1.5 bg-card text-[14px]"
              />
            </div>

            <Separator />

            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Custos diretos
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="pr-product"
                label="Custo do produto"
                prefix="R$"
                value={form.productCost}
                onChange={(value) => set("productCost", value)}
                placeholder="609,00"
                help="Traga da calculadora de custo por unidade."
              />
              <NumberField
                id="pr-material"
                label="Material extra"
                prefix="R$"
                value={form.materialCost}
                onChange={(value) => set("materialCost", value)}
                placeholder="45,00"
                help="Seringas, agulhas, luvas, gaze, anestésico."
              />
            </div>

            <NumberField
              id="pr-room"
              label="Tempo de sala"
              prefix="R$"
              value={form.roomCost}
              onChange={(value) => set("roomCost", value)}
              placeholder="180,00"
              help="Rateio de aluguel, energia, equipe e estrutura pelo tempo ocupado."
            />

            {/* Assistente opcional para estimar o custo de sala */}
            <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold">
                <Timer className="size-3.5 text-primary" /> Não sabe o valor da sala?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <NumberField
                  id="pr-minutes"
                  label="Duração"
                  suffix="min"
                  value={roomMinutes}
                  onChange={setRoomMinutes}
                />
                <NumberField
                  id="pr-hourly"
                  label="Custo/hora da clínica"
                  prefix="R$"
                  value={hourlyCost}
                  onChange={setHourlyCost}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={roomAssist === null}
                  onClick={() => set("roomCost", String(Math.round((roomAssist ?? 0) * 100) / 100))}
                  className="h-9"
                >
                  <Check /> Usar {roomAssist !== null ? formatCurrency(roomAssist) : "—"}
                </Button>
              </div>
            </div>

            <Separator />

            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Percentuais sobre a venda
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                id="pr-card"
                label="Taxa de cartão"
                suffix="%"
                value={form.cardFeePercent}
                onChange={(value) => set("cardFeePercent", value)}
              />
              <NumberField
                id="pr-tax"
                label="Impostos"
                suffix="%"
                value={form.taxPercent}
                onChange={(value) => set("taxPercent", value)}
              />
              <NumberField
                id="pr-margin"
                label="Margem desejada"
                suffix="%"
                value={form.marginPercent}
                onChange={(value) => set("marginPercent", value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        <div className="flex flex-col gap-5">
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="font-display text-base">Preço sugerido</CardTitle>
              <CardDescription className="mt-1">Recalcula a cada tecla.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3">
              {result.impossible ? (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3.5">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-[13px] font-semibold text-destructive">Combinação impossível</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                      Taxa, imposto e margem somam {percent(result.totalPercent)} do preço de venda. Como não
                      sobra espaço para o custo, nenhum preço atende. Reduza a margem desejada.
                    </p>
                  </div>
                </div>
              ) : !hasCost ? (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
                  <div className="grid size-11 place-items-center rounded-2xl bg-accent">
                    <BadgeDollarSign className="size-5 text-primary" />
                  </div>
                  <p className="mt-3.5 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                    Informe ao menos um custo para ver o preço mínimo e o recomendado.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/40 px-4 py-3.5">
                      <p className="text-[12px] font-medium text-muted-foreground">Custo real</p>
                      <p className="mt-1.5 font-display text-xl font-semibold tabular-nums">
                        {formatCurrencyPrecise(result.realCost)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Produto + material + sala
                      </p>
                    </div>

                    <div className="rounded-xl border border-warning/25 bg-warning/[0.06] px-4 py-3.5">
                      <p className="text-[12px] font-medium text-warning-foreground">Preço mínimo</p>
                      <p className="mt-1.5 font-display text-xl font-semibold tabular-nums">
                        {formatCurrencyPrecise(result.minimumPrice)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Cobre custo e taxas, lucro zero
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-primary/[0.10] to-accent/60 px-4 py-4 ring-1 ring-primary/15">
                    <p className="text-[12px] font-semibold text-primary">
                      Preço recomendado · margem de {percent(input.marginPercent)}
                    </p>
                    <p className="mt-1.5 font-display text-3xl font-semibold tabular-nums text-primary">
                      {formatCurrency(result.commercialPrice)}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Cálculo exato em {formatCurrencyPrecise(result.recommendedPrice)}, arredondado para cima
                      em múltiplos de R$ 10.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pr-practiced" className="text-[13px] font-medium">
                      Preço que você vai praticar
                    </Label>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[160px] flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
                          R$
                        </span>
                        <Input
                          id="pr-practiced"
                          inputMode="decimal"
                          value={priceOverride ?? String(result.commercialPrice)}
                          onChange={(event) => setPriceOverride(event.target.value)}
                          className="bg-card pl-9 text-[14px] font-medium tabular-nums"
                        />
                      </div>
                      {priceOverride !== null && (
                        <Button variant="ghost" size="sm" onClick={() => setPriceOverride(null)}>
                          Voltar ao recomendado
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-2">
                    <BreakdownRow label="Custo real" value={-breakdown.cost} />
                    <BreakdownRow
                      label={`Taxa de cartão (${percent(input.cardFeePercent)})`}
                      value={-breakdown.cardFee}
                    />
                    <BreakdownRow label={`Impostos (${percent(input.taxPercent)})`} value={-breakdown.tax} />
                    <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-3">
                      <div>
                        <p className="text-[13px] font-semibold">Lucro líquido</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Margem real de {percent(breakdown.marginPercent)}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "font-display text-lg font-semibold tabular-nums",
                          breakdown.profit >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {formatCurrencyPrecise(breakdown.profit)}
                      </p>
                    </div>
                  </div>

                  {breakdown.profit < 0 && (
                    <p className="rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-[12px] leading-relaxed text-destructive">
                      Neste preço você paga para atender. O mínimo para não ter prejuízo é{" "}
                      {formatCurrencyPrecise(result.minimumPrice)}.
                    </p>
                  )}

                  <Button
                    onClick={save}
                    disabled={nameError}
                    className="mt-1 w-full rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]"
                  >
                    <Plus /> {nameError ? "Dê um nome ao procedimento" : "Salvar na tabela de preços"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabela de procedimentos salvos */}
      <Card className="mt-5 gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
        <CardHeader className="px-5 pb-4 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-display text-base">Tabela de preços</CardTitle>
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {procedures.length} {procedures.length === 1 ? "procedimento" : "procedimentos"}
            </Badge>
          </div>
          <CardDescription className="mt-1">
            Os procedimentos que você precificou nesta sessão.
          </CardDescription>
        </CardHeader>

        {procedures.length === 0 ? (
          <div className="flex flex-col items-center px-6 pb-14 pt-6 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-accent">
              <BadgeDollarSign className="size-5 text-primary" />
            </div>
            <p className="mt-4 font-display text-[15px] font-semibold">Nenhum procedimento salvo ainda</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
              Preencha os custos ao lado e salve — a tabela vira a referência de preço da clínica.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[200px] pl-5">Procedimento</TableHead>
                  <TableHead className="text-right">Custo real</TableHead>
                  <TableHead className="text-right">Preço mínimo</TableHead>
                  <TableHead className="text-right">Preço praticado</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem real</TableHead>
                  <TableHead className="w-10 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {procedures.map((procedure) => {
                  const pricing = calculatePricing(procedure)
                  const detail = breakdownPrice(procedure.price, procedure)
                  const healthy = detail.marginPercent >= procedure.marginPercent - 1

                  return (
                    <TableRow key={procedure.id} className="border-border/60">
                      <TableCell className="pl-5">
                        <p className="text-[13px] font-semibold">{procedure.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Produto {formatCurrency(procedure.productCost)} · material{" "}
                          {formatCurrency(procedure.materialCost)} · sala {formatCurrency(procedure.roomCost)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-[13px] tabular-nums">
                        {formatCurrency(pricing.realCost)}
                      </TableCell>
                      <TableCell className="text-right text-[13px] tabular-nums text-muted-foreground">
                        {formatCurrency(pricing.minimumPrice)}
                      </TableCell>
                      <TableCell className="text-right text-[13px] font-semibold tabular-nums">
                        {formatCurrency(procedure.price)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-[13px] font-medium tabular-nums",
                          detail.profit >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {formatCurrency(detail.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] tabular-nums",
                            healthy
                              ? "border-success/25 bg-success/10 text-success"
                              : "border-warning/30 bg-warning/12 text-warning-foreground",
                          )}
                        >
                          {percent(detail.marginPercent)}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remover ${procedure.name}`}
                          onClick={() => removeProcedure(procedure.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{formatCurrencyPrecise(value)}</span>
    </div>
  )
}
