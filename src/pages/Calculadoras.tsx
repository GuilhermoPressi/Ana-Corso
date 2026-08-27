import { useMemo, useState } from "react"
import { Beaker, Calculator, Info, RotateCcw, Syringe } from "lucide-react"

import { NumberField, ResultRow } from "@/components/calculators/NumberField"
import { parseDecimal } from "@/lib/number"
import { PageHeader } from "@/components/layout/PageHeader"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrencyPrecise } from "@/lib/utils"

const decimal = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })

export default function Calculadoras() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Calculadoras Clínicas"
        description="Contas de bastidor que você não precisa mais fazer no papel entre um atendimento e outro."
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-[12px] leading-relaxed text-foreground/80">
          <span className="font-semibold">As calculadoras fazem a matemática, não a prescrição.</span> Diluição,
          dose e técnica seguem sendo decisão da profissional — aqui você só confere os números com precisão.
        </p>
      </div>

      <Tabs defaultValue="custo-unidade">
        <TabsList className="mb-5 h-auto w-fit justify-start gap-1 rounded-full bg-muted/60 p-1">
          <TabsTrigger value="custo-unidade" className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs">
            <Calculator className="size-3.5" /> Custo por unidade
          </TabsTrigger>
          <TabsTrigger value="reconstituicao" className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs">
            <Beaker className="size-3.5" /> Reconstituição
          </TabsTrigger>
        </TabsList>

        <TabsContent value="custo-unidade">
          <CustoPorUnidade />
        </TabsContent>

        <TabsContent value="reconstituicao">
          <Reconstituicao />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Custo por unidade
 * ------------------------------------------------------------------ */

