import { create } from "zustand"

import type { TagColor } from "@/lib/crm-api"

export type StageType = "OPEN" | "WON" | "LOST"

export const STAGE_TYPE_LABEL: Record<StageType, string> = {
  OPEN: "Em andamento",
  WON: "Ganho",
  LOST: "Perdido",
}

export type PipelineStage = {
  id: string
  name: string
  color: TagColor
  type: StageType
  position: number
  leadCount: number
}

export type PipelineKind = "CLINIC" | "DIGITAL"

export type Product = {
  id: string
  name: string
  price: number
  active: boolean
  externalIds: string[]
  pipelineId: string | null
  buyerStageId: string | null
  buyerTag: string | null
}

export type ProductInput = Partial<Omit<Product, "id">> & { name?: string }

export const PURCHASE_STATUS_LABEL = {
  INTERESTED: "Interessada",
  CHECKOUT_ABANDONED: "Checkout abandonado",
  PURCHASED: "Comprou",
  REFUNDED: "Reembolso",
} as const

export type PurchaseStatus = keyof typeof PURCHASE_STATUS_LABEL

export const DIGITAL_SOURCES = [
  "Instagram",
  "Anúncio",
  "Lançamento",
  "Live",
  "Indicação",
  "Hotmart",
  "Kiwify",
  "WhatsApp",
  "Orgânico",
]

export type Pipeline = {
  id: string
  name: string
  kind: PipelineKind
  isDefault: boolean
  stages: PipelineStage[]
}

type PipelineState = {
  pipelines: Pipeline[]
  loaded: boolean
  load: () => Promise<void>
  createPipeline: (name: string, kind?: PipelineKind) => Promise<string>
  renamePipeline: (id: string, name: string) => Promise<void>
  setPipelineKind: (id: string, kind: PipelineKind) => Promise<void>
  products: Product[]
  loadProducts: () => Promise<void>
  saveProduct: (id: string | null, input: ProductInput) => Promise<Product>
  deleteProduct: (id: string) => Promise<void>
  deletePipeline: (id: string) => Promise<void>
  createStage: (pipelineId: string, input: { name: string; color: TagColor; type: StageType }) => Promise<void>
  updateStage: (id: string, patch: Partial<{ name: string; color: TagColor; type: StageType }>) => Promise<void>
  deleteStage: (id: string, moveToStageId?: string) => Promise<void>
  reorderStages: (pipelineId: string, stageIds: string[]) => Promise<void>
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      json?.error?.message ?? (res.status === 403 ? "Você não possui permissão para esta ação." : `Erro ${res.status}`),
    )
  }
  return json as T
}

/** Pipelines e etapas do CRM da clínica. */
export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelines: [],
  loaded: false,

  load: async () => {
    const { pipelines } = await call<{ pipelines: Pipeline[] }>("GET", "/api/crm/pipelines")
    set({ pipelines, loaded: true })
  },

  createPipeline: async (name, kind = "CLINIC") => {
    const data = await call<{ pipelineId: string; pipelines: Pipeline[] }>("POST", "/api/crm/pipelines", { name, kind })
    set({ pipelines: data.pipelines })
    return data.pipelineId
  },

  renamePipeline: async (id, name) => {
    const data = await call<{ pipelines: Pipeline[] }>("PATCH", `/api/crm/pipelines/${id}`, { name })
    set({ pipelines: data.pipelines })
  },

  setPipelineKind: async (id, kind) => {
    const data = await call<{ pipelines: Pipeline[] }>("PATCH", `/api/crm/pipelines/${id}`, { kind })
    set({ pipelines: data.pipelines })
  },

  products: [],

  loadProducts: async () => {
    const { products } = await call<{ products: Product[] }>("GET", "/api/crm/products")
    set({ products })
  },

  saveProduct: async (id, input) => {
    const { product } = id
      ? await call<{ product: Product }>("PATCH", `/api/crm/products/${id}`, input)
      : await call<{ product: Product }>("POST", "/api/crm/products", input)
    set((state) => ({
      products: id ? state.products.map((p) => (p.id === id ? product : p)) : [...state.products, product],
    }))
    return product
  },

  deleteProduct: async (id) => {
    await call("DELETE", `/api/crm/products/${id}`)
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }))
  },

  deletePipeline: async (id) => {
    const data = await call<{ pipelines: Pipeline[] }>("DELETE", `/api/crm/pipelines/${id}`)
    set({ pipelines: data.pipelines })
  },

  createStage: async (pipelineId, input) => {
    const data = await call<{ pipelines: Pipeline[] }>("POST", `/api/crm/pipelines/${pipelineId}/stages`, input)
    set({ pipelines: data.pipelines })
  },

  updateStage: async (id, patch) => {
    const data = await call<{ pipelines: Pipeline[] }>("PATCH", `/api/crm/stages/${id}`, patch)
    set({ pipelines: data.pipelines })
  },

  deleteStage: async (id, moveToStageId) => {
    const query = moveToStageId ? `?moveToStageId=${moveToStageId}` : ""
    const data = await call<{ pipelines: Pipeline[] }>("DELETE", `/api/crm/stages/${id}${query}`)
    set({ pipelines: data.pipelines })
  },

  reorderStages: async (pipelineId, stageIds) => {
    // Otimista: reordena já na tela.
    const previous = get().pipelines
    set({
      pipelines: previous.map((p) =>
        p.id === pipelineId
          ? { ...p, stages: stageIds.map((id, position) => ({ ...p.stages.find((s) => s.id === id)!, position })) }
          : p,
      ),
    })
    try {
      const data = await call<{ pipelines: Pipeline[] }>("PUT", `/api/crm/pipelines/${pipelineId}/stages/order`, { stageIds })
      set({ pipelines: data.pipelines })
    } catch (err) {
      set({ pipelines: previous })
      throw err
    }
  },
}))
