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
  /** Quantidade efetivamente baixada — menor que a pedida se faltou saldo. */
  consumed: number
  /** Custo do que saiu, para lançar como custo direto no financeiro. */
  cost: number
  shortage: number
}

type InventoryState = {
  products: Product[]
  movements: StockMovement[]
  /** Janela, em dias, para considerar um lote "próximo do vencimento". */
  expiryWindowDays: number

  addProduct: (input: NewProductInput) => Product
  restock: (productId: string, packs: number) => void
  /** Dá baixa no saldo e registra a movimentação. Devolve o custo consumido. */
  consume: (input: {
    productId: string
    quantity: number
    reason: string
    patientId?: string
    patientName?: string
  }) => ConsumeResult
  removeProduct: (productId: string) => void
}

let sequence = 0
const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  movements: [],
  expiryWindowDays: 30,


  addProduct: (input) => {
    const product: Product = {
      id: nextId("prod"),
      name: input.name.trim(),
      brand: input.brand.trim(),
      category: input.category,
      contentUnit: input.contentUnit,
      contentPerPack: input.contentPerPack,
      packLabel: input.packLabel,
      quantity: input.packs * input.contentPerPack,
      minQuantity: input.minPacks * input.contentPerPack,
      packCost: input.packCost,
      lot: input.lot.trim(),
      expiresAt: input.expiresAt,
      supplier: input.supplier.trim(),
    }

    set((state) => ({
      products: [product, ...state.products],
      movements: [
        {
          id: nextId("mov"),
          productId: product.id,
          productName: product.name,
          date: CLINIC_TODAY,
          kind: "entrada",
          quantity: product.quantity,
          unit: product.contentUnit,
          reason: `Cadastro inicial · lote ${product.lot}`,
        },
        ...state.movements,
      ],
    }))

    return product
  },

  restock: (productId, packs) =>
    set((state) => {
      const product = state.products.find((item) => item.id === productId)
      if (!product || packs <= 0) return state

      const quantity = packs * product.contentPerPack

      return {
        products: state.products.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + quantity } : item,
        ),
        movements: [
          {
            id: nextId("mov"),
            productId,
            productName: product.name,
            date: CLINIC_TODAY,
            kind: "entrada",
            quantity,
            unit: product.contentUnit,
            reason: `Reposição · ${packs} ${product.packLabel}`,
          },
          ...state.movements,
        ],
      }
    }),

  consume: ({ productId, quantity, reason, patientId, patientName }) => {
    const product = get().products.find((item) => item.id === productId)
    if (!product || quantity <= 0) return { ok: false, consumed: 0, cost: 0, shortage: quantity }

    const consumed = Math.min(quantity, product.quantity)
    const shortage = quantity - consumed
    const cost = consumed * (product.packCost / product.contentPerPack)

    set((state) => ({
      products: state.products.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity - consumed } : item,
      ),
      movements: [
        {
          id: nextId("mov"),
          productId,
          productName: product.name,
          date: CLINIC_TODAY,
          kind: "saida",
          quantity: consumed,
          unit: product.contentUnit,
          reason,
          patientId,
          patientName,
        },
        ...state.movements,
      ],
    }))

    return { ok: shortage === 0, consumed, cost, shortage }
  },

  removeProduct: (productId) =>
    set((state) => ({ products: state.products.filter((item) => item.id !== productId) })),
}))



/* ------------------------------------------------------------------ *
 * Seletores derivados
 * ------------------------------------------------------------------ */

export function unitCostOf(product: Product) {
  return product.packCost / product.contentPerPack
}

export function stockValueOf(product: Product) {
  return product.quantity * unitCostOf(product)
}

export function packsOf(product: Product) {
  return product.quantity / product.contentPerPack
}

/** Dias até o vencimento a partir do "hoje" da clínica. Negativo quando vencido. */
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

/** Produto com saldo suficiente para atender um procedimento da categoria. */
export function suggestProductFor(products: Product[], category: string) {
  return (
    products.find((product) => product.category === category && product.quantity > 0) ??
    products.find((product) => product.category === category)
  )
}
