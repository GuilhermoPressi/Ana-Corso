import { useRef } from "react"
import { Copy, MessageCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export type InviteLink = { email: string; url: string }

/** Mostra o link do convite para copiar ou mandar pelo WhatsApp (o link só existe neste momento). */
export function InviteLinkDialog({ invite, onClose }: { invite: InviteLink | null; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function copy() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.url)
      toast.success("Link copiado.")
    } catch {
      // Sem permissão de área de transferência: deixa o texto selecionado para Cmd/Ctrl+C.
      inputRef.current?.select()
      toast.info("Selecionei o link: use Cmd+C (ou Ctrl+C) para copiar.")
    }
  }

  const message = invite
    ? `Olá! Segue o seu acesso ao sistema da Dra. Ana Corso. Abra o link e crie sua senha: ${invite.url}`
    : ""

  return (
    <Dialog open={Boolean(invite)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link do convite</DialogTitle>
          <DialogDescription>
            Envie para {invite?.email}. O link vale por 7 dias; por segurança ele não fica salvo, então copie agora (se
            perder, use "Gerar novo link" no convite).
          </DialogDescription>
        </DialogHeader>
        <Input
          ref={inputRef}
          readOnly
          value={invite?.url ?? ""}
          onFocus={(e) => e.target.select()}
          className="font-mono text-[12px]"
        />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" asChild>
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> Enviar no WhatsApp
            </a>
          </Button>
          <Button onClick={copy}>
            <Copy /> Copiar link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
