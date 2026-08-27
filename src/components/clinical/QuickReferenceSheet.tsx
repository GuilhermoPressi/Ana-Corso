import { useEffect, useState } from "react"
import { Stethoscope } from "lucide-react"

import { QuickReferenceBrowser } from "@/components/clinical/QuickReferenceBrowser"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function QuickReferenceSheet() {
  const [open, setOpen] = useState(false)

  // Atalho global: a médica abre sem tirar a mão do teclado.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Stethoscope />
          <span className="hidden lg:inline">Consulta rápida</span>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground xl:inline">
            ⌘K
          </kbd>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="gap-1 border-b border-border/70 px-5 pb-4 pt-5">
          <SheetTitle className="font-display text-base">Consulta rápida</SheetTitle>
          <SheetDescription>
            Anatomia, diluição e conduta — para conferir sem sair do atendimento.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <QuickReferenceBrowser autoFocus />
        </ScrollArea>

        <p className="border-t border-border/70 px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
          Referência de apoio. Não substitui a bula do produto nem o seu julgamento clínico — e, como no
          resto do sistema, não define dose.
        </p>
      </SheetContent>
    </Sheet>
  )
}
