import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, Plus, Settings2, Tag, X } from "lucide-react"
import { toast } from "sonner"

import { ManageTagsDialog } from "@/components/crm/ManageTagsDialog"
import { TagChip } from "@/components/crm/TagChip"
import { TAG_COLORS } from "@/lib/tag-colors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { crmApi, type TagColor } from "@/lib/crm-api"
import { cn } from "@/lib/utils"
import { useTagStore } from "@/stores/useTagStore"

/**
 * Etiquetas do contato: mostra as tags coloridas e abre um seletor para
 * marcar/desmarcar tags existentes, buscar e criar uma nova (com cor).
 * Usado no cabeçalho da conversa e na ficha do contato.
 */
export function ContactTagsEditor({
  contactId,
  tags,
  onSaved,
  size = "xs",
}: {
  contactId: string
  tags: string[]
  onSaved: (tags: string[]) => void
  size?: "xs" | "sm"
}) {
  const allTags = useTagStore((s) => s.tags)
  const loaded = useTagStore((s) => s.loaded)
  const loadTags = useTagStore((s) => s.load)
  const createTag = useTagStore((s) => s.create)
  const [open, setOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [newColor, setNewColor] = useState<TagColor>("rosa")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loaded) loadTags().catch(() => {})
  }, [loaded, loadTags])

  const colorOf = useMemo(() => new Map(allTags.map((t) => [t.name, t.color])), [allTags])
  const term = query.trim().toLowerCase()
  const filtered = allTags.filter((t) => t.name.includes(term))
  const canCreate = term.length > 0 && !allTags.some((t) => t.name === term)

  async function save(next: string[]) {
    setSaving(true)
    try {
      const { contact } = await crmApi.updateContact(contactId, { tags: next })
      onSaved(contact.tags)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar as etiquetas.")
    } finally {
      setSaving(false)
    }
  }

  function toggle(name: string) {
    save(tags.includes(name) ? tags.filter((t) => t !== name) : [...tags, name])
  }

  async function createAndAdd() {
    if (!canCreate) return
    try {
      const tag = await createTag(term, newColor)
      setQuery("")
      await save([...tags, tag.name])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar a etiqueta.")
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((name) => (
        <TagChip key={name} name={name} color={colorOf.get(name)} size={size}>
          <button
            type="button"
            className="opacity-50 hover:opacity-100"
            onClick={() => save(tags.filter((t) => t !== name))}
            disabled={saving}
            aria-label={`Remover etiqueta ${name}`}
          >
            <X className="size-2.5" />
          </button>
        </TagChip>
      ))}

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery("")
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 rounded-full px-2 text-[10px] text-muted-foreground">
            {tags.length === 0 ? <Tag className="size-3" /> : <Plus className="size-3" />}
            {tags.length === 0 && "Etiqueta"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="border-b p-2">
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  if (canCreate) createAndAdd()
                  else if (filtered.length === 1) toggle(filtered[0].name)
                }
              }}
              placeholder="Buscar ou criar etiqueta"
              className="h-8 text-[12px]"
              maxLength={40}
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.map((tag) => {
              const active = tags.includes(tag.name)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.name)}
                  disabled={saving}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-muted"
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded border",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {active && <Check className="size-3" />}
                  </span>
                  <TagChip name={tag.name} color={tag.color} size="xs" />
                </button>
              )
            })}
            {filtered.length === 0 && !canCreate && (
              <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">Nenhuma etiqueta criada ainda.</p>
            )}
          </div>

          {canCreate && (
            <div className="space-y-2 border-t p-2">
              <div className="flex flex-wrap gap-1.5">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    title={color.label}
                    aria-label={`Cor ${color.label}`}
                    onClick={() => setNewColor(color.id)}
                    className={cn(
                      "size-5 rounded-full ring-offset-2 ring-offset-popover",
                      color.dot,
                      newColor === color.id && "ring-2 ring-foreground/60",
                    )}
                  />
                ))}
              </div>
              <Button size="sm" className="h-8 w-full justify-start text-[12px]" onClick={createAndAdd} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Plus />} Criar
                <TagChip name={term} color={newColor} size="xs" className="ml-1" />
              </Button>
            </div>
          )}

          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setManageOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-muted"
            >
              <Settings2 className="size-3.5" /> Gerenciar etiquetas
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ManageTagsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        onRenamed={(from, to) => onSaved(tags.map((t) => (t === from ? to : t)))}
        onDeleted={(name) => onSaved(tags.filter((t) => t !== name))}
      />
    </div>
  )
}
