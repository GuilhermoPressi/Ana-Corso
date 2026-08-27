import type { ReactNode } from "react"
import { MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildWhatsAppLink } from "@/lib/whatsapp"
import { cn } from "@/lib/utils"

export type WhatsAppButtonProps = {
  phone: string
  /**
   * Texto que já vai preenchido na conversa. É invisível para a profissional:
   * ela clica e o WhatsApp abre com o rascunho pronto para revisar e enviar.
   */
  message?: string
  label?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
  icon?: ReactNode
}

/** Um clique, uma aba: abre a conversa da paciente no WhatsApp. Nada é enviado. */
export function WhatsAppButton({
  phone,
  message,
  label = "Chamar no WhatsApp",
  variant = "outline",
  size = "sm",
  className,
  icon,
}: WhatsAppButtonProps) {
  return (
    <Button variant={variant} size={size} asChild className={cn(className)}>
      <a
        href={buildWhatsAppLink(phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} · ${phone}`}
      >
        {icon ?? <MessageCircle />}
        {label}
      </a>
    </Button>
  )
}
