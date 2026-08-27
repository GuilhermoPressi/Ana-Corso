import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyPrecise(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

/**
 * Datas do sistema chegam como "AAAA-MM-DD". O construtor Date interpreta esse
 * formato como UTC, o que desloca o dia em fusos negativos — por isso montamos
 * a data no fuso local explicitamente.
 */
export function parseLocalDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parseLocalDate(iso))
}

export function formatDateLong(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(
    parseLocalDate(iso),
  )
}

export function formatDayMonth(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(parseLocalDate(iso))
}

/** Anos completos entre a data informada e hoje. */
export function ageFrom(iso: string) {
  const birth = parseLocalDate(iso)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
