import { cn } from "@/lib/utils"

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-[hsl(316_70%_72%)] shadow-[0_6px_18px_-8px_hsl(335_78%_55%/0.9)]">
        <svg viewBox="0 0 32 32" className="size-5" fill="none" aria-hidden="true">
          <path
            d="M16 7c2.4 2.2 3.6 4.4 3.6 6.6 0 1.6-.7 2.9-2 4 2.3.3 3.9 1 4.9 2.1 1 1.1 1.5 2.4 1.5 3.9-2.9 0-5.1-.6-6.5-1.8-.6-.5-1.1-1.1-1.5-1.8-.4.7-.9 1.3-1.5 1.8-1.4 1.2-3.6 1.8-6.5 1.8 0-1.5.5-2.8 1.5-3.9 1-1.1 2.6-1.8 4.9-2.1-1.3-1.1-2-2.4-2-4C12.4 11.4 13.6 9.2 16 7Z"
            fill="currentColor"
            className="text-white"
          />
        </svg>
      </div>
      {showWordmark && (
        <div className="leading-none">
          <p className="font-display text-[15px] font-semibold tracking-tight text-foreground">Ana Corso</p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">Gestão para estética</p>
        </div>
      )}
    </div>
  )
}
