import { useMemo, useState } from "react"
import { Search, TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { quickCategories, quickReference, type QuickEntry } from "@/data/quickReference"
import { cn } from "@/lib/utils"

/** Remove acentos para a busca funcionar com ou sem eles. */
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function QuickReferenceBrowser({ autoFocus = false }: { autoFocus?: boolean }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)

  const results = useMemo(() => {
    const term = normalize(query.trim())

    return quickReference.filter((entry) => {
      if (category && entry.category !== category) return false
      if (!term) return true

      const haystack = normalize(
        [entry.title, entry.summary, entry.category, ...entry.keywords].join(" "),
      )
      return haystack.includes(term)
    })
  }, [query, category])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border/70 px-5 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus={autoFocus}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Masseter, reconstituição, zonas de risco..."
            className="h-10 bg-card pl-9 text-[14px]"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              category === null
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            Tudo
          </button>
          {quickCategories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory((current) => (current === item ? null : item))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                category === item
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 px-5 py-4 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
        {results.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="grid size-11 place-items-center rounded-2xl bg-accent">
              <Search className="size-5 text-primary" />
            </div>
            <p className="mt-3.5 text-[13px] font-medium">Nada encontrado para "{query}"</p>
            <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
              Tente o nome do músculo, do produto ou do que você quer conferir.
            </p>
          </div>
        ) : (
          results.map((entry) => <EntryCard key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}

function EntryCard({ entry }: { entry: QuickEntry }) {
  return (
    <div className="rounded-xl border border-border/70 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-[14px] font-semibold">{entry.title}</h3>
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {entry.category}
        </Badge>
      </div>

      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{entry.summary}</p>

      {entry.table && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-muted/50">
                {entry.table.headers.map((header) => (
                  <th
                    key={header}
                    className="px-2.5 py-1.5 text-left font-semibold text-muted-foreground"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entry.table.rows.map((row) => (
                <tr key={row.join("|")} className="border-t border-border/50">
                  {row.map((cell, index) => (
                    <td
                      key={`${row[0]}-${index}`}
                      className={cn(
                        "px-2.5 py-1.5",
                        index === 0 ? "font-medium" : "text-muted-foreground",
                        index > 0 && "tabular-nums",
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entry.facts && (
        <dl className="mt-3 flex flex-col gap-1.5">
          {entry.facts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`} className="flex gap-2 text-[12px] leading-relaxed">
              <dt className="shrink-0 font-medium text-foreground/70">{fact.label}:</dt>
              <dd className="min-w-0 text-muted-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {entry.warning && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/[0.07] px-3 py-2 text-[11px] leading-relaxed text-warning-foreground">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {entry.warning}
        </p>
      )}
    </div>
  )
}
