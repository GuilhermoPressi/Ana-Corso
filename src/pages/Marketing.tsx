import { useMemo, useState } from "react"
import { Copy, Lightbulb, RefreshCw, Sparkles, Wand2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  contentFormats,
  contentGoals,
  generateContent,
  ideaBank,
  procedureCopy,
  type ContentFormat,
  type ContentGoal,
} from "@/data/marketing"
import { cn } from "@/lib/utils"
import { useClinicStore } from "@/stores/useClinicStore"

const categories = ["Educativo", "Bastidores", "Prova social", "Objeção", "Sazonal"] as const

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copiado`)
  } catch {
    toast.error("Não consegui copiar", { description: "Selecione o texto e copie manualmente." })
  }
}

export default function Marketing() {
  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Marketing"
        description="Conteúdo que explica o seu critério — não que promete resultado."
      />

      <Tabs defaultValue="gerador">
        <TabsList className="mb-5 h-auto w-fit gap-1 rounded-full bg-muted/60 p-1">
          <TabsTrigger value="gerador" className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs">
            <Wand2 className="size-3.5" /> Gerador de conteúdo
          </TabsTrigger>
          <TabsTrigger value="ideias" className="rounded-full px-4 text-[13px] data-[state=active]:shadow-xs">
            <Lightbulb className="size-3.5" /> Banco de ideias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gerador">
          <ContentGenerator />
        </TabsContent>

        <TabsContent value="ideias">
          <IdeaBank />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ContentGenerator() {
  const clinicName = useClinicStore((state) => state.profile.name)

  const [procedureId, setProcedureId] = useState(procedureCopy[0].id)
  const [goal, setGoal] = useState<ContentGoal>("educar")
  const [format, setFormat] = useState<ContentFormat>("Reels")

  const copy = procedureCopy.find((item) => item.id === procedureId) ?? procedureCopy[0]
  const content = useMemo(
    () => generateContent(copy, goal, format, clinicName),
    [copy, goal, format, clinicName],
  )

  const fullCaption = `${content.caption}\n\n${content.hashtags.join(" ")}`

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      {/* Escolhas */}
      <Card className="border-border/70 shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-base">Sobre o que vamos falar</CardTitle>
          <CardDescription className="mt-1">
            O roteiro muda conforme o objetivo e o formato.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5">
          <div>
            <p className="text-[13px] font-medium">Procedimento</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {procedureCopy.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProcedureId(item.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    procedureId === item.id
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-medium">Objetivo</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {contentGoals.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGoal(item.id)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                    goal === item.id
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-border/70 bg-card hover:bg-muted/40",
                  )}
                >
                  <p className="text-[12px] font-semibold">{item.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{item.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-medium">Formato</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {contentFormats.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormat(item)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
                    format === item
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
              <Sparkles className="size-3.5" /> Matéria-prima deste tema
            </p>
            <dl className="mt-2 flex flex-col gap-1.5 text-[11px] leading-relaxed">
              <Fact label="Dor" value={copy.painPoint} />
              <Fact label="Mito" value={copy.myth} />
              <Fact label="Objeção" value={copy.objection} />
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <div className="flex flex-col gap-5">
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base">Gancho</CardTitle>
              <CardDescription className="mt-1">Os 3 primeiros segundos decidem tudo.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyText(content.hook, "Gancho")}
              className="text-muted-foreground"
            >
              <Copy /> Copiar
            </Button>
          </CardHeader>
          <CardContent>
            <p className="rounded-xl bg-gradient-to-br from-accent/70 via-card to-card px-4 py-4 font-display text-lg font-semibold leading-snug ring-1 ring-primary/15">
              {content.hook}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base">Roteiro · {format}</CardTitle>
              <CardDescription className="mt-1">{content.script.length} blocos</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                copyText(
                  content.script.map((item) => `${item.beat}\n${item.text}`).join("\n\n"),
                  "Roteiro",
                )
              }
              className="text-muted-foreground"
            >
              <Copy /> Copiar
            </Button>
          </CardHeader>

          <CardContent>
            <div className="relative">
              <div aria-hidden className="absolute bottom-2 left-[13px] top-2 w-px bg-border" />
              <div className="flex flex-col gap-3.5">
                {content.script.map((item, index) => (
                  <div key={item.beat} className="relative flex gap-3">
                    <span className="z-10 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary ring-4 ring-card">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.beat}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base">Legenda</CardTitle>
              <CardDescription className="mt-1">Com hashtags no final.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyText(fullCaption, "Legenda")}
              className="text-muted-foreground"
            >
              <Copy /> Copiar
            </Button>
          </CardHeader>

          <CardContent>
            <p className="whitespace-pre-line rounded-xl bg-muted/40 px-4 py-3.5 text-[13px] leading-relaxed">
              {content.caption}
            </p>

            <Separator className="my-3.5" />

            <div className="flex flex-wrap gap-1.5">
              {content.hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Rascunho para você editar com a sua voz. Confira as regras do seu conselho antes de publicar —
              em especial sobre antes e depois e promessa de resultado.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-semibold text-foreground/70">{label}:</dt>
      <dd className="min-w-0 text-muted-foreground">{value}</dd>
    </div>
  )
}

function IdeaBank() {
  const [category, setCategory] = useState<string | null>(null)

  const visible = category ? ideaBank.filter((idea) => idea.category === category) : ideaBank

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
            category === null
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          Tudo
        </button>
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory((current) => (current === item ? null : item))}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              category === item
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}

        <Badge variant="secondary" className="ml-auto rounded-full text-[10px] tabular-nums">
          {visible.length} ideias
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((idea) => (
          <Card key={idea.id} className="gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)]">
            <CardContent className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {idea.category}
                </Badge>
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {idea.format}
                </Badge>
              </div>

              <p className="mt-2.5 font-display text-[14px] font-semibold leading-snug">{idea.hook}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{idea.note}</p>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyText(idea.hook, "Gancho")}
                className="mt-3 -ml-2 text-muted-foreground"
              >
                <Copy /> Copiar gancho
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3.5">
        <RefreshCw className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Publicar duas vezes por semana com consistência rende mais do que dez posts numa semana e sumir na
          seguinte. Escolha uma ideia por vez e leve para o gerador.
        </p>
      </div>
    </div>
  )
}
