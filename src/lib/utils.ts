import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value?: number | null) {
  const num = typeof value === "number" && !isNaN(value) ? value : 0
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatCurrencyPrecise(value?: number | null) {
  const num = typeof value === "number" && !isNaN(value) ? value : 0
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num)
}

/**
 * Datas do sistema chegam como "AAAA-MM-DD". O construtor Date interpreta esse
 * formato como UTC, o que desloca o dia em fusos negativos — por isso montamos
 * a data no fuso local explicitamente.
 */
export function parseLocalDate(iso?: string | null) {
  if (!iso || typeof iso !== "string" || !iso.trim()) return new Date()
  const parts = iso.trim().split("T")[0].split("-").map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return new Date()
  return new Date(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1)
}

export function formatDate(iso?: string | null) {
  if (!iso || typeof iso !== "string" || !iso.trim()) return "—"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parseLocalDate(iso))
}

export function formatDateLong(iso?: string | null) {
  if (!iso || typeof iso !== "string" || !iso.trim()) return "—"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(
    parseLocalDate(iso),
  )
}

export function formatDayMonth(iso?: string | null) {
  if (!iso || typeof iso !== "string" || !iso.trim()) return "—"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(parseLocalDate(iso))
}

/** Anos completos entre a data informada e hoje. */
export function ageFrom(iso?: string | null) {
  if (!iso || typeof iso !== "string" || !iso.trim()) return 0
  const birth = parseLocalDate(iso)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return Math.max(0, age)
}

export function initials(name?: string | null) {
  if (!name || typeof name !== "string" || !name.trim()) return "?"
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
