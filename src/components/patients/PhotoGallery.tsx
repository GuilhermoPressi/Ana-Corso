import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeftRight, Camera, ImagePlus, Lock, Ruler } from "lucide-react"
import { toast } from "sonner"

import { FaceGhost } from "@/components/clinical/FaceGhost"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  photoAngleGroups,
  photoAngleLabel,
  type Patient,
  type PhotoRecord,
} from "@/data/patients"
import { CLINIC_TODAY } from "@/lib/clinic"
import { cn, formatDate, formatDateLong, parseLocalDate } from "@/lib/utils"

function daysBetween(a: string, b: string) {
  return Math.round(
    Math.abs(parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86_400_000,
  )
}

export type DbPhoto = {
  id: string
  patientId: string
  storageKey: string
  originalFileName: string
  mimeType: string
  fileSize: number
  type: "BEFORE" | "AFTER" | "EVOLUTION" | "CLINICAL" | "INCIDENT" | "OTHER"
  bodyRegion?: string | null
  notes?: string | null
  capturedAt: string
  accessUrl: string
}

export function PhotoGallery({ patient }: { patient: Patient }) {
  const [groupId, setGroupId] = useState(photoAngleGroups[0].id)
  const [beforeId, setBeforeId] = useState<string | null>(null)
  const [afterId, setAfterId] = useState<string | null>(null)

  const [realPhotos, setRealPhotos] = useState<DbPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const group = photoAngleGroups.find((item) => item.id === groupId) ?? photoAngleGroups[0]

  useEffect(() => {
    async function loadPhotos() {
      try {
        const res = await fetch(`/api/patients/${patient.id}/photos`)
        if (res.ok) {
          const data = await res.json()
          setRealPhotos(data.photos || [])
        }
      } catch {
        // ignore
      }
    }
    loadPhotos()
  }, [patient.id])

  // Merge db photos with patient.photos for rendering
  const mappedDbPhotos: PhotoRecord[] = useMemo(() => {
    return realPhotos.map((p) => {
      const isBefore = p.type === "BEFORE"
      const isAfter = p.type === "AFTER"
      return {
        id: p.id,
        date: p.capturedAt ? new Date(p.capturedAt).toISOString().split("T")[0] : CLINIC_TODAY,
        angle: "frente",
        session: isBefore ? "Foto de Antes" : isAfter ? "Foto de Depois" : p.notes || "Foto clínica",
        src: p.accessUrl,
      }
    })
  }, [realPhotos])

  const allPhotos = useMemo(() => {
    return [...mappedDbPhotos, ...patient.photos]
  }, [mappedDbPhotos, patient.photos])

  const photos = useMemo(
    () =>
      allPhotos
        .filter((photo) => group.angles.includes(photo.angle))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [allPhotos, group],
  )

  const before = photos.find((photo) => photo.id === beforeId) ?? photos.at(0) ?? null
  const after =
    photos.find((photo) => photo.id === afterId) ??
    (photos.length > 1 ? photos.at(-1) ?? null : null)

  const interval = before && after ? daysBetween(before.date, after.date) : null

  function assign(photo: PhotoRecord) {
    if (!before || photo.date < before.date) {
      setBeforeId(photo.id)
      return
    }
    setAfterId(photo.id)
  }

  function swap() {
    const currentBefore = before?.id ?? null
    setBeforeId(after?.id ?? null)
    setAfterId(currentBefore)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato não suportado. Use JPG, PNG ou WEBP.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Tamanho máximo excedido. O limite por foto é 10 MB.")
      return
    }

    setUploading(true)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64Data = reader.result as string
      try {
        const res = await fetch(`/api/patients/${patient.id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalFileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            base64Data,
            type: groupId === "34" ? "BEFORE" : "CLINICAL",
            notes: `Registro em ${group.label}`,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setRealPhotos((prev) => [data.photo, ...prev])
          toast.success("Foto salva com sucesso no storage privado.")
        } else {
          toast.error("Erro ao enviar foto.")
        }
      } catch {
        toast.error("Erro de conexão ao salvar foto.")
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsDataURL(file)
  }

  const countsByGroup = photoAngleGroups.map((item) => ({
    ...item,
    count: allPhotos.filter((photo) => item.angles.includes(photo.angle)).length,
  }))

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Enquadramentos */}
      <div className="flex flex-wrap items-center gap-2">
        {countsByGroup.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setGroupId(item.id)
              setBeforeId(null)
              setAfterId(null)
            }}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-medium transition-colors",
              groupId === item.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
            )}
          >
            {item.label}
            <Badge
              variant="secondary"
              className={cn("h-4 rounded-full px-1.5 text-[10px] tabular-nums", item.count === 0 && "opacity-50")}
            >
              {item.count}
            </Badge>
          </button>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus /> {uploading ? "Enviando..." : "Adicionar foto"}
        </Button>
      </div>

      {/* Comparador */}
      <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3 px-5 pb-4 pt-5">
          <div>
            <CardTitle className="font-display text-base">Comparativo · {group.label}</CardTitle>
            <CardDescription className="mt-1">
              {interval !== null
                ? `${interval} dias entre os dois registros`
                : "Escolha dois registros para comparar a evolução"}
            </CardDescription>
          </div>

          {before && after && (
            <Button variant="outline" size="sm" onClick={swap}>
              <ArrowLeftRight /> Inverter
            </Button>
          )}
        </CardHeader>

        <div className="grid grid-cols-2 gap-px bg-border">
          <ComparisonSlot label="Antes" photo={before} />
          <ComparisonSlot label="Depois" photo={after} />
        </div>

        {before && after && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/25 px-5 py-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Ruler className="size-3.5" />
              {formatDateLong(before.date)} → {formatDateLong(after.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="size-3" /> Armazenamento seguro privado (S3)
            </span>
          </div>
        )}
      </Card>

      {/* Registros do ângulo */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Camera className="size-4 text-muted-foreground" />
          <h3 className="text-[13px] font-semibold">Registros em {group.label.toLowerCase()}</h3>
          <Badge variant="secondary" className="rounded-full text-[10px] tabular-nums">
            {photos.length}
          </Badge>
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <div className="grid size-11 place-items-center rounded-2xl bg-accent">
              <Camera className="size-5 text-primary" />
            </div>
            <p className="mt-3.5 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Nenhuma foto neste enquadramento. Registrar sempre o mesmo ângulo é o que torna a comparação
              honesta.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {photos.map((photo) => {
              const role =
                photo.id === before?.id ? "antes" : photo.id === after?.id ? "depois" : null

              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => assign(photo)}
                  className={cn(
                    "group overflow-hidden rounded-xl border text-left transition-all",
                    role
                      ? "border-primary/40 ring-1 ring-primary/20"
                      : "border-border/70 hover:border-primary/25",
                  )}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-secondary via-accent/50 to-muted">
                    {photo.src ? (
                      <img src={photo.src} alt={photo.session} className="h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center p-4 text-primary/25">
                        <FaceGhost angle={photo.angle} />
                      </div>
                    )}
                    {role && (
                      <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold capitalize text-primary-foreground">
                        {role}
                      </span>
                    )}
                  </div>

                  <div className="px-2.5 py-2">
                    <p className="truncate text-[11px] font-semibold tabular-nums">
                      {formatDate(photo.date)}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{photo.session}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Clique em um registro para colocá-lo no comparativo — datas mais antigas vão para "Antes".
        </p>
      </div>
    </div>
  )
}

function ComparisonSlot({ label, photo }: { label: string; photo: PhotoRecord | null }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-secondary via-accent/40 to-muted sm:aspect-[3/4]">
      {photo ? (
        <>
          {photo.src ? (
            <img src={photo.src} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-10 text-primary/25">
              <FaceGhost angle={photo.angle} />
            </div>
          )}

          <span className="absolute left-3 top-3 rounded-full bg-card/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground backdrop-blur-sm">
            {label}
          </span>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3.5 pb-3 pt-10">
            <p className="text-[12px] font-semibold text-white tabular-nums">
              {formatDate(photo.date)}
            </p>
            <p className="mt-0.5 text-[10px] text-white/85">
              {photo.session} · {photoAngleLabel[photo.angle]}
            </p>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div>
            <Camera className="mx-auto size-6 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Selecione um registro abaixo
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
