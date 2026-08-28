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
  position2d?: [number, number]
  position3d?: [number, number, number]
}

export type ProcedureMap = {
  id: string
  patientId: string
  patientName: string
  date: string
  procedure: string
  mode: "TWO_D" | "THREE_D"
  status: "DRAFT" | "COMPLETED" | "ARCHIVED"
  points: MapPoint[]
}

type ProcedureMapState = {
  maps: ProcedureMap[]
  loading: boolean
  error: string | null

  fetchMaps: (patientId: string) => Promise<void>
  saveMap: (patientId: string, input: { procedure: string; mode?: "TWO_D" | "THREE_D"; points: MapPoint[] }) => Promise<ProcedureMap | null>
  addPointToMap: (mapId: string, point: Omit<MapPoint, "id">) => Promise<boolean>
  removePointFromMap: (mapId: string, pointId: string) => Promise<boolean>
  completeMap: (mapId: string) => Promise<boolean>
  removeMap: (id: string) => void
}

export function mapDbProcedureMapToFrontend(dbM: any): ProcedureMap {
  return {
    id: dbM.id,
    patientId: dbM.patientId,
    patientName: dbM.patientName,
    date: dbM.createdAt ? new Date(dbM.createdAt).toISOString().split("T")[0] : CLINIC_TODAY,
    procedure: dbM.procedureName,
    mode: dbM.mode || "TWO_D",
    status: dbM.status || "DRAFT",
    points: (dbM.points || []).map((pt: any) => ({
      id: pt.id,
      regionId: pt.regionId,
      regionName: pt.regionName,
      product: pt.product,
      quantity: pt.quantity,
      depth: pt.depth,
      technique: pt.technique,
      note: pt.note || undefined,
      position2d: pt.position2dX !== null && pt.position2dY !== null ? [pt.position2dX, pt.position2dY] : undefined,
      position3d: pt.position3dX !== null && pt.position3dY !== null && pt.position3dZ !== null
        ? [pt.position3dX, pt.position3dY, pt.position3dZ]
        : undefined,
    })),
  }
}

export const useProcedureMapStore = create<ProcedureMapState>((set, get) => ({
  maps: [],
  loading: false,
  error: null,

  fetchMaps: async (patientId) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/patients/${patientId}/maps`)
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.maps || []).map(mapDbProcedureMapToFrontend)
        set({ maps: mapped, loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  saveMap: async (patientId, input) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/patients/${patientId}/maps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedureName: input.procedure,
          mode: input.mode || "TWO_D",
          points: input.points.map((pt) => ({
            regionId: pt.regionId,
            regionName: pt.regionName,
            product: pt.product,
            quantity: pt.quantity,
            depth: pt.depth,
            technique: pt.technique,
            note: pt.note || null,
            position2dX: pt.position2d ? pt.position2d[0] : null,
            position2dY: pt.position2d ? pt.position2d[1] : null,
            position3dX: pt.position3d ? pt.position3d[0] : null,
            position3dY: pt.position3d ? pt.position3d[1] : null,
            position3dZ: pt.position3d ? pt.position3d[2] : null,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        set({ loading: false, error: data.error?.message || "Erro ao salvar mapa." })
        return null
      }

      const created = mapDbProcedureMapToFrontend(data.map)
      set((state) => ({
        maps: [created, ...state.maps],
        loading: false,
      }))
      return created
    } catch (err: any) {
      set({ loading: false, error: err.message || "Erro de conexão." })
      return null
    }
  },

  addPointToMap: async (mapId, point) => {
    try {
      const res = await fetch(`/api/maps/${mapId}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionId: point.regionId,
          regionName: point.regionName,
          product: point.product,
          quantity: point.quantity,
          depth: point.depth,
          technique: point.technique,
          note: point.note || null,
          position2dX: point.position2d ? point.position2d[0] : null,
          position2dY: point.position2d ? point.position2d[1] : null,
          position3dX: point.position3d ? point.position3d[0] : null,
          position3dY: point.position3d ? point.position3d[1] : null,
          position3dZ: point.position3d ? point.position3d[2] : null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const newPt: MapPoint = {
          id: data.point.id,
          regionId: data.point.regionId,
          regionName: data.point.regionName,
          product: data.point.product,
          quantity: data.point.quantity,
          depth: data.point.depth,
          technique: data.point.technique,
          note: data.point.note || undefined,
          position2d: data.point.position2dX !== null && data.point.position2dY !== null ? [data.point.position2dX, data.point.position2dY] : undefined,
          position3d: data.point.position3dX !== null && data.point.position3dY !== null && data.point.position3dZ !== null
            ? [data.point.position3dX, data.point.position3dY, data.point.position3dZ]
            : undefined,
        }
        set((state) => ({
          maps: state.maps.map((m) => (m.id === mapId ? { ...m, points: [...m.points, newPt] } : m)),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  removePointFromMap: async (mapId, pointId) => {
    try {
      const res = await fetch(`/api/maps/${mapId}/points/${pointId}`, { method: "DELETE" })
      if (res.ok) {
        set((state) => ({
          maps: state.maps.map((m) =>
            m.id === mapId ? { ...m, points: m.points.filter((pt) => pt.id !== pointId) } : m,
          ),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  completeMap: async (mapId) => {
    try {
      const res = await fetch(`/api/maps/${mapId}/complete`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        const updated = mapDbProcedureMapToFrontend(data.map)
        set((state) => ({
          maps: state.maps.map((m) => (m.id === mapId ? updated : m)),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  removeMap: (id) =>
    set((state) => ({ maps: state.maps.filter((item) => item.id !== id) })),
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
