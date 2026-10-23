import { useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch"
import { parseMoney } from "@/lib/money"
import { formatCurrency } from "@/lib/utils"
import { usePipelineStore, type Product } from "@/stores/usePipelineStore"

const NONE = "__none__"

type Form = {
  name: string
  price: string
  active: boolean
  externalIds: string
  pipelineId: string
  buyerStageId: string
  buyerTag: string
}

const empty: Form = {
  name: "",
  price: "",
  active: true,
  externalIds: "",
  pipelineId: NONE,
  buyerStageId: NONE,
  buyerTag: "compradora",
}

function toForm(p: Product): Form {
  return {
    name: p.name,
    price: p.price ? p.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
    active: p.active,
    externalIds: p.externalIds.join(", "),
    pipelineId: p.pipelineId ?? NONE,
    buyerStageId: p.buyerStageId ?? NONE,
    buyerTag: p.buyerTag ?? "",
  }
}

/** Cadastro dos produtos digitais (nome, preço, códigos nas plataformas e destino de quem compra). */
export function ManageProductsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const products = usePipelineStore((s) => s.products)
  const pipelines = usePipelineStore((s) => s.pipelines)
  const loadProducts = usePipelineStore((s) => s.loadProducts)
  const saveProduct = usePipelineStore((s) => s.saveProduct)
  const deleteProduct = usePipelineStore((s) => s.deleteProduct)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) loadProducts().catch(() => toast.error("Não foi possível carregar os produtos."))
  }, [open, loadProducts])

  const pipeline = pipelines.find((p) => p.id === form?.pipelineId)
  const stages = [...(pipeline?.stages ?? [])].sort((a, b) => a.position - b.position)
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form) return
    const price = form.price.trim() ? parseMoney(form.price) : 0
    if (!form.name.trim()) return toast.error("Informe o nome do produto.")
    if (Number.isNaN(price)) return toast.error("Preço inválido. Ex.: 1.997,00")
    setSaving(true)
    try {
      await saveProduct(editingId, {
        name: form.name.trim(),
        price,
        active: form.active,
        externalIds: form.externalIds
          .split(/[,\n]/)
          .map((v) => v.trim())
          .filter(Boolean),
        pipelineId: form.pipelineId === NONE ? null : form.pipelineId,
        buyerStageId: form.buyerStageId === NONE ? null : form.buyerStageId,
        buyerTag: form.buyerTag.trim() || null,
      })
      toast.success(editingId ? "Produto atualizado." : "Produto criado.")
      setForm(null)
      setEditingId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o produto.")
    } finally {
      setSaving(false)
    }
  }

  async function remove(product: Product) {
    if (!window.confirm(`Excluir o produto "${product.name}"? Os leads continuam no funil, sem produto.`)) return
    try {
      await deleteProduct(product.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir.")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setForm(null)
          setEditingId(null)
        }
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Produtos digitais</DialogTitle>
          <DialogDescription>
            Cursos, mentorias e imersões que aparecem nos pipelines de produtos digitais. O destino de compra é usado
            pela automação de vendas (Hotmart, Kiwify).
          </DialogDescription>
        </DialogHeader>

        {!form ? (
          <>
            <div className="space-y-2">
              {products.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
              ) : (
                products.map((product) => {
                  const dest = pipelines.find((p) => p.id === product.pipelineId)
                  const stage = dest?.stages.find((s) => s.id === product.buyerStageId)
                  return (
                    <div key={product.id} className="flex items-center gap-3 rounded-xl border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">
                          {product.name}
                          {!product.active && <span className="ml-2 text-[11px] font-normal text-muted-foreground">(inativo)</span>}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {formatCurrency(product.price)}
                          {dest && ` · compradoras vão para ${dest.name}${stage ? ` / ${stage.name}` : ""}`}
                          {product.externalIds.length > 0 && ` · códigos: ${product.externalIds.join(", ")}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Editar produto"
                        onClick={() => {
                          setEditingId(product.id)
                          setForm(toForm(product))
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Excluir produto" onClick={() => remove(product)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setForm({ ...empty, pipelineId: pipelines.find((p) => p.kind === "DIGITAL")?.id ?? NONE })}>
                <Plus /> Novo produto
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <div>
                <Label htmlFor="pr-name" className="text-[13px]">
                  Nome
                </Label>
                <Input id="pr-name" value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="pr-price" className="text-[13px]">
                  Preço
                </Label>
                <Input
                  id="pr-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0,00"
                  className="mt-1.5 tabular-nums"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pr-ext" className="text-[13px]">
                Códigos do produto nas plataformas (opcional)
              </Label>
              <Input
                id="pr-ext"
                value={form.externalIds}
                onChange={(e) => set("externalIds", e.target.value)}
                placeholder="Ex.: 1234567 (Hotmart), abc-123 (Kiwify)"
                className="mt-1.5"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Separe por vírgula. Se ficar vazio, a automação reconhece o produto pelo nome.
              </p>
            </div>

            <div className="grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-3">
              <div>
                <Label className="text-[13px]">Quem comprar vai para</Label>
                <Select
                  value={form.pipelineId}
                  onValueChange={(value) => value && setForm((f) => (f ? { ...f, pipelineId: value, buyerStageId: NONE } : f))}
                >
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não mover</SelectItem>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[13px]">Etapa</Label>
                <Select value={form.buyerStageId} onValueChange={(value) => value && set("buyerStageId", value)}>
                  <SelectTrigger className="mt-1.5 w-full" disabled={form.pipelineId === NONE}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Etapa de ganho</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pr-tag" className="text-[13px]">
                  Etiqueta
                </Label>
                <Input
                  id="pr-tag"
                  value={form.buyerTag}
                  onChange={(e) => set("buyerTag", e.target.value)}
                  placeholder="compradora"
                  className="mt-1.5"
                  maxLength={40}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-[13px]">
              <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} /> Produto ativo (aparece na lista
              do card)
            </label>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(null)
                  setEditingId(null)
                }}
              >
                Voltar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Salvar produto
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
