import { useState, type ReactNode } from "react"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

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
import { procedureFilters, type Patient } from "@/data/patients"
import { usePatientStore, type NewPatientInput } from "@/stores/usePatientStore"

const origins: Patient["origin"][] = ["Instagram", "Indicação", "Google", "WhatsApp", "Presencial"]
const professionals = ["Dra. Ana Corso", "Est. Marcela Reis"]
const skinTypes = [
  "Fototipo I · seca",
  "Fototipo II · seca",
  "Fototipo II · oleosa",
  "Fototipo III · mista",
  "Fototipo III · normal",
  "Fototipo IV · mista",
  "Fototipo IV · normal",
]

const emptyForm: NewPatientInput = {
  name: "",
  phone: "",
  email: "",
  city: "Porto Alegre · RS",
  birthDate: "",
  mainProcedure: "Avaliação facial",
  professional: professionals[0],
  origin: "Instagram",
  skinType: skinTypes[3],
  allergies: "Nenhuma relatada",
  observations: "",
}

export function NewPatientDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewPatientInput>(emptyForm)
  const [touched, setTouched] = useState(false)

  const addPatient = usePatientStore((state) => state.addPatient)
  const navigate = useNavigate()

  const nameError = form.name.trim().length < 3
  const phoneError = form.phone.trim().length < 8

  function set<K extends keyof NewPatientInput>(key: K, value: NewPatientInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit() {
    setTouched(true)
    if (nameError || phoneError) return

    const patient = addPatient({
      ...form,
      birthDate: form.birthDate || "1990-01-01",
      observations: form.observations.trim() || "Sem observações registradas na abertura da ficha.",
    })

    setOpen(false)
    setForm(emptyForm)
    setTouched(false)

    toast.success(`${patient.name} foi cadastrada`, {
      description: "A ficha já está disponível e os números do painel foram atualizados.",
      action: { label: "Abrir ficha", onClick: () => navigate(`/pacientes/${patient.id}`) },
    })
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
        {trigger ?? (
          <Button size="sm" className="rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]">
            <UserPlus /> Nova paciente
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Nova paciente</DialogTitle>
          <DialogDescription>
            O essencial para abrir a ficha. O restante você completa na anamnese.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="np-name" className="text-[13px]">
              Nome completo
            </Label>
            <Input
              id="np-name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Ex.: Mariana Teixeira"
              aria-invalid={touched && nameError}
              className="mt-1.5"
            />
            {touched && nameError && (
              <p className="mt-1.5 text-[11px] text-destructive">Informe o nome completo da paciente.</p>
            )}
          </div>

          <div>
            <Label htmlFor="np-phone" className="text-[13px]">
              Telefone
            </Label>
            <Input
              id="np-phone"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              placeholder="(51) 99999-0000"
              aria-invalid={touched && phoneError}
              className="mt-1.5"
            />
            {touched && phoneError && (
              <p className="mt-1.5 text-[11px] text-destructive">Informe um telefone para contato.</p>
            )}
          </div>

          <div>
            <Label htmlFor="np-email" className="text-[13px]">
              E-mail <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="np-email"
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              placeholder="nome@email.com"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="np-birth" className="text-[13px]">
              Nascimento
            </Label>
            <Input
              id="np-birth"
              type="date"
              value={form.birthDate}
              onChange={(event) => set("birthDate", event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="np-city" className="text-[13px]">
              Cidade
            </Label>
            <Input
              id="np-city"
              value={form.city}
              onChange={(event) => set("city", event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-[13px]">Procedimento de interesse</Label>
            <Select value={form.mainProcedure} onValueChange={(value) => set("mainProcedure", value)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {procedureFilters.slice(1).map((item) => (
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
              value={form.origin}
              onValueChange={(value) => set("origin", value as Patient["origin"])}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {origins.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[13px]">Profissional responsável</Label>
            <Select value={form.professional} onValueChange={(value) => set("professional", value)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[13px]">Tipo de pele</Label>
            <Select value={form.skinType} onValueChange={(value) => set("skinType", value)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {skinTypes.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="np-allergies" className="text-[13px]">
              Alergias e restrições
            </Label>
            <Input
              id="np-allergies"
              value={form.allergies}
              onChange={(event) => set("allergies", event.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="np-obs" className="text-[13px]">
              Observações <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="np-obs"
              value={form.observations}
              onChange={(event) => set("observations", event.target.value)}
              placeholder="Queixa principal, expectativa, cuidados especiais..."
              className="mt-1.5 min-h-[80px] resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} className="rounded-full">
            <UserPlus /> Cadastrar paciente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
