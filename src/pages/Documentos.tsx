import { useMemo, useState } from "react"
import { BookMarked, FileText, Printer, TriangleAlert } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  documentTemplates,
  fillTemplate,
  type DocumentTemplate,
  type DocumentVariables,
} from "@/data/documents"
import { CLINIC_TODAY } from "@/lib/clinic"
import { cn, formatDateLong } from "@/lib/utils"
import { useClinicStore } from "@/stores/useClinicStore"
import { usePatientStore } from "@/stores/usePatientStore"

const categoryStyles = {
  Anamnese: "border-[hsl(190_48%_60%)]/30 bg-[hsl(190_48%_60%)]/12 text-[hsl(190_45%_38%)]",
  Consentimento: "border-primary/25 bg-primary/10 text-primary",
  Evolução: "border-[hsl(268_52%_70%)]/30 bg-[hsl(268_52%_70%)]/12 text-[hsl(268_45%_50%)]",
  Contrato: "border-[hsl(20_82%_74%)]/35 bg-[hsl(20_82%_74%)]/15 text-[hsl(20_60%_45%)]",
} as const

export default function Documentos() {
  const [selected, setSelected] = useState<DocumentTemplate | null>(null)

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Biblioteca de Documentos"
        description="Modelos prontos, com os dados da sua clínica já preenchidos."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documentTemplates.map((template) => (
          <button key={template.id} onClick={() => setSelected(template)} className="text-left">
            <Card className="h-full gap-0 border-border/70 py-0 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/25">
              <CardContent className="flex h-full flex-col px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent">
                    <FileText className="size-4.5 text-primary" />
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", categoryStyles[template.category])}
                  >
                    {template.category}
                  </Badge>
                </div>

                <h3 className="mt-3.5 font-display text-[15px] font-semibold leading-snug">
                  {template.title}
                </h3>
                <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                  {template.description}
                </p>

                <p className="mt-4 text-[11px] font-medium text-primary">Abrir prévia →</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3.5">
        <BookMarked className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Os dados da clínica vêm das configurações e entram automaticamente onde aparece{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{"{{clinica}}"}</code>. Selecionando
          uma paciente na prévia, o nome dela também é preenchido.
        </p>
      </div>

      <DocumentPreview template={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function DocumentPreview({
  template,
  onClose,
}: {
  template: DocumentTemplate | null
  onClose: () => void
}) {
  const profile = useClinicStore((state) => state.profile)
  const patients = usePatientStore((state) => state.patients)
  const [patientId, setPatientId] = useState<string>("")

  const patient = patients.find((item) => item.id === patientId)

  const variables = useMemo<DocumentVariables>(
    () => ({
      clinica: profile.name,
      profissional: profile.professional,
      registro: profile.registry,
      endereco: profile.address,
      cidade: profile.city,
      telefone: profile.phone,
      email: profile.email,
      paciente: patient?.name ?? "____________________________________",
      data: formatDateLong(CLINIC_TODAY),
    }),
    [profile, patient],
  )

  const fill = (text: string) => fillTemplate(text, variables)

  return (
    <Dialog open={Boolean(template)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-print-root className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{template?.title ?? "Documento"}</DialogTitle>
          <DialogDescription>Prévia do modelo pronta para impressão.</DialogDescription>
        </DialogHeader>

        {template && (
          <>
            {/* Barra de contexto — não vai para o papel */}
            <div
              data-print-hide
              className="flex flex-wrap items-center gap-3 border-b border-border/70 bg-muted/30 px-6 py-3.5"
            >
              <div className="min-w-[220px] flex-1">
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger size="sm" className="w-full bg-card text-[13px]">
                    <SelectValue placeholder="Preencher com uma paciente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {template.notice && (
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-warning-foreground">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  {template.notice}
                </p>
              )}
            </div>

            {/* Documento */}
            <article className="px-9 py-9">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                <div>
                  <p className="font-display text-[17px] font-semibold">{profile.name}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {profile.professional} · {profile.registry}
                    <br />
                    {profile.address} · {profile.city}
                    <br />
                    {profile.phone} · {profile.email}
                  </p>
                </div>

                <div className="text-right">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", categoryStyles[template.category])}
                  >
                    {template.category}
                  </Badge>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {formatDateLong(CLINIC_TODAY)}
                  </p>
                </div>
              </header>

              <h1 className="mt-6 font-display text-xl font-semibold tracking-tight">
                {template.title}
              </h1>

              <div className="mt-5 flex flex-col gap-6">
                {template.sections.map((section, index) => (
                  <section key={section.heading ?? `s-${index}`}>
                    {section.heading && (
                      <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                        {section.heading}
                      </h2>
                    )}

                    {section.paragraphs?.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 40)}
                        className="mb-2.5 text-[13px] leading-relaxed text-foreground/85"
                      >
                        {fill(paragraph)}
                      </p>
                    ))}

                    {section.bullets && (
                      <ul className="flex flex-col gap-2">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-2.5 text-[13px] leading-relaxed">
                            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary/50" />
                            <span className="text-foreground/85">{fill(bullet)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.fields && (
                      <div className="flex flex-col gap-3.5">
                        {section.fields.map((field) => (
                          <div key={field.label}>
                            <p className="text-[11px] font-medium text-muted-foreground">
                              {fill(field.label)}
                            </p>
                            {Array.from({ length: field.lines ?? 1 }).map((_, line) => (
                              <div
                                key={`${field.label}-${line}`}
                                className="mt-2 h-px w-full bg-border"
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {section.signatures && (
                      <div className="mt-8 grid gap-8 sm:grid-cols-2">
                        {section.signatures.map((signature) => (
                          <div key={signature}>
                            <div className="h-px w-full bg-foreground/40" />
                            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                              {fill(signature)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              <p className="mt-8 border-t border-border pt-4 text-center text-[10px] text-muted-foreground">
                {profile.name} · {profile.city} · {profile.instagram}
              </p>
            </article>

            <DialogFooter
              data-print-hide
              className="gap-2 border-t border-border/70 px-6 py-4 sm:justify-between"
            >
              <p className="text-[11px] text-muted-foreground">
                {patient
                  ? `Preenchido para ${patient.name}.`
                  : "Sem paciente selecionada — os campos ficam em branco para preencher à mão."}
              </p>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button onClick={() => window.print()} className="rounded-full">
                  <Printer /> Imprimir ou salvar PDF
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
