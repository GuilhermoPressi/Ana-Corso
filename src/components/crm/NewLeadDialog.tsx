import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { parseDecimal } from "@/lib/number"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { LeadSource } from "@/data/leads"
import { usePatientStore } from "@/stores/usePatientStore"

const sources: LeadSource[] = ["Instagram", "Indicação", "Google", "WhatsApp", "Presencial"]

const interests = [
  "Toxina botulínica",
  "Preenchimento labial",
  "Preenchimento malar",
  "Bioestimulador de colágeno",
  "Skinbooster",
  "Harmonização facial completa",
  "Microagulhamento",
  "Avaliação facial",
]

const empty = {
  name: "",
  phone: "",
  interest: interests[0],
  source: "Instagram" as LeadSource,
  value: "",
  note: "",
}

export function NewLeadDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [touched, setTouched] = useState(false)

  const addLead = usePatientStore((state) => state.addLead)

  const nameError = form.name.trim().length < 3
  const valueError = !(parseDecimal(form.value) > 0)

  async function submit() {
    setTouched(true)
    if (nameError || valueError) return

    const created = await addLead({
      name: form.name,
      phone: form.phone || "(51) 90000-0000",
      interest: form.interest,
      source: form.source,
      value: parseDecimal(form.value),
      note: form.note.trim() || undefined,
    })

    if (created) {
      toast.success(`${form.name.trim()} entrou no funil`, {
        description: "O card está na coluna Novos contatos.",
      })

      setForm(empty)
      setTouched(false)
      setOpen(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTouched(false)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]">
          <Plus /> Novo lead
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Novo lead</DialogTitle>
          <DialogDescription>
            Registre o contato agora para ele não se perder entre as mensagens.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div>
            <Label htmlFor="nl-name" className="text-[13px]">
              Nome
            </Label>
            <Input
              id="nl-name"
              value={form.name}
              onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
              placeholder="Ex.: Bruna Carvalho"
              aria-invalid={touched && nameError}
              className="mt-1.5"
            />
            {touched && nameError && (
              <p className="mt-1.5 text-[11px] text-destructive">Informe o nome do contato.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nl-phone" className="text-[13px]">
                Telefone
              </Label>
              <Input
                id="nl-phone"
                value={form.phone}
                onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))}
                placeholder="(51) 99999-0000"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="nl-value" className="text-[13px]">
                Valor da proposta
              </Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
                  R$
                </span>
                <Input
                  id="nl-value"
                  inputMode="decimal"
                  value={form.value}
                  onChange={(event) => setForm((c) => ({ ...c, value: event.target.value }))}
                  placeholder="2.400"
                  aria-invalid={touched && valueError}
                  className="pl-9 tabular-nums"
                />
              </div>
              {touched && valueError && (
                <p className="mt-1.5 text-[11px] text-destructive">Informe um valor estimado.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-[13px]">Interesse</Label>
              <Select
                value={form.interest}
                onValueChange={(value) => setForm((c) => ({ ...c, interest: value }))}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interests.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[13px]">Origem</Label>
              <Select
                value={form.source}
                onValueChange={(value) => setForm((c) => ({ ...c, source: value as LeadSource }))}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="nl-note" className="text-[13px]">
              Observação <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="nl-note"
              value={form.note}
              onChange={(event) => setForm((c) => ({ ...c, note: event.target.value }))}
              placeholder="O que ela pediu, prazo, objeções..."
              className="mt-1.5 min-h-[72px] resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} className="rounded-full">
            <Plus /> Adicionar ao funil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
