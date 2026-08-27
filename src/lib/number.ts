/** Aceita vírgula ou ponto como separador decimal, como o usuário brasileiro digita. */
export function parseDecimal(raw: string) {
  const normalized = raw.replace(/\s/g, "").replace(",", ".")
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : Number.NaN
}
