import { useState, type ReactNode } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { crmApi, type QuickReply } from "@/lib/crm-api"

/** Lista e cadastro de respostas rápidas (atalhos acionados com "/" no composer). */
export function QuickRepliesDialog({
  quickReplies,
  onChanged,
  onPick,
  trigger,
}: {
  quickReplies: QuickReply[]
  onChanged: () => void
  onPick?: (reply: QuickReply) => void
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [shortcut, setShortcut] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (!shortcut.trim() || !content.trim()) return
    setSaving(true)
    try {
      await crmApi.createQuickReply({ shortcut, content })
      setShortcut("")
      setContent("")
      onChanged()
      toast.success("Resposta rápida salva.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function remove(reply: QuickReply) {
    if (!window.confirm(`Excluir a resposta /${reply.shortcut}?`)) return
    try {
      await crmApi.deleteQuickReply(reply.id)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Respostas rápidas</DialogTitle>
          <DialogDescription>
            Digite <strong>/atalho</strong> na conversa para inserir o texto. Use {"{nome}"} para o primeiro nome do
            contato e {"{atendente}"} para o seu.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {quickReplies.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma resposta cadastrada ainda.</p>
          ) : (
            quickReplies.map((reply) => (
              <div key={reply.id} className="group flex items-start gap-2 rounded-lg border p-2.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (!onPick) return
                    onPick(reply)
                    setOpen(false)
                  }}
                >
                  <p className="text-[12px] font-semibold text-primary">/{reply.shortcut}</p>
                  <p className="line-clamp-2 text-[12px] text-muted-foreground">{reply.content}</p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => remove(reply)}
                  aria-label="Excluir"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={create} className="space-y-3 border-t pt-4">
          <div>
            <Label htmlFor="qr-shortcut" className="text-[13px]">
              Atalho
            </Label>
            <Input
              id="qr-shortcut"
              value={shortcut}
              onChange={(event) => setShortcut(event.target.value)}
              placeholder="boas-vindas"
              className="mt-1.5"
              maxLength={40}
            />
          </div>
          <div>
            <Label htmlFor="qr-content" className="text-[13px]">
              Mensagem
            </Label>
            <Textarea
              id="qr-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Olá {nome}! Aqui é a {atendente}, da clínica. Como posso ajudar?"
              className="mt-1.5"
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !shortcut.trim() || !content.trim()}>
              Salvar resposta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
