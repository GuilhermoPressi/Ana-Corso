import { useState } from "react"
import { PackagePlus } from "lucide-react"
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
import type { ContentUnit } from "@/data/inventory"
import { parseDecimal } from "@/lib/number"
import { useInventoryStore } from "@/stores/useInventoryStore"

const categories = [
  "Toxina botulínica",
  "Preenchimento",
  "Bioestimulador",
  "Skinbooster",
  "Microagulhamento",
  "Insumo",
]

const units: { id: ContentUnit; label: string }[] = [
  { id: "UI", label: "UI · unidades internacionais" },
  { id: "ml", label: "ml · mililitros" },
  { id: "un", label: "un · unidades" },
]

const empty = {
  name: "",
  brand: "",
  category: categories[0],
  contentUnit: "UI" as ContentUnit,
  contentPerPack: "100",
  packLabel: "frasco 100 UI",
  packs: "3",
  minPacks: "2",
  packCost: "",
  lot: "",
  expiresAt: "",
  supplier: "",
}

export function NewProductDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [touched, setTouched] = useState(false)

  const addProduct = useInventoryStore((state) => state.addProduct)

  const nameError = form.name.trim().length < 2
  const costError = !(parseDecimal(form.packCost) > 0)
  const contentError = !(parseDecimal(form.contentPerPack) > 0)
  const expiryError = form.expiresAt === ""
  const lotError = form.lot.trim().length < 2

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit() {
    setTouched(true)
    if (nameError || costError || contentError || expiryError || lotError) return

    const product = addProduct({
      name: form.name,
      brand: form.brand.trim() || "Sem marca",
      category: form.category,
      contentUnit: form.contentUnit,
      contentPerPack: parseDecimal(form.contentPerPack),
      packLabel: form.packLabel.trim() || "embalagem",
      packs: Math.max(parseDecimal(form.packs) || 0, 0),
      minPacks: Math.max(parseDecimal(form.minPacks) || 0, 0),
      packCost: parseDecimal(form.packCost),
      lot: form.lot,
      expiresAt: form.expiresAt,
      supplier: form.supplier,
    })

    toast.success(`${product.name} entrou no estoque`, {
      description: `Lote ${product.lot} · ${product.quantity.toLocaleString("pt-BR")} ${product.contentUnit} disponíveis.`,
    })

    setForm(empty)
    setTouched(false)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTouched(false)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]">
          <PackagePlus /> Novo produto
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Novo produto</DialogTitle>
          <DialogDescription>
            O saldo é controlado na unidade de conteúdo — UI para toxina, ml para preenchedores.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1 sm:grid-cols-2">
          <div>
            <Label htmlFor="pd-name" className="text-[13px]">
              Produto
            </Label>
            <Input
              id="pd-name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Ex.: Botox 100U"
              aria-invalid={touched && nameError}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="pd-brand" className="text-[13px]">
              Marca
            </Label>
            <Input
              id="pd-brand"
              value={form.brand}
              onChange={(event) => set("brand", event.target.value)}
              placeholder="Allergan"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-[13px]">Categoria</Label>
            <Select value={form.category} onValueChange={(value) => set("category", value)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[13px]">Unidade de conteúdo</Label>
            <Select
              value={form.contentUnit}
              onValueChange={(value) => set("contentUnit", value as ContentUnit)}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pd-content" className="text-[13px]">
              Conteúdo por embalagem
            </Label>
            <Input
              id="pd-content"
              inputMode="decimal"
              value={form.contentPerPack}
              onChange={(event) => set("contentPerPack", event.target.value)}
              aria-invalid={touched && contentError}
              className="mt-1.5 tabular-nums"
            />
          </div>

          <div>
            <Label htmlFor="pd-label" className="text-[13px]">
              Como você chama a embalagem
            </Label>
            <Input
              id="pd-label"
              value={form.packLabel}
              onChange={(event) => set("packLabel", event.target.value)}
              placeholder="frasco 100 UI"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="pd-packs" className="text-[13px]">
              Quantidade em estoque
            </Label>
            <Input
              id="pd-packs"
              inputMode="decimal"
              value={form.packs}
              onChange={(event) => set("packs", event.target.value)}
              className="mt-1.5 tabular-nums"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">Em embalagens fechadas.</p>
          </div>

          <div>
            <Label htmlFor="pd-min" className="text-[13px]">
              Estoque mínimo
            </Label>
            <Input
              id="pd-min"
              inputMode="decimal"
              value={form.minPacks}
              onChange={(event) => set("minPacks", event.target.value)}
              className="mt-1.5 tabular-nums"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">Dispara o alerta no painel.</p>
          </div>

          <div>
            <Label htmlFor="pd-cost" className="text-[13px]">
              Custo por embalagem
            </Label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
                R$
              </span>
              <Input
                id="pd-cost"
                inputMode="decimal"
                value={form.packCost}
                onChange={(event) => set("packCost", event.target.value)}
                placeholder="1.450,00"
                aria-invalid={touched && costError}
                className="pl-9 tabular-nums"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pd-supplier" className="text-[13px]">
              Fornecedor
            </Label>
            <Input
              id="pd-supplier"
              value={form.supplier}
              onChange={(event) => set("supplier", event.target.value)}
              placeholder="MedBeauty"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="pd-lot" className="text-[13px]">
              Lote
            </Label>
            <Input
              id="pd-lot"
              value={form.lot}
              onChange={(event) => set("lot", event.target.value)}
              placeholder="BTX-4471"
              aria-invalid={touched && lotError}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="pd-expiry" className="text-[13px]">
              Validade
            </Label>
            <Input
              id="pd-expiry"
              type="date"
              value={form.expiresAt}
              onChange={(event) => set("expiresAt", event.target.value)}
              aria-invalid={touched && expiryError}
              className="mt-1.5"
            />
          </div>
        </div>

        {touched && (nameError || costError || contentError || expiryError || lotError) && (
          <p className="text-[12px] text-destructive">
            Preencha produto, conteúdo por embalagem, custo, lote e validade para cadastrar.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} className="rounded-full">
            <PackagePlus /> Cadastrar produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
