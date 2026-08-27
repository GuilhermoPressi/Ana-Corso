import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import type { PlanningField } from "@/data/facialPlanning"
import { cn } from "@/lib/utils"

export type FieldValue = string | number | string[] | undefined

const scaleWords = ["Muito baixa", "Baixa", "Moderada", "Alta", "Muito alta"]

export function FieldControl({
  field,
  value,
  onChange,
}: {
  field: PlanningField
  value: FieldValue
  onChange: (value: FieldValue) => void
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-[13px] font-semibold">{field.label}</Label>
        {field.required && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            essencial
          </span>
        )}
      </div>
      {field.help && <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{field.help}</p>}

      <div className="mt-2.5">
        {field.type === "choice" && (
          <div className="flex flex-wrap gap-1.5">
            {field.options?.map((option) => {
              const selected = value === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(selected ? undefined : option)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    selected
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              )
            })}
          </div>
        )}

        {field.type === "scale" && (
          <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{field.scaleLabels?.[0]}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  typeof value === "number" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {typeof value === "number" ? `${value}/5 · ${scaleWords[value - 1]}` : "Não avaliado"}
              </span>
              <span className="text-[11px] text-muted-foreground">{field.scaleLabels?.[1]}</span>
            </div>

            <Slider
              className={cn("mt-3.5 transition-opacity", typeof value !== "number" && "opacity-45")}
              min={1}
              max={5}
              step={1}
              value={[typeof value === "number" ? value : 3]}
              onValueChange={([next]) => onChange(next)}
            />

            <div className="mt-2 flex justify-between px-0.5">
              {[1, 2, 3, 4, 5].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "text-[10px] tabular-nums",
                    value === step ? "font-semibold text-primary" : "text-muted-foreground/60",
                  )}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        )}

        {field.type === "multi" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {field.options?.map((option) => {
              const list = Array.isArray(value) ? value : []
              const checked = list.includes(option)
              return (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                    checked ? "border-primary/35 bg-primary/[0.06]" : "border-border/70 bg-card hover:bg-muted/40",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(state) =>
                      onChange(state ? [...list, option] : list.filter((item) => item !== option))
                    }
                  />
                  <span className="text-[12px] leading-snug">{option}</span>
                </label>
              )
            })}
          </div>
        )}

        {field.type === "text" && (
          <Textarea
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value || undefined)}
            placeholder={field.placeholder}
            className="min-h-[88px] resize-y bg-card text-[13px]"
          />
        )}
      </div>
    </div>
  )
}
