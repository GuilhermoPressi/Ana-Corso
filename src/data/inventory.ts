export type ContentUnit = "UI" | "ml" | "un"

export type Product = {
  id: string
  name: string
  brand: string
  /** Categoria de procedimento que consome este produto. */
  category: string
  contentUnit: ContentUnit
  /** Quanto vem em cada embalagem, na unidade de conteúdo. */
  contentPerPack: number
  packLabel: string
  /** Saldo atual, sempre na unidade de conteúdo. */
  quantity: number
  minQuantity: number
  /** Custo de compra de uma embalagem fechada. */
  packCost: number
  lot: string
  expiresAt: string
  supplier: string
}

export type MovementKind = "entrada" | "saida" | "ajuste"

export type StockMovement = {
  id: string
  productId: string
  productName: string
  date: string
  kind: MovementKind
  /** Quantidade movimentada, na unidade de conteúdo do produto. */
  quantity: number
  unit: ContentUnit
  reason: string
  patientId?: string
  patientName?: string
}

export const seedProducts: Product[] = [
  {
    id: "prod-botox",
    name: "Botox 100U",
    brand: "Allergan",
    category: "Toxina botulínica",
    contentUnit: "UI",
    contentPerPack: 100,
    packLabel: "frasco 100 UI",
    quantity: 100,
    minQuantity: 300,
    packCost: 1450,
    lot: "BTX-4471",
    expiresAt: "2027-03-15",
    supplier: "Distribuidora Estética Sul",
  },
  {
    id: "prod-dysport",
    name: "Dysport 300U",
    brand: "Ipsen",
    category: "Toxina botulínica",
    contentUnit: "UI",
    contentPerPack: 300,
    packLabel: "frasco 300 UI",
    quantity: 900,
    minQuantity: 300,
    packCost: 2100,
    lot: "DYS-8812",
    expiresAt: "2027-01-20",
    supplier: "Distribuidora Estética Sul",
  },
  {
    id: "prod-restylane",
    name: "Restylane 1ml",
    brand: "Galderma",
    category: "Preenchimento",
    contentUnit: "ml",
    contentPerPack: 1,
    packLabel: "seringa 1 ml",
    quantity: 4,
    minQuantity: 5,
    packCost: 620,
    lot: "AH-2291",
    expiresAt: "2026-09-11",
    supplier: "MedBeauty",
  },
  {
    id: "prod-volift",
    name: "Juvéderm Volift 1ml",
    brand: "Allergan",
    category: "Preenchimento",
    contentUnit: "ml",
    contentPerPack: 1,
    packLabel: "seringa 1 ml",
    quantity: 6,
    minQuantity: 4,
    packCost: 780,
    lot: "JV-5540",
    expiresAt: "2027-05-30",
    supplier: "MedBeauty",
  },
  {
    id: "prod-voluma",
    name: "Juvéderm Voluma 1ml",
    brand: "Allergan",
    category: "Preenchimento",
    contentUnit: "ml",
    contentPerPack: 1,
    packLabel: "seringa 1 ml",
    quantity: 3,
    minQuantity: 3,
    packCost: 890,
    lot: "JV-6011",
    expiresAt: "2027-04-12",
    supplier: "MedBeauty",
  },
  {
    id: "prod-sculptra",
    name: "Sculptra",
    brand: "Galderma",
    category: "Bioestimulador",
    contentUnit: "un",
    contentPerPack: 1,
    packLabel: "frasco",
    quantity: 5,
    minQuantity: 3,
    packCost: 1180,
    lot: "SC-7712",
    expiresAt: "2027-08-01",
    supplier: "Distribuidora Estética Sul",
  },
  {
    id: "prod-radiesse",
    name: "Radiesse 1,5ml",
    brand: "Merz",
    category: "Bioestimulador",
    contentUnit: "ml",
    contentPerPack: 1.5,
    packLabel: "seringa 1,5 ml",
    quantity: 3,
    minQuantity: 4.5,
    packCost: 1320,
    lot: "RD-9902",
    expiresAt: "2026-09-18",
    supplier: "MedBeauty",
  },
  {
    id: "prod-skinbooster",
    name: "Skinbooster Vital",
    brand: "Galderma",
    category: "Skinbooster",
    contentUnit: "ml",
    contentPerPack: 2,
    packLabel: "frasco 2 ml",
    quantity: 14,
    minQuantity: 8,
    packCost: 540,
    lot: "SB-2240",
    expiresAt: "2027-02-14",
    supplier: "MedBeauty",
  },
  {
    id: "prod-soro",
    name: "Soro fisiológico 0,9%",
    brand: "Farmax",
    category: "Insumo",
    contentUnit: "ml",
    contentPerPack: 10,
    packLabel: "ampola 10 ml",
    quantity: 240,
    minQuantity: 100,
    packCost: 6,
    lot: "SF-1180",
    expiresAt: "2027-06-30",
    supplier: "Farmácia Central",
  },
  {
    id: "prod-descartaveis",
    name: "Kit descartáveis",
    brand: "Descarpack",
    category: "Insumo",
    contentUnit: "un",
    contentPerPack: 1,
    packLabel: "kit",
    quantity: 38,
    minQuantity: 20,
    packCost: 12,
    lot: "KD-4420",
    expiresAt: "2028-01-10",
    supplier: "Farmácia Central",
  },
]

export const seedMovements: StockMovement[] = [
  {
    id: "mov-1",
    productId: "prod-botox",
    productName: "Botox 100U",
    date: "2026-08-24",
    kind: "saida",
    quantity: 42,
    unit: "UI",
    reason: "Toxina botulínica · terço superior",
    patientId: "p1",
    patientName: "Juliana Prado",
  },
  {
    id: "mov-2",
    productId: "prod-volift",
    productName: "Juvéderm Volift 1ml",
    date: "2026-08-24",
    kind: "saida",
    quantity: 1,
    unit: "ml",
    reason: "Preenchimento labial",
    patientId: "p3",
    patientName: "Marina Bittencourt",
  },
  {
    id: "mov-3",
    productId: "prod-radiesse",
    productName: "Radiesse 1,5ml",
    date: "2026-08-24",
    kind: "saida",
    quantity: 1.5,
    unit: "ml",
    reason: "Bioestimulador · 1ª sessão",
    patientId: "p4",
    patientName: "Fernanda Rocha",
  },
  {
    id: "mov-4",
    productId: "prod-skinbooster",
    productName: "Skinbooster Vital",
    date: "2026-08-24",
    kind: "saida",
    quantity: 2,
    unit: "ml",
    reason: "Skinbooster · face e pescoço",
    patientId: "p6",
    patientName: "Camila Duarte",
  },
  {
    id: "mov-5",
    productId: "prod-botox",
    productName: "Botox 100U",
    date: "2026-08-24",
    kind: "saida",
    quantity: 4,
    unit: "UI",
    reason: "Toxina botulínica · retoque",
    patientId: "p9",
    patientName: "Patrícia Lemos",
  },
  {
    id: "mov-6",
    productId: "prod-sculptra",
    productName: "Sculptra",
    date: "2026-08-07",
    kind: "entrada",
    quantity: 6,
    unit: "un",
    reason: "Compra · Distribuidora Estética Sul",
  },
  {
    id: "mov-7",
    productId: "prod-restylane",
    productName: "Restylane 1ml",
    date: "2026-08-07",
    kind: "entrada",
    quantity: 6,
    unit: "ml",
    reason: "Compra · MedBeauty",
  },
]
