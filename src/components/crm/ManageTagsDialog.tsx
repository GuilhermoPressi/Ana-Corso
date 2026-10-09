import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { TagChip } from "@/components/crm/TagChip"
import { TAG_COLORS, tagColorStyle } from "@/lib/tag-colors"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { CrmTag, TagColor } from "@/lib/crm-api"
import { cn } from "@/lib/utils"
import { useTagStore } from "@/stores/useTagStore"

function ColorPicker({ value, onChange }: { value: TagColor; onChange: (color: TagColor) => void }) {
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

function TagRow({
  tag,
  onRenamed,
  onDeleted,
}: {
  tag: CrmTag
  onRenamed?: (from: string, to: string) => void
  onDeleted?: (name: string) => void
}) {
  const update = useTagStore((s) => s.update)
  const remove = useTagStore((s) => s.remove)
  const [name, setName] = useState(tag.name)

  useEffect(() => setName(tag.name), [tag.name])

  async function saveName() {
    const next = name.trim().toLowerCase()
    if (!next || next === tag.name) {
      setName(tag.name)
      return
    }
    try {
      await update(tag.id, { name: next })
      onRenamed?.(tag.name, next)
    } catch (err) {
      setName(tag.name)
      toast.error(err instanceof Error ? err.message : "Não foi possível renomear.")
    }
  }

  async function changeColor(color: TagColor) {
    try {
      await update(tag.id, { color })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mudar a cor.")
    }
  }

  async function handleDelete() {
    const usage = tag.count ? ` Ela será removida de ${tag.count} contato(s).` : ""
    if (!window.confirm(`Excluir a etiqueta "${tag.name}"?${usage}`)) return
    try {
      await remove(tag.id)
      onDeleted?.(tag.name)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir.")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <ColorPicker value={tag.color} onChange={changeColor} />
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={saveName}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur()
        }}
        className="h-8 text-[13px]"
        maxLength={40}
        aria-label="Nome da etiqueta"
      />
      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {tag.count ?? 0} contato{tag.count === 1 ? "" : "s"}
      </span>
      <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={handleDelete} aria-label="Excluir etiqueta">
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

/** Cadastro de etiquetas: criar, renomear, mudar cor e excluir. */
export function ManageTagsDialog({
  open,
  onOpenChange,
  onRenamed,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRenamed?: (from: string, to: string) => void
  onDeleted?: (name: string) => void
}) {
  const tags = useTagStore((s) => s.tags)
  const load = useTagStore((s) => s.load)
  const create = useTagStore((s) => s.create)
  const [name, setName] = useState("")
  const [color, setColor] = useState<TagColor>("rosa")

  // Recarrega ao abrir para mostrar as contagens atualizadas.
  useEffect(() => {
    if (open) load().catch(() => {})
  }, [open, load])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const value = name.trim().toLowerCase()
    if (!value) return
    try {
      await create(value, color)
      setName("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a etiqueta.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Etiquetas</DialogTitle>
          <DialogDescription>
            Organize os contatos por interesse, etapa ou prioridade. Renomear ou excluir aqui vale para todos os contatos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <ColorPicker value={color} onChange={setColor} />
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nova etiqueta (ex.: botox, vip, retorno)"
            className="h-9"
            maxLength={40}
          />
          <Button type="submit" size="sm" disabled={!name.trim()}>
            <Plus /> Criar
          </Button>
        </form>
        {name.trim() && (
          <p className="-mt-2 text-[11px] text-muted-foreground">
            Prévia: <TagChip name={name.trim().toLowerCase()} color={color} size="xs" />
          </p>
        )}

        <div className="max-h-80 space-y-2 overflow-y-auto border-t pt-3">
          {tags.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma etiqueta criada ainda.</p>
          ) : (
            tags.map((tag) => <TagRow key={tag.id} tag={tag} onRenamed={onRenamed} onDeleted={onDeleted} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
