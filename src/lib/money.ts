/**
 * Aceita "1500", "1500,5", "1.500,50" e "1,500.50". Retorna NaN se não for um valor.
 */
export function parseMoney(raw: string) {
  let value = raw.replace(/[R$\s]/g, "")
  if (!value) return Number.NaN
  const lastComma = value.lastIndexOf(",")
  const lastDot = value.lastIndexOf(".")
  if (lastComma > lastDot) {
    value = value.replace(/\./g, "").replace(",", ".")
  } else if (lastDot > lastComma && lastComma !== -1) {
    value = value.replace(/,/g, "")
  } else if (lastComma === -1 && /^\d{1,3}(\.\d{3})+$/.test(value)) {
    // Sem vírgula e pontos agrupando milhares ("1.500", "1.234.567"): padrão brasileiro.
    value = value.replace(/\./g, "")
  }
  return /^\d+(\.\d+)?$/.test(value) ? Number(value) : Number.NaN
}