function CustoPorUnidade() {
  const [price, setPrice] = useState("1450")
  const [units, setUnits] = useState("100")
  const [perSession, setPerSession] = useState("42")

  const result = useMemo(() => {
    const priceValue = parseDecimal(price)
    const unitsValue = parseDecimal(units)
    const perSessionValue = parseDecimal(perSession)

    const validBase = priceValue > 0 && unitsValue > 0
    if (!validBase) return null

    const costPerUnit = priceValue / unitsValue
    const hasSession = perSessionValue > 0

    return {
      costPerUnit,
      sessionCost: hasSession ? costPerUnit * perSessionValue : null,
      sessionsPerVial: hasSession ? Math.floor(unitsValue / perSessionValue) : null,
      leftover: hasSession ? unitsValue % perSessionValue : null,
      leftoverValue: hasSession ? (unitsValue % perSessionValue) * costPerUnit : null,
    }
  }, [price, units, perSession])

  function reset() {
    setPrice("")
    setUnits("")
    setPerSession("")
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="border-border/70 shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display text-base">Dados do frasco</CardTitle>
            <CardDescription className="mt-1">O que você pagou e o que veio dentro.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="-mr-2 text-muted-foreground">
            <RotateCcw /> Limpar
          </Button>
        </CardHeader>

        <CardContent className="grid gap-4">
          <NumberField
            id="cu-price"
            label="Preço do frasco"
            prefix="R$"
            value={price}
            onChange={setPrice}
            placeholder="1.450,00"
            invalid={price !== "" && !(parseDecimal(price) > 0)}
            help="Use o preço de compra, já com frete e impostos rateados."
          />

          <NumberField
            id="cu-units"
            label="Quantidade no frasco"
            suffix="UI"
            value={units}
            onChange={setUnits}
            placeholder="100"
            invalid={units !== "" && !(parseDecimal(units) > 0)}
            help="Unidades internacionais para toxina, ou ml para preenchedores."
          />

          <NumberField
            id="cu-session"
            label="Consumo por atendimento"
            suffix="UI"
            value={perSession}
            onChange={setPerSession}
            placeholder="42"
            help="Opcional. Permite calcular o custo da sessão e o rendimento do frasco."
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-base">Resultado</CardTitle>
          <CardDescription className="mt-1">Atualiza conforme você digita.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-2.5">
          {!result ? (
            <EmptyResult
              icon={Calculator}
              message="Informe o preço e a quantidade do frasco para ver o custo por unidade."
            />
          ) : (
            <>
              <ResultRow
                emphasis
                label="Custo por unidade"
                value={formatCurrencyPrecise(result.costPerUnit)}
                hint="Base para precificar qualquer procedimento com este produto."
              />

              {result.sessionCost !== null && (
                <ResultRow
                  label="Custo do produto por atendimento"
                  value={formatCurrencyPrecise(result.sessionCost)}
                  hint={`${decimal(parseDecimal(perSession), 0)} UI aplicadas`}
                />
              )}

              {result.sessionsPerVial !== null && (
                <ResultRow
                  label="Atendimentos por frasco"
                  value={`${result.sessionsPerVial}`}
                  hint="Aplicações completas antes de abrir outro frasco."
                />
              )}

              {result.leftover !== null && result.leftover > 0 && (
                <div className="rounded-xl border border-warning/25 bg-warning/[0.06] px-4 py-3">
                  <p className="text-[12px] font-semibold text-warning-foreground">
                    Sobram {decimal(result.leftover, 0)} UI no frasco
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Equivale a {formatCurrencyPrecise(result.leftoverValue ?? 0)} que viram perda se o frasco não
                    for aproveitado em outra paciente dentro da validade após reconstituição.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Reconstituição
 * ------------------------------------------------------------------ */

const referenceDilutions = [1, 1.5, 2, 2.5, 4, 5]

function Reconstituicao() {
  const [units, setUnits] = useState("100")
  const [diluent, setDiluent] = useState("2.5")
  const [targetDose, setTargetDose] = useState("20")

  const result = useMemo(() => {
    const unitsValue = parseDecimal(units)
    const diluentValue = parseDecimal(diluent)
    const doseValue = parseDecimal(targetDose)

    if (!(unitsValue > 0) || !(diluentValue > 0)) return null

    const perMl = unitsValue / diluentValue

    return {
      perMl,
      perTenth: perMl / 10,
      perInsulinMark: perMl / 100,
      volumeForDose: doseValue > 0 ? doseValue / perMl : null,
      marksForDose: doseValue > 0 ? (doseValue / perMl) * 100 : null,
    }
  }, [units, diluent, targetDose])

  const unitsValue = parseDecimal(units)

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-base">Reconstituição do frasco</CardTitle>
            <CardDescription className="mt-1">
              Quanto de diluente você vai usar neste frasco.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <NumberField
              id="rc-units"
              label="Unidades do frasco"
              suffix="UI"
              value={units}
              onChange={setUnits}
              placeholder="100"
              invalid={units !== "" && !(parseDecimal(units) > 0)}
            />

            <NumberField
              id="rc-diluent"
              label="Volume de diluente"
              suffix="ml"
              value={diluent}
              onChange={setDiluent}
              placeholder="2,5"
              invalid={diluent !== "" && !(parseDecimal(diluent) > 0)}
              help="Soro fisiológico 0,9%. Diluições maiores espalham mais o produto."
            />

            <NumberField
              id="rc-dose"
              label="Dose que você quer aplicar"
              suffix="UI"
              value={targetDose}
              onChange={setTargetDose}
              placeholder="20"
              help="Opcional. Converte a dose no volume a aspirar."
            />
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-base">Concentração resultante</CardTitle>
            <CardDescription className="mt-1">
              Confira antes de aspirar — a conta muda a cada diluição.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-2.5">
            {!result ? (
              <EmptyResult
                icon={Beaker}
                message="Informe as unidades do frasco e o volume de diluente."
              />
            ) : (
              <>
                <ResultRow
                  emphasis
                  label="Concentração"
                  value={`${decimal(result.perMl, 1)} UI/ml`}
                  hint={`${decimal(unitsValue, 0)} UI diluídas em ${decimal(parseDecimal(diluent), 1)} ml`}
                />
                <ResultRow label="Por 0,1 ml" value={`${decimal(result.perTenth, 1)} UI`} />
                <ResultRow
                  label="Por traço da seringa de insulina"
                  value={`${decimal(result.perInsulinMark, 2)} UI`}
                  hint="Seringa de 100 UI · cada traço equivale a 0,01 ml."
                />

                {result.volumeForDose !== null && (
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3">
                    <p className="text-[12px] font-medium text-primary">
                      Para aplicar {decimal(parseDecimal(targetDose), 0)} UI
                    </p>
                    <p className="mt-1.5 font-display text-lg font-semibold tabular-nums">
                      {decimal(result.volumeForDose, 3)} ml
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Aproximadamente {decimal(result.marksForDose ?? 0, 1)} traços na seringa de insulina.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
        <CardHeader className="px-5 pb-4 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-display text-base">Comparativo de diluições</CardTitle>
            <Badge variant="secondary" className="rounded-full text-[10px]">
              frasco de {unitsValue > 0 ? decimal(unitsValue, 0) : "—"} UI
            </Badge>
          </div>
          <CardDescription className="mt-1">
            A mesma dose ocupa volumes diferentes conforme a diluição escolhida.
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Diluente</TableHead>
                <TableHead className="text-right">Concentração</TableHead>
                <TableHead className="text-right">Por 0,1 ml</TableHead>
                <TableHead className="pr-5 text-right">Traços para a dose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referenceDilutions.map((volume) => {
                const perMl = unitsValue > 0 ? unitsValue / volume : 0
                const dose = parseDecimal(targetDose)
                const marks = perMl > 0 && dose > 0 ? (dose / perMl) * 100 : null
                const active = Math.abs(parseDecimal(diluent) - volume) < 0.001

                return (
                  <TableRow key={volume} className={active ? "bg-primary/[0.05]" : undefined}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2">
                        <Syringe className={active ? "size-3.5 text-primary" : "size-3.5 text-muted-foreground"} />
                        <span className="text-[13px] font-medium tabular-nums">
                          {decimal(volume, 1)} ml
                        </span>
                        {active && (
                          <Badge variant="outline" className="border-primary/25 bg-primary/10 text-[10px] text-primary">
                            atual
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[13px] tabular-nums">
                      {perMl > 0 ? `${decimal(perMl, 1)} UI/ml` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-[13px] tabular-nums">
                      {perMl > 0 ? `${decimal(perMl / 10, 1)} UI` : "—"}
                    </TableCell>
                    <TableCell className="pr-5 text-right text-[13px] tabular-nums">
                      {marks !== null ? decimal(marks, 1) : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

function EmptyResult({ icon: Icon, message }: { icon: typeof Calculator; message: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-2xl bg-accent">
        <Icon className="size-5 text-primary" />
      </div>
      <p className="mt-3.5 max-w-xs text-[13px] leading-relaxed text-muted-foreground">{message}</p>
    </div>
  )
}
