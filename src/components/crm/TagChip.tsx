import type { ReactNode } from "react"

import { tagColorStyle } from "@/lib/tag-colors"
import { cn } from "@/lib/utils"

export function TagChip({
  name,
  color,
  size = "sm",
  children,
  className,
}: {
  name: string
  color?: string
  size?: "xs" | "sm"
  children?: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full font-medium",
        size === "xs" ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]",
        tagColorStyle(color).chip,
        className,
      )}
    >
      <span className="truncate">{name}</span>
      {children}
    </span>
  )
}
