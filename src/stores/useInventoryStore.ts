import { create } from "zustand"

import {
  type ContentUnit,
  type Product,
  type StockMovement,
} from "@/data/inventory"

import { CLINIC_TODAY } from "@/lib/clinic"
import { parseLocalDate } from "@/lib/utils"

export type NewProductInput = {
  name: string
  brand: string
  category: string
  contentUnit: ContentUnit
  contentPerPack: number
  packLabel: string
  packs: number
  minPacks: number
  packCost: number
  lot: string
  expiresAt: string
  supplier: string
}

export type ConsumeResult = {
  ok: boolean
  consumed: number
  cost: number
  shortage: number
}

type InventoryState = {
  products: Product[]
  movements: StockMovement[]
  loading: boolean
  error: string | null
  expiryWindowDays: number

  fetchProducts: () => Promise<void>
  fetchMovements: () => Promise<void>
  addProduct: (input: NewProductInput) => Promise<Product | null>
  restock: (productId: string, packs: number) => Promise<boolean>
}

export function mapDbItemToFrontendProduct(dbItem: any): Product {
  const expiresAtFormatted = dbItem.expiresAt
    ? new Date(dbItem.expiresAt).toISOString().split("T")[0]
    : CLINIC_TODAY

  return {
    id: dbItem.id,
    name: dbItem.name,
    brand: dbItem.brand,
    category: dbItem.category,
    contentUnit: dbItem.contentUnit as ContentUnit,
    contentPerPack: Number(dbItem.contentPerPack),
    packLabel: dbItem.packLabel,
    quantity: Number(dbItem.quantity),
    minQuantity: Number(dbItem.minQuantity),
    packCost: Number(dbItem.packCost),
    lot: dbItem.lot,
    expiresAt: expiresAtFormatted,
    supplier: dbItem.supplier || "",
  }
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  movements: [],
  loading: false,
  error: null,
  expiryWindowDays: 30,

  fetchProducts: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch("/api/inventory")
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.items || []).map(mapDbItemToFrontendProduct)
        set({ products: mapped, loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  fetchMovements: async () => {
    try {
      const res = await fetch("/api/inventory/movements")
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.movements || []).map((m: any) => ({
          id: m.id,
          productId: m.inventoryItemId,
          productName: m.productNameSnapshot,
          date: m.createdAt ? new Date(m.createdAt).toISOString().split("T")[0] : CLINIC_TODAY,
          kind: m.type === "IN" ? "entrada" : "saida",
          quantity: Number(m.quantity),
          unit: m.unit,
          reason: m.reason,
        }))
        set({ movements: mapped })
      }
    } catch {
      // ignore
    }
  },

  addProduct: async (input) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          brand: input.brand,
          category: input.category,
          contentUnit: input.contentUnit,
          contentPerPack: input.contentPerPack,
          packLabel: input.packLabel,
          packs: input.packs,
          minPacks: input.minPacks,
          packCost: input.packCost,
          lot: input.lot,
          expiresAt: input.expiresAt || null,
          supplier: input.supplier || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        set({ loading: false, error: data.error?.message || "Erro ao cadastrar produto." })
        return null
      }

      const newProduct = mapDbItemToFrontendProduct(data.product)
      set((state) => ({
        products: [newProduct, ...state.products],
        loading: false,
      }))

      await get().fetchMovements()
      return newProduct
    } catch (err: any) {
      set({ loading: false, error: err.message || "Erro de conexão." })
      return null
    }
  },

  restock: async (productId, packs) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/inventory/${productId}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packs }),
      })

      if (!res.ok) {
        set({ loading: false })
        return false
      }

      await get().fetchProducts()
      await get().fetchMovements()
      set({ loading: false })
      return true
    } catch {
      set({ loading: false })
      return false
    }
  },
}))

export function unitCostOf(product: Product) {
  return product.packCost / product.contentPerPack
}

export function stockValueOf(product: Product) {
  return product.quantity * unitCostOf(product)
}

export function packsOf(product: Product) {
  return product.quantity / product.contentPerPack
}

export function daysUntilExpiry(product: Product) {
  return Math.round(
    (parseLocalDate(product.expiresAt).getTime() - parseLocalDate(CLINIC_TODAY).getTime()) /
      86_400_000,
  )
}

export function isLowStock(product: Product) {
  return product.quantity <= product.minQuantity
}

export function isExpiringSoon(product: Product, windowDays: number) {
  const days = daysUntilExpiry(product)
  return days <= windowDays
}

export function selectLowStock(products: Product[]) {
  return products
    .filter(isLowStock)
    .sort((a, b) => a.quantity / a.minQuantity - b.quantity / b.minQuantity)
}

export function selectExpiringSoon(products: Product[], windowDays: number) {
  return products
    .filter((product) => isExpiringSoon(product, windowDays))
    .sort((a, b) => daysUntilExpiry(a) - daysUntilExpiry(b))
}

export function selectTotalStockValue(products: Product[]) {
  return products.reduce((sum, product) => sum + stockValueOf(product), 0)
}

export function suggestProductFor(products: Product[], category: string) {
  return (
    products.find((product) => product.category === category && product.quantity > 0) ??
    products.find((product) => product.category === category)
  )
}
