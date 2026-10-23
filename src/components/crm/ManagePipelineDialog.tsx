import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TagColor } from "@/lib/crm-api"
import { TAG_COLORS, tagColorStyle } from "@/lib/tag-colors"
import { cn } from "@/lib/utils"
import { STAGE_TYPE_LABEL, usePipelineStore, type Pipeline, type PipelineStage, type StageType } from "@/stores/usePipelineStore"

function ColorDot({ value, onChange }: { value: TagColor; onChange: (color: TagColor) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Escolher cor"
          className={cn("size-6 shrink-0 rounded-full border-2 border-background shadow", tagColorStyle(value).dot)}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-4 gap-1.5">
          {TAG_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              title={color.label}
              aria-label={`Cor ${color.label}`}
              onClick={() => onChange(color.id)}
              className={cn(
                "size-6 rounded-full ring-offset-2 ring-offset-popover",
                color.dot,
                value === color.id && "ring-2 ring-foreground/60",
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StageRow({
  stage,
  stages,
  index,
  onMove,
}: {
  stage: PipelineStage
  stages: PipelineStage[]
  index: number
  onMove: (from: number, to: number) => void
}) {
  const updateStage = usePipelineStore((s) => s.updateStage)
  const deleteStage = usePipelineStore((s) => s.deleteStage)
  const [name, setName] = useState(stage.name)
  const [moveTo, setMoveTo] = useState<string>("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => setName(stage.name), [stage.name])

  async function save(patch: Partial<{ name: string; color: TagColor; type: StageType }>) {
    try {
      await updateStage(stage.id, patch)
    } catch (err) {
      setName(stage.name)
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a etapa.")
    }
  }

  async function remove() {
    if (stage.leadCount > 0 && !moveTo) {
      setConfirmDelete(true)
      return
    }
    if (stage.leadCount === 0 && !window.confirm(`Excluir a etapa "${stage.name}"?`)) return
    try {
      await deleteStage(stage.id, moveTo || undefined)
      toast.success("Etapa excluída.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a etapa.")
    }
  }

  const others = stages.filter((s) => s.id !== stage.id)

  return (
    <div className="rounded-xl border p-2.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Mover para a esquerda"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            className="text-muted-foreground hover:text-foreground disabled:opacity-25"
          >
            <ArrowUp className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Mover para a direita"
            disabled={index === stages.length - 1}
            onClick={() => onMove(index, index + 1)}
            className="text-muted-foreground hover:text-foreground disabled:opacity-25"
          >
            <ArrowDown className="size-3.5" />
          </button>
        </div>
        <ColorDot value={stage.color} onChange={(color) => save({ color })} />
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            const next = name.trim()
            if (next && next !== stage.name) save({ name: next })
            else setName(stage.name)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") (event.target as HTMLInputElement).blur()
          }}
          className="h-8 text-[13px]"
          maxLength={60}
          aria-label="Nome da etapa"
        />
        <Select value={stage.type} onValueChange={(value) => save({ type: value as StageType })}>
          <SelectTrigger className="h-8 w-[140px] shrink-0 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STAGE_TYPE_LABEL) as StageType[]).map((type) => (
              <SelectItem key={type} value={type} className="text-[12px]">
                {STAGE_TYPE_LABEL[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
          {stage.leadCount} lead{stage.leadCount === 1 ? "" : "s"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={remove}
          disabled={stages.length <= 1}
          aria-label="Excluir etapa"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {confirmDelete && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-2 text-[12px]">
          <span>Mover os {stage.leadCount} lead(s) para:</span>
          <Select value={moveTo} onValueChange={setMoveTo}>
            <SelectTrigger className="h-8 w-[180px] text-[12px]">
              <SelectValue placeholder="Escolha a etapa" />
            </SelectTrigger>
            <SelectContent>
              {others.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-[12px]">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="destructive" className="h-8" disabled={!moveTo} onClick={remove}>
            Mover e excluir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => {
              setConfirmDelete(false)
              setMoveTo("")
            }}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}

/** Renomear/excluir o pipeline e criar, editar, reordenar e excluir etapas. */
export function ManagePipelineDialog({
  pipeline,
  open,
  onOpenChange,
  onDeleted,
}: {
  pipeline: Pipeline | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const renamePipeline = usePipelineStore((s) => s.renamePipeline)
  const deletePipeline = usePipelineStore((s) => s.deletePipeline)
  const createStage = usePipelineStore((s) => s.createStage)
  const reorderStages = usePipelineStore((s) => s.reorderStages)
  const [name, setName] = useState("")
  const [newStage, setNewStage] = useState({ name: "", color: "azul" as TagColor, type: "OPEN" as StageType })

  useEffect(() => {
    if (pipeline) setName(pipeline.name)
  }, [pipeline])

  if (!pipeline) return null
  const stages = [...pipeline.stages].sort((a, b) => a.position - b.position)

  async function saveName() {
    if (!pipeline) return
    const next = name.trim()
    if (!next || next === pipeline.name) {
      setName(pipeline.name)
      return
    }
    try {
      await renamePipeline(pipeline.id, next)
    } catch (err) {
      setName(pipeline.name)
      toast.error(err instanceof Error ? err.message : "Não foi possível renomear.")
    }
  }

  async function move(from: number, to: number) {
    if (!pipeline) return
    const ids = stages.map((s) => s.id)
    const [item] = ids.splice(from, 1)
    ids.splice(to, 0, item)
    try {
      await reorderStages(pipeline.id, ids)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reordenar.")
    }
  }

  async function addStage(event: React.FormEvent) {
    event.preventDefault()
    if (!pipeline || !newStage.name.trim()) return
    try {
      await createStage(pipeline.id, { ...newStage, name: newStage.name.trim() })
      setNewStage({ name: "", color: "azul", type: "OPEN" })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a etapa.")
    }
  }

  async function removePipeline() {
    if (!pipeline) return
    const total = stages.reduce((sum, s) => sum + s.leadCount, 0)
    const extra = total ? ` Os ${total} lead(s) dele vão para o pipeline Comercial.` : ""
    if (!window.confirm(`Excluir o pipeline "${pipeline.name}"?${extra}`)) return
    try {
      await deletePipeline(pipeline.id)
      toast.success("Pipeline excluído.")
      onDeleted()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o pipeline.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Configurar pipeline</DialogTitle>
          <DialogDescription>
            As etapas viram as colunas do quadro. O tipo define o que conta como ganho e perdido nos indicadores.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="pipeline-name" className="text-[13px]">
            Nome do pipeline
          </Label>
          <Input
            id="pipeline-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveName}
            onKeyDown={(event) => {
              if (event.key === "Enter") (event.target as HTMLInputElement).blur()
            }}
            className="mt-1.5"
            maxLength={60}
          />
        </div>

        <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
          <p className="text-[13px] font-medium">Etapas (da esquerda para a direita)</p>
          {stages.map((stage, index) => (
            <StageRow key={stage.id} stage={stage} stages={stages} index={index} onMove={move} />
          ))}
        </div>

        <form onSubmit={addStage} className="flex flex-wrap items-center gap-2 border-t pt-4">
          <ColorDot value={newStage.color} onChange={(color) => setNewStage((s) => ({ ...s, color }))} />
          <Input
            value={newStage.name}
            onChange={(event) => setNewStage((s) => ({ ...s, name: event.target.value }))}
            placeholder="Nova etapa (ex.: Avaliação realizada)"
            className="h-9 min-w-[200px] flex-1"
            maxLength={60}
          />
          <Select value={newStage.type} onValueChange={(value) => setNewStage((s) => ({ ...s, type: value as StageType }))}>
            <SelectTrigger className="h-9 w-[140px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STAGE_TYPE_LABEL) as StageType[]).map((type) => (
                <SelectItem key={type} value={type} className="text-[12px]">
                  {STAGE_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={!newStage.name.trim()}>
            <Plus /> Adicionar etapa
          </Button>
        </form>

        {!pipeline.isDefault && (
          <div className="flex justify-end border-t pt-3">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={removePipeline}>
              <Trash2 /> Excluir pipeline
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
