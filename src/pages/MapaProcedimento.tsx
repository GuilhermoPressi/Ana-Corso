import { lazy, Suspense, useMemo, useState } from "react"
import { Box, History, MapPin, Plus, Rotate3d, Save, Square, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { FaceMap } from "@/components/clinical/FaceMap"
import { MODEL_URL, useModelAvailability } from "@/components/clinical/useModelAvailability"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/layout/PageHeader"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { depthOptions, faceRegions, techniqueOptions } from "@/data/faceRegions"
import { cn, formatCurrency, formatDateLong, initials } from "@/lib/utils"
import { useInventoryStore } from "@/stores/useInventoryStore"
import { usePatientStore } from "@/stores/usePatientStore"
import {
  countByRegion,
  mapsForPatient,
  totalQuantity,
  useProcedureMapStore,
  type MapPoint,
} from "@/stores/useProcedureMapStore"

const procedures = ["Toxina botulínica", "Preenchimento", "Bioestimulador"]

/* A cena 3D carrega só quando a aba é aberta — three.js não entra no bundle inicial. */
const FaceMap3D = lazy(() =>
  import("@/components/clinical/FaceMap3D").then((mod) => ({ default: mod.FaceMap3D })),
)

let pointSequence = 0
const pointId = () => `pt-${(pointSequence += 1)}`

export default function MapaProcedimento() {
  const { patients, loadPatients } = usePatientStore()
  const { products, loadProducts } = useInventoryStore()
  const { maps, fetchMaps, saveMap, removeMap } = useProcedureMapStore()

  const [patientId, setPatientId] = useState<string>("")
  const [procedure, setProcedure] = useState(procedures[0])
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [points, setPoints] = useState<MapPoint[]>([])
  const [view, setView] = useState<"2d" | "3d">("2d")
  /** Coordenada clicada na malha que ainda não virou ponto registrado. */
  const [pending3d, setPending3d] = useState<[number, number, number] | null>(null)

  useEffect(() => {
    if (!patients || patients.length === 0) {
      loadPatients()
    }
  }, [loadPatients, patients?.length])

  useEffect(() => {
    if (!products || products.length === 0) {
      loadProducts()
    }
  }, [loadProducts, products?.length])

  useEffect(() => {
    if (!patientId && patients && patients.length > 0) {
      setPatientId(patients[0].id)
    }
  }, [patients, patientId])

  useEffect(() => {
    if (patientId) {
      fetchMaps(patientId)
    }
  }, [patientId, fetchMaps])

  // A checagem só dispara quando a aba 3D é aberta.
  const modelAvailability = useModelAvailability(MODEL_URL, view === "3d")
  const modelMissing = modelAvailability === "missing"

  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [depth, setDepth] = useState(depthOptions[4])
  const [technique, setTechnique] = useState(techniqueOptions[0])
  const [note, setNote] = useState("")

  const safePatients = patients || []
  const safeProducts = products || []
  const safeMaps = maps || []

  const patient = safePatients.find((item) => item.id === patientId) ?? safePatients[0]
  const region = faceRegions.find((item) => item.id === selectedRegion)

  const productOptions = useMemo(
    () => safeProducts.filter((item) => item && item.category === procedure),
    [safeProducts, procedure],
  )
  const product = productOptions.find((item) => item.id === productId) ?? productOptions[0]

  const counts = useMemo(() => countByRegion(points), [points])

  const markers3d = useMemo(
    () =>
      points
        .filter((point) => point.position3d)
        .map((point) => ({
          id: point.id,
          position: point.position3d as [number, number, number],
          regionName: point.regionName,
        })),
    [points],
  )
  const history = useMemo(() => mapsForPatient(safeMaps, patientId), [safeMaps, patientId])

  function addPoint() {
    if (!region || quantity.trim().length === 0) return

    const unit = product?.contentUnit ?? "UI"
    setPoints((current) => [
      ...current,
      {
        id: pointId(),
        regionId: region.id,
        regionName: region.name,
        product: product ? `${product.name} · ${product.brand}` : "Sem produto vinculado",
        quantity: `${quantity.trim()} ${unit}`,
        depth,
        technique,
        note: note.trim() || undefined,
        position3d: pending3d ?? undefined,
      },
    ])

    setQuantity("")
    setNote("")
    setPending3d(null)
  }

  async function save() {
    if (!patient || points.length === 0) return

    await saveMap(patient.id, {
      procedure,
      mode: view === "3d" ? "THREE_D" : "TWO_D",
      points,
    })

    toast.success(`Mapa de ${patient.name.split(" ")[0]} registrado`, {
      description: `${points.length} pontos · ${totalQuantity(points)}. Fica disponível no próximo retorno.`,
    })

    setPoints([])
    setSelectedRegion(null)
    setPending3d(null)
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Mapa do Procedimento"
        description="Onde você aplicou, quanto e em que plano — documentado para consultar no retorno."
        actions={
          <Button
            size="sm"
            onClick={save}
            disabled={points.length === 0}
            className="rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]"
          >
            <Save /> Salvar mapa
          </Button>
        }
      />

      {/* Contexto */}
      <Card className="mb-5 gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]">
        <CardContent className="flex flex-wrap items-end gap-4 px-5 py-4">
          <div className="min-w-[220px] flex-1">
            <Label className="text-[12px] text-muted-foreground">Paciente</Label>
            <Select
              value={patientId}
              onValueChange={(value) => {
                setPatientId(value)
                setPoints([])
                setSelectedRegion(null)
              }}
            >
              <SelectTrigger className="mt-1.5 w-full bg-card text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {patients.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px]">
            <Label className="text-[12px] text-muted-foreground">Procedimento</Label>
            <Select
              value={procedure}
              onValueChange={(value) => {
                setProcedure(value)
                setProductId("")
              }}
            >
              <SelectTrigger className="mt-1.5 w-full bg-card text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {procedures.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {patient && (
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3.5 py-2.5">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                  {initials(patient.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[12px] font-semibold">{patient.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {patient.skinType} · ticket {formatCurrency(patient.ticket)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,1fr)]">
        {/* Mapa */}
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base">Marque a região</CardTitle>
              <CardDescription className="mt-1">
                {view === "2d"
                  ? "Vista frontal, como na foto clínica: o lado esquerdo da imagem é o lado direito da paciente."
                  : "Gire com o mouse e clique direto na malha para marcar o ponto de aplicação."}
              </CardDescription>
            </div>

            <Tabs value={view} onValueChange={(value) => setView(value as "2d" | "3d")}>
              <TabsList className="h-auto gap-1 rounded-full bg-muted/60 p-1">
                <TabsTrigger value="2d" className="rounded-full px-3 text-[12px] data-[state=active]:shadow-xs">
                  <Square className="size-3.5" /> 2D
                </TabsTrigger>
                <TabsTrigger value="3d" className="rounded-full px-3 text-[12px] data-[state=active]:shadow-xs">
                  <Box className="size-3.5" /> 3D
                  <Badge variant="secondary" className="ml-1 h-4 rounded-full px-1.5 text-[9px]">
                    beta
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent>
            {view === "2d" ? (
              <div className="mx-auto aspect-[200/260] w-full max-w-[380px]">
                <FaceMap
                  selectedId={selectedRegion}
                  onSelect={setSelectedRegion}
                  countByRegion={counts}
                  highlightGroup={procedure}
                />
              </div>
            ) : (
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-2xl bg-[radial-gradient(70%_70%_at_50%_35%,hsl(336_45%_96%),hsl(340_30%_92%))]">
                <Suspense
                  fallback={
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="flex flex-col items-center gap-3">
                        <Skeleton className="size-28 rounded-full" />
                        <p className="text-[12px] text-muted-foreground">Carregando a cena 3D...</p>
                      </div>
                    </div>
                  }
                >
                  <FaceMap3D
                    markers={markers3d}
                    pending={pending3d}
                    selectedRegionId={selectedRegion}
                    onPick={({ regionId, position }) => {
                      setSelectedRegion(regionId)
                      setPending3d(position)
                    }}
                    availability={modelAvailability}
                  />
                </Suspense>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/25 to-transparent px-3 pb-2.5 pt-8">
                  <Rotate3d className="size-3.5 text-white/90" />
                  <span className="text-[11px] font-medium text-white/90">
                    Arraste para girar · scroll para aproximar
                  </span>
                </div>
              </div>
            )}

            {view === "3d" &&
              (modelMissing ? (
                <p className="mt-3 rounded-xl border border-warning/25 bg-warning/[0.07] px-3.5 py-2.5 text-[11px] leading-relaxed text-warning-foreground">
                  <span className="font-semibold">Modelo 3D não encontrado.</span> Coloque o arquivo{" "}
                  <code className="rounded bg-warning/15 px-1 py-0.5">face.glb</code> na pasta{" "}
                  <code className="rounded bg-warning/15 px-1 py-0.5">public/</code> — a cena recarrega
                  sozinha. Enquanto isso, o volume de referência abaixo mantém a marcação funcionando.
                </p>
              ) : (
                <p className="mt-3 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  A região é inferida pela âncora mais próxima do ponto clicado — confira no seletor ao lado
                  antes de registrar.
                </p>
              ))}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/60 pt-3.5 text-[11px] text-muted-foreground">
              {view === "2d" ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border border-dashed border-border" /> disponível
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border border-primary bg-primary/25" /> selecionada
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-primary" /> com pontos registrados
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#8b5cf6]" /> ponto clicado, aguardando registro
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-primary" /> ponto já registrado
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registro do ponto */}
        <div className="flex flex-col gap-5">
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <MapPin className="size-4 text-primary" />
                {region ? region.name : "Nenhuma região selecionada"}
              </CardTitle>
              <CardDescription className="mt-1">
                {region
                  ? view === "3d"
                    ? "Região inferida pelo ponto clicado — corrija ao lado se não for essa."
                    : "Registre o que foi aplicado neste ponto."
                  : "Clique em uma região do mapa para começar."}
              </CardDescription>

              {region && (
                <div className="mt-3">
                  <Label className="text-[12px] text-muted-foreground">Região</Label>
                  <Select value={region.id} onValueChange={setSelectedRegion}>
                    <SelectTrigger size="sm" className="mt-1.5 w-full bg-card text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {faceRegions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>

            {region && (
              <CardContent className="grid gap-4">
                <div>
                  <Label className="text-[13px]">Produto</Label>
                  <Select value={product?.id ?? ""} onValueChange={setProductId}>
                    <SelectTrigger className="mt-1.5 w-full bg-card text-[13px]">
                      <SelectValue placeholder="Sem produto para esta categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} · lote {item.lot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="mp-qty" className="text-[13px]">
                      Quantidade
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="mp-qty"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        placeholder={product?.contentUnit === "UI" ? "12" : "0,5"}
                        className="bg-card pr-12 tabular-nums"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-muted-foreground">
                        {product?.contentUnit ?? "UI"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[13px]">Profundidade</Label>
                    <Select value={depth} onValueChange={setDepth}>
                      <SelectTrigger className="mt-1.5 w-full bg-card text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {depthOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-[13px]">Técnica</Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {techniqueOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTechnique(item)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                          technique === item
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="mp-note" className="text-[13px]">
                    Observação <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea
                    id="mp-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Número de pontos, referência anatômica, cuidado especial..."
                    className="mt-1.5 min-h-[68px] resize-y bg-card text-[13px]"
                  />
                </div>

                <Button onClick={addPoint} disabled={quantity.trim().length === 0} className="rounded-full">
                  <Plus /> Adicionar ponto
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Pontos do mapa atual */}
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="font-display text-base">Pontos deste atendimento</CardTitle>
                <CardDescription className="mt-1">
                  {points.length === 0
                    ? "Nada registrado ainda"
                    : `${points.length} ${points.length === 1 ? "ponto" : "pontos"} · ${totalQuantity(points)}`}
                </CardDescription>
              </div>
              {points.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setPoints([])} className="text-muted-foreground">
                  Limpar
                </Button>
              )}
            </CardHeader>

            <CardContent className="flex flex-col gap-2">
              {points.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
                  Os pontos aparecem aqui e viram números no mapa.
                </p>
              ) : (
                points.map((point) => (
                  <div
                    key={point.id}
                    className="flex items-start gap-3 rounded-xl border border-border/60 px-3.5 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold">{point.regionName}</p>
                        <Badge variant="secondary" className="rounded-full text-[10px] tabular-nums">
                          {point.quantity}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {point.product} · {point.depth} · {point.technique}
                      </p>
                      {point.note && (
                        <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">{point.note}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPoints((current) => current.filter((item) => item.id !== point.id))}
                      aria-label={`Remover ponto em ${point.regionName}`}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico */}
      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold">
            Mapas anteriores {patient ? `de ${patient.name.split(" ")[0]}` : ""}
          </h2>
          <Badge variant="secondary" className="rounded-full text-[10px] tabular-nums">
            {history.length}
          </Badge>
        </div>

        {history.length === 0 ? (
          <Card className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardContent className="flex flex-col items-center px-6 py-12 text-center">
              <div className="grid size-11 place-items-center rounded-2xl bg-accent">
                <History className="size-5 text-primary" />
              </div>
              <p className="mt-3.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Nenhum mapa registrado para esta paciente. O primeiro vira referência para comparar no
                próximo retorno.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {history.map((map) => (
              <Card key={map.id} className="border-border/70 shadow-[var(--shadow-soft)]">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="font-display text-[15px]">{map.procedure}</CardTitle>
                    <CardDescription className="mt-1">
                      {formatDateLong(map.date)} · {map.points.length} pontos · {totalQuantity(map.points)}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover mapa"
                    onClick={() => removeMap(map.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </CardHeader>

                <CardContent className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
                  <div className="aspect-[200/260] w-full">
                    <FaceMap
                      selectedId={null}
                      onSelect={() => {}}
                      countByRegion={countByRegion(map.points)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {map.points.map((point) => (
                      <div key={point.id} className="flex items-baseline justify-between gap-2 text-[12px]">
                        <span className="min-w-0 truncate text-muted-foreground">{point.regionName}</span>
                        <span className="shrink-0 font-medium tabular-nums">{point.quantity}</span>
                      </div>
                    ))}
                    <Separator className="my-1" />
                    <p className="text-[11px] text-muted-foreground">{map.points[0]?.product}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
