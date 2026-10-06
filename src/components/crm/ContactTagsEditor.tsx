import { useState } from "react"
import { Plus, Tag, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { crmApi } from "@/lib/crm-api"

/** Etiquetas do contato com edição rápida (usado no cabeçalho da conversa). */
export function ContactTagsEditor({
  contactId,
  tags,
  onSaved,
}: {
  contactId: string
  tags: string[]
  onSaved: (tags: string[]) => void
}) {
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

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

  function add() {
    const tag = draft.trim().toLowerCase()
    if (!tag) return
    setDraft("")
    if (!tags.includes(tag)) save([...tags, tag])
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {tag}
          <button
            type="button"
            className="opacity-50 hover:opacity-100"
            onClick={() => save(tags.filter((t) => t !== tag))}
            disabled={saving}
            aria-label={`Remover etiqueta ${tag}`}
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 rounded-full px-2 text-[10px] text-muted-foreground">
            {tags.length === 0 ? <Tag className="size-3" /> : <Plus className="size-3" />}
            {tags.length === 0 && "Etiqueta"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2" align="start">
          <form
            className="flex gap-1.5"
            onSubmit={(event) => {
              event.preventDefault()
              add()
            }}
          >
            <Input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nova etiqueta"
              className="h-8 text-[12px]"
              maxLength={40}
            />
            <Button type="submit" size="sm" className="h-8" disabled={saving || !draft.trim()}>
              Adicionar
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  )
}
