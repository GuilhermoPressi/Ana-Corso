import { Stethoscope } from "lucide-react"

import { QuickReferenceBrowser } from "@/components/clinical/QuickReferenceBrowser"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card } from "@/components/ui/card"

export default function ConsultaRapida() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Consulta Rápida"
        description="A mesma referência do atalho ⌘K, em tela cheia para estudar com calma."
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
        <Stethoscope className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-[12px] leading-relaxed text-foreground/80">
          Durante o atendimento, use o botão <span className="font-semibold">Consulta rápida</span> no topo
          (ou <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans text-[10px]">⌘K</kbd>)
          — ele abre um painel lateral sem tirar você da tela em que está.
        </p>
      </div>

      <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
        <QuickReferenceBrowser />
      </Card>
    </div>
  )
}
