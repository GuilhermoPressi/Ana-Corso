import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function NumberField({
  id,
  label,
  help,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  invalid,
  className,
}: {
  id: string
  label: string
  help?: string
  value: string
  onChange: (value: string) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  invalid?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </Label>

      <div className="relative mt-1.5">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid}
          className={cn(
            "bg-card text-[14px] font-medium tabular-nums",
            prefix && "pl-9",
            suffix && "pr-12",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>

      {help && <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{help}</p>}
    </div>
  )
}

export function ResultRow({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string
  value: string
  hint?: string
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-2 rounded-xl px-4 py-3",
        emphasis ? "bg-primary/[0.07] ring-1 ring-primary/15" : "bg-muted/40",
      )}
    >
      <div className="min-w-0">
        <p className={cn("text-[12px] font-medium", emphasis ? "text-primary" : "text-muted-foreground")}>
          {label}
        </p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <p
        className={cn(
          "font-display font-semibold tabular-nums",
          emphasis ? "text-[22px] text-primary" : "text-[16px]",
        )}
      >
        {value}
      </p>
    </div>
  )
}
