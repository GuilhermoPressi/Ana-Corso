import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, Loader2, Search, UserRound, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type PickedPatient = { id: string | null; name: string; phone?: string | null }

type Option = { id: string; name: string; phone: string | null; mainProcedure?: string | null }

function formatPhone(phone: string | null | undefined) {
  const d = (phone || "").replace(/\D/g, "")
  const local = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return phone || ""
}

/**
 * Seleção de paciente com busca no servidor (nome, telefone ou CPF).
 * Também permite usar um nome ainda não cadastrado.
 */
export function PatientPicker({
  value,
  onChange,
}: {
  value: PickedPatient | null
  onChange: (value: PickedPatient | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ limit: "20" })
        if (query.trim()) params.set("search", query.trim())
        const res = await fetch(`/api/patients/options?${params}`, { credentials: "include" })
        if (!res.ok) throw new Error(`Erro ${res.status}`)
        const data = (await res.json()) as { options: Option[] }
        if (!cancelled) setOptions(data.options ?? [])
      } catch {
        if (!cancelled) setError("Não foi possível carregar as pacientes.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, query])

  const typed = query.trim()
  const canUseTyped = typed.length >= 2 && !options.some((o) => o.name.toLowerCase() === typed.toLowerCase())

  function pick(next: PickedPatient) {
    onChange(next)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between px-3 text-xs font-normal"
        >
          {value ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{value.name}</span>
              {!value.id && <span className="shrink-0 text-muted-foreground">(sem cadastro)</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Selecione a paciente...</span>
          )}
          <span className="flex items-center gap-1">
            {value && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Limpar paciente"
                onClick={(event) => {
                  event.stopPropagation()
                  onChange(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.stopPropagation()
                    onChange(null)
                  }
                }}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="relative border-b p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                if (options.length === 1) pick({ id: options[0].id, name: options[0].name, phone: options[0].phone })
                else if (canUseTyped && options.length === 0) pick({ id: null, name: typed })
              }
            }}
            placeholder="Buscar por nome, telefone ou CPF"
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {loading && options.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Buscando…
            </div>
          ) : error ? (
            <p className="py-4 text-center text-xs text-destructive">{error}</p>
          ) : options.length === 0 && !canUseTyped ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {typed ? "Nenhuma paciente encontrada." : "Nenhuma paciente cadastrada ainda."}
            </p>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => pick({ id: option.id, name: option.name, phone: option.phone })}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
              >
                <Check className={cn("size-3.5 shrink-0", value?.id === option.id ? "text-primary" : "opacity-0")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{option.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {[formatPhone(option.phone), option.mainProcedure].filter(Boolean).join(" · ") || "Sem telefone"}
                  </span>
                </span>
              </button>
            ))
          )}
          {canUseTyped && !loading && (
            <button
              type="button"
              onClick={() => pick({ id: null, name: typed })}
              className="mt-1 flex w-full items-center gap-2 rounded-md border-t px-2 py-2 text-left text-xs text-muted-foreground hover:bg-muted"
            >
              <UserRound className="size-3.5 shrink-0" />
              Agendar “{typed}” sem cadastro
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
