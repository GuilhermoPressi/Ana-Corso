import type { TagColor } from "@/lib/crm-api"

export const TAG_COLORS: { id: TagColor; label: string; chip: string; dot: string }[] = [
  { id: "rosa", label: "Rosa", chip: "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200", dot: "bg-pink-500" },
  { id: "roxo", label: "Roxo", chip: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200", dot: "bg-violet-500" },
  { id: "azul", label: "Azul", chip: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200", dot: "bg-sky-500" },
  { id: "verde", label: "Verde", chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200", dot: "bg-emerald-500" },
  { id: "amarelo", label: "Amarelo", chip: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200", dot: "bg-amber-400" },
  { id: "laranja", label: "Laranja", chip: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200", dot: "bg-orange-500" },
  { id: "vermelho", label: "Vermelho", chip: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200", dot: "bg-red-500" },
  { id: "cinza", label: "Cinza", chip: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-200", dot: "bg-zinc-400" },
]

export function tagColorStyle(color: string | undefined) {
  return TAG_COLORS.find((c) => c.id === color) ?? TAG_COLORS[0]
}
