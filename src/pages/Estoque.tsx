import { useEffect, useMemo } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarX2,
  PackageCheck,
  Plus,
  TriangleAlert,
} from "lucide-react"
import { toast } from "sonner"

import { NewProductDialog } from "@/components/inventory/NewProductDialog"
import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Product } from "@/data/inventory"
import { CLINIC_TODAY } from "@/lib/clinic"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  daysUntilExpiry,
  isLowStock,
  packsOf,
  selectExpiringSoon,
  selectLowStock,
  selectTotalStockValue,
  stockValueOf,
  unitCostOf,
  useInventoryStore,
} from "@/stores/useInventoryStore"

const decimal = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits })

function expiryTone(days: number) {
  if (days < 0) return "border-destructive/25 bg-destructive/10 text-destructive"
  if (days <= 30) return "border-warning/30 bg-warning/12 text-warning-foreground"
  if (days <= 90) return "border-border bg-muted text-muted-foreground"
  return "border-success/25 bg-success/10 text-success"
}

function expiryLabel(days: number) {
  if (days < 0) return `vencido há ${Math.abs(days)} d`
  if (days === 0) return "vence hoje"
  return `${days} dias`
}

export default function Estoque() {
  const products = useInventoryStore((state) => state.products)
  const movements = useInventoryStore((state) => state.movements)
  const fetchProducts = useInventoryStore((state) => state.fetchProducts)
  const fetchMovements = useInventoryStore((state) => state.fetchMovements)

  useEffect(() => {
    fetchProducts()
    fetchMovements()
  }, [fetchProducts, fetchMovements])
  const windowDays = useInventoryStore((state) => state.expiryWindowDays)
  const restock = useInventoryStore((state) => state.restock)

  const lowStock = useMemo(() => selectLowStock(products), [products])
  const expiring = useMemo(() => selectExpiringSoon(products, windowDays), [products, windowDays])
  const totalValue = useMemo(() => selectTotalStockValue(products), [products])
  const movementsToday = useMemo(
    () => movements.filter((movement) => movement.date === CLINIC_TODAY),
    [movements],
  )

  function handleRestock(product: Product) {
    restock(product.id, 1)
    toast.success(`+1 ${product.packLabel} de ${product.name}`, {
      description: `Saldo atualizado para ${decimal(
        (product.quantity + product.contentPerPack) / product.contentPerPack,
      )} ${product.packLabel}.`,
    })
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Estoque"
        description="Saldo, lotes e validade — com baixa automática a cada procedimento registrado."
        actions={<NewProductDialog />}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="Valor em estoque"
          value={formatCurrency(totalValue)}
          hint={`${products.length} produtos cadastrados`}
        />
        <StatCard
          icon={TriangleAlert}
          label="Abaixo do mínimo"
          value={String(lowStock.length)}
          hint={lowStock[0] ? `Mais crítico: ${lowStock[0].name}` : "Tudo dentro do mínimo"}
          tone={lowStock.length > 0 ? "destructive" : "neutral"}
        />
        <StatCard
          icon={CalendarX2}
          label={`Vencem em ${windowDays} dias`}
          value={String(expiring.length)}
          hint={
            expiring[0]
              ? `${expiring[0].name} · lote ${expiring[0].lot}`
              : "Nenhum lote próximo do vencimento"
          }
          tone={expiring.length > 0 ? "warning" : "neutral"}
        />
        <StatCard
          icon={PackageCheck}
          label="Movimentações hoje"
          value={String(movementsToday.length)}
          hint="Entradas e saídas registradas"
        />
      </div>

      <Tabs defaultValue="produtos">
        <TabsList className="mb-4 h-auto w-fit gap-1 rounded-full bg-muted/60 p-1">
          <TabsTrigger value="produtos" className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs">
            Produtos
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs">
            Movimentações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos">
          <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[220px] pl-5">Produto</TableHead>
                    <TableHead className="min-w-[180px]">Saldo</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="text-right">Custo unitário</TableHead>
                    <TableHead className="text-right">Valor em estoque</TableHead>
                    <TableHead className="w-10 pr-5" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {products.map((product) => {
                    const days = daysUntilExpiry(product)
                    const low = isLowStock(product)
                    const fill = Math.min(
                      (product.quantity / Math.max(product.minQuantity, 1)) * 50,
                      100,
                    )

                    return (
                      <TableRow key={product.id} className={cn("border-border/60", low && "bg-destructive/[0.03]")}>
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold">{product.name}</p>
                            {low && (
                              <Badge
                                variant="outline"
                                className="border-destructive/25 bg-destructive/10 text-[10px] text-destructive"
                              >
                                abaixo do mínimo
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {product.brand} · {product.category} · {product.supplier}
                          </p>
                        </TableCell>

                        <TableCell>
                          <p className="text-[13px] font-medium tabular-nums">
                            {decimal(product.quantity)} {product.contentUnit}
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                              ≈ {decimal(packsOf(product))} {product.packLabel}
                            </span>
                          </p>
                          <div className="mt-1.5 h-1.5 w-full max-w-[150px] overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-[width]",
                                low ? "bg-destructive" : "bg-success",
                              )}
                              style={{ width: `${fill}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            mínimo {decimal(product.minQuantity)} {product.contentUnit}
                          </p>
                        </TableCell>

                        <TableCell className="text-[12px] tabular-nums text-muted-foreground">
                          {product.lot}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]", expiryTone(days))}>
                            {expiryLabel(days)}
                          </Badge>
                          <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                            {formatDate(product.expiresAt)}
                          </p>
                        </TableCell>

                        <TableCell className="text-right text-[13px] tabular-nums">
                          {formatCurrency(unitCostOf(product))}
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            /{product.contentUnit}
                          </span>
                        </TableCell>

                        <TableCell className="text-right text-[13px] font-semibold tabular-nums">
                          {formatCurrency(stockValueOf(product))}
                        </TableCell>

                        <TableCell className="pr-5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Repor ${product.name}`}
                            title={`Adicionar 1 ${product.packLabel}`}
                            onClick={() => handleRestock(product)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Plus />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/25 px-5 py-3 text-[12px] text-muted-foreground">
              <span>O botão + repõe uma embalagem fechada e registra a entrada.</span>
              <span className="tabular-nums">Total imobilizado: {formatCurrency(totalValue)}</span>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Data</TableHead>
                    <TableHead className="min-w-[200px]">Produto</TableHead>
                    <TableHead className="min-w-[240px]">Motivo</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead className="pr-5 text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id} className="border-border/60">
                      <TableCell className="pl-5 text-[13px] tabular-nums">
                        {formatDate(movement.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "grid size-6 shrink-0 place-items-center rounded-lg",
                              movement.kind === "entrada"
                                ? "bg-success/12 text-success"
                                : "bg-primary/10 text-primary",
                            )}
                          >
                            {movement.kind === "entrada" ? (
                              <ArrowUpRight className="size-3" />
                            ) : (
                              <ArrowDownRight className="size-3" />
                            )}
                          </span>
                          <span className="text-[13px] font-medium">{movement.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">{movement.reason}</TableCell>
                      <TableCell className="text-[12px]">{movement.patientName ?? "—"}</TableCell>
                      <TableCell
                        className={cn(
                          "pr-5 text-right text-[13px] font-semibold tabular-nums",
                          movement.kind === "entrada" ? "text-success" : "text-foreground",
                        )}
                      >
                        {movement.kind === "entrada" ? "+" : "−"} {decimal(movement.quantity)}{" "}
                        {movement.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: typeof Boxes
  label: string
  value: string
  hint: string
  tone?: "neutral" | "destructive" | "warning"
}) {
  const toneClass = {
    neutral: "text-foreground",
    destructive: "text-destructive",
    warning: "text-warning",
  }[tone]

  return (
    <Card className="gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]">
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground" />
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        </div>
        <p className={cn("mt-1.5 font-display text-2xl font-semibold tabular-nums", toneClass)}>{value}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
