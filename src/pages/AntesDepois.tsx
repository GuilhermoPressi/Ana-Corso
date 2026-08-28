import { useEffect, useMemo, useState } from "react"
import { ArrowLeftRight, Camera, Images } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import { usePatientStore } from "@/stores/usePatientStore"

type GalleryPhoto = {
  id: string
  patientId: string
  patientName: string
  capturedAt: string
  type: string
  notes?: string
  accessUrl: string
}

export default function AntesDepois() {
  const patients = usePatientStore((state) => state.patients)
  const loadPatients = usePatientStore((state) => state.loadPatients)

  const [selectedPatientId, setSelectedPatientId] = useState<string>("all")
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])

  const [beforeId, setBeforeId] = useState<string | null>(null)
  const [afterId, setAfterId] = useState<string | null>(null)

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  useEffect(() => {
    async function loadAllPhotos() {
      try {
        const targetPatients = selectedPatientId === "all" ? patients : patients.filter((p) => p.id === selectedPatientId)
        const allLoaded: GalleryPhoto[] = []

        for (const p of targetPatients.slice(0, 10)) {
          const res = await fetch(`/api/patients/${p.id}/photos`)
          if (res.ok) {
            const data = await res.json()
            const items = (data.photos || []).map((pt: any) => ({
              id: pt.id,
              patientId: p.id,
              patientName: p.name,
              capturedAt: pt.capturedAt ? new Date(pt.capturedAt).toISOString().split("T")[0] : "2026-08-28",
              type: pt.type,
              notes: pt.notes || undefined,
              accessUrl: pt.accessUrl,
            }))
            allLoaded.push(...items)
          }
        }

        setPhotos(allLoaded)
      } catch {
        // ignore
      }
    }

    if (patients.length > 0) {
      loadAllPhotos()
    }
  }, [patients, selectedPatientId])

  const beforePhotos = useMemo(() => photos.filter((p) => p.type === "BEFORE" || p.type === "CLINICAL"), [photos])
  const afterPhotos = useMemo(() => photos.filter((p) => p.type === "AFTER" || p.type === "EVOLUTION"), [photos])

  const before = photos.find((p) => p.id === beforeId) ?? beforePhotos[0] ?? photos[0] ?? null
  const after = photos.find((p) => p.id === afterId) ?? afterPhotos[0] ?? photos[1] ?? null

  function swap() {
    const temp = beforeId
    setBeforeId(afterId)
    setAfterId(temp)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Antes e Depois"
        description="Galeria comparativa da clínica. Selecione uma paciente ou analise o portfólio completo de resultados."
        actions={
          <div className="flex items-center gap-3">
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Todas as pacientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pacientes</SelectItem>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Comparador Principal */}
      <Card className="overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 pt-5">
          <div>
            <CardTitle className="font-display text-base">Comparador de Resultados</CardTitle>
            <CardDescription className="mt-1">
              Visualização simultânea de evolução clínica de tratamento
            </CardDescription>
          </div>

          {before && after && (
            <Button variant="outline" size="sm" onClick={swap}>
              <ArrowLeftRight /> Inverter Lados
            </Button>
          )}
        </CardHeader>

        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
          {/* Lado Antes */}
          <div className="relative aspect-[4/3] bg-muted sm:aspect-[3/4]">
            {before ? (
              <>
                <img src={before.accessUrl} alt="Antes" className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  Antes · {before.patientName}
                </span>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                  <p className="text-[12px] font-semibold">{formatDate(before.capturedAt)}</p>
                  <p className="text-[10px] opacity-80">{before.notes || "Registro inicial"}</p>
                </div>
              </>
            ) : (
              <div className="grid h-full place-items-center p-6 text-center text-muted-foreground">
                <div>
                  <Camera className="mx-auto size-8 opacity-40" />
                  <p className="mt-2 text-[12px]">Nenhuma foto de "Antes" selecionada</p>
                </div>
              </div>
            )}
          </div>

          {/* Lado Depois */}
          <div className="relative aspect-[4/3] bg-muted sm:aspect-[3/4]">
            {after ? (
              <>
                <img src={after.accessUrl} alt="Depois" className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground backdrop-blur-sm">
                  Depois · {after.patientName}
                </span>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                  <p className="text-[12px] font-semibold">{formatDate(after.capturedAt)}</p>
                  <p className="text-[10px] opacity-80">{after.notes || "Resultado final"}</p>
                </div>
              </>
            ) : (
              <div className="grid h-full place-items-center p-6 text-center text-muted-foreground">
                <div>
                  <Camera className="mx-auto size-8 opacity-40" />
                  <p className="mt-2 text-[12px]">Nenhuma foto de "Depois" selecionada</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Grid de Fotos Clínicas */}
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold">Galeria de Registros Privados</h3>
        {photos.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Images className="mx-auto size-8 opacity-40" />
            <p className="mt-2 text-[13px]">Nenhuma foto clínica cadastrada ainda.</p>
            <p className="text-[11px] opacity-75">Faça o upload diretamente na ficha da paciente.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (p.type === "BEFORE") setBeforeId(p.id)
                  else setAfterId(p.id)
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-border/70 hover:border-primary/40"
              >
                <img src={p.accessUrl} alt={p.patientName} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-white">
                  <p className="truncate text-[10px] font-semibold">{p.patientName}</p>
                  <p className="text-[9px] opacity-80">{formatDate(p.capturedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
