import type { LucideIcon } from "lucide-react"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export type ComingSoonProps = {
  title: string
  description: string
  icon: LucideIcon
  /** O que o módulo vai entregar quando estiver pronto. */
  highlights: string[]
  eta?: string
}

export function ComingSoon({ title, description, icon: Icon, highlights, eta = "Em breve" }: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft /> Voltar ao painel
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden border-border/70 shadow-[var(--shadow-soft)]">
        <div className="relative isolate">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,hsl(335_78%_65%/0.12),transparent_70%)]"
          />
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent ring-1 ring-primary/15">
              <Icon className="size-7 text-primary" />
            </div>

            <Badge variant="secondary" className="mt-5 rounded-full px-3 py-1 text-[11px] font-semibold">
              <Sparkles className="size-3" /> {eta}
            </Badge>

            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
              Estamos construindo este módulo
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>

            <div className="mt-8 grid w-full max-w-2xl gap-2.5 text-left sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/35 px-3.5 py-3"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <p className="text-[13px] leading-relaxed text-foreground/80">{item}</p>
                </div>
              ))}
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              Quer influenciar o que entra primeiro? Fale com o time pelo chat de suporte.
            </p>
          </CardContent>
        </div>
      </Card>
    </div>
  )
}
