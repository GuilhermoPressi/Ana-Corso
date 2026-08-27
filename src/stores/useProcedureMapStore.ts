import { create } from "zustand"

import { CLINIC_TODAY } from "@/lib/clinic"

export type MapPoint = {
  id: string
  regionId: string
  regionName: string
  product: string
  quantity: string
  depth: string
  technique: string
  note?: string
  /** Coordenada na malha 3D, quando o ponto foi marcado na visão tridimensional. */
  position3d?: [number, number, number]
}

export type ProcedureMap = {
  id: string
  patientId: string
  patientName: string
  date: string
  procedure: string
  points: MapPoint[]
}

type ProcedureMapState = {
  maps: ProcedureMap[]
  saveMap: (input: Omit<ProcedureMap, "id">) => ProcedureMap
  removeMap: (id: string) => void
}

let sequence = 0
const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`

const seedMaps: ProcedureMap[] = [
  {
    id: "map-seed-1",
    patientId: "p1",
    patientName: "Juliana Prado",
    date: "2026-08-24",
    procedure: "Toxina botulínica",
    points: [
      {
        id: "mp-1",
        regionId: "frontal",
        regionName: "Frontal",
        product: "Botox 100U · Allergan",
        quantity: "12 UI",
        depth: "Intramuscular",
        technique: "Puntiforme",
        note: "6 pontos, respeitando 2 cm da órbita.",
      },
      {
        id: "mp-2",
        regionId: "glabela",
        regionName: "Glabela",
        product: "Botox 100U · Allergan",
        quantity: "20 UI",
        depth: "Intramuscular",
        technique: "Puntiforme",
        note: "Padrão em V, 5 pontos.",
      },
      {
        id: "mp-3",
        regionId: "periorbital-d",
        regionName: "Periorbital direita",
        product: "Botox 100U · Allergan",
        quantity: "5 UI",
        depth: "Subcutâneo superficial",
        technique: "Puntiforme",
      },
      {
        id: "mp-4",
        regionId: "periorbital-e",
        regionName: "Periorbital esquerda",
        product: "Botox 100U · Allergan",
        quantity: "5 UI",
        depth: "Subcutâneo superficial",
        technique: "Puntiforme",
      },
    ],
  },
]

export const useProcedureMapStore = create<ProcedureMapState>((set) => ({
  maps: seedMaps,

  saveMap: (input) => {
    const map: ProcedureMap = { ...input, id: nextId("map"), date: input.date || CLINIC_TODAY }
    set((state) => ({ maps: [map, ...state.maps] }))
    return map
  },

  removeMap: (id) => set((state) => ({ maps: state.maps.filter((item) => item.id !== id) })),
}))

export function mapsForPatient(maps: ProcedureMap[], patientId: string) {
  return maps
    .filter((map) => map.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function countByRegion(points: MapPoint[]) {
  return points.reduce<Record<string, number>>((acc, point) => {
    acc[point.regionId] = (acc[point.regionId] ?? 0) + 1
    return acc
  }, {})
}

/** Soma as quantidades numéricas dos pontos, mantendo a unidade informada. */
export function totalQuantity(points: MapPoint[]) {
  const byUnit = new Map<string, number>()

  for (const point of points) {
    const match = point.quantity.match(/([\d.,]+)\s*(\D*)/)
    if (!match) continue
    const value = Number.parseFloat(match[1].replace(",", "."))
    if (!Number.isFinite(value)) continue
    const unit = (match[2] || "").trim() || "un"
    byUnit.set(unit, (byUnit.get(unit) ?? 0) + value)
  }

  return [...byUnit.entries()]
    .map(([unit, value]) => `${value.toLocaleString("pt-BR")} ${unit}`)
    .join(" · ")
}
