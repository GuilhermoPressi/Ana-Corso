/**
 * Precificação por markup divisor.
 *
 * Taxas, impostos e margem incidem sobre o PREÇO DE VENDA, não sobre o custo.
 * Somar percentuais ao custo (cost-plus) subestima o preço: um procedimento com
 * 40% de margem desejada precisa de um preço em que o lucro seja 40% da venda,
 * e não 40% do custo.
 */

export type PricingInput = {
  productCost: number
  materialCost: number
  roomCost: number
  cardFeePercent: number
  taxPercent: number
  marginPercent: number
}

export type PricingResult = {
  realCost: number
  /** Menor preço que ainda cobre custo, taxa e imposto — lucro zero. */
  minimumPrice: number
  /** Preço que entrega a margem desejada. */
  recommendedPrice: number
  /** Recomendado arredondado para cima, em múltiplos de R$ 10. */
  commercialPrice: number
  /** Soma dos percentuais que saem do preço de venda. */
  totalPercent: number
  /** Verdadeiro quando os percentuais somam 100% ou mais e não existe preço possível. */
  impossible: boolean
}

export function calculatePricing(input: PricingInput): PricingResult {
  const realCost = input.productCost + input.materialCost + input.roomCost
  const feePercent = input.cardFeePercent + input.taxPercent
  const totalPercent = feePercent + input.marginPercent

  const impossible = totalPercent >= 100 || feePercent >= 100

  const minimumPrice = feePercent >= 100 ? 0 : realCost / (1 - feePercent / 100)
  const recommendedPrice = impossible ? 0 : realCost / (1 - totalPercent / 100)

  return {
    realCost,
    minimumPrice,
    recommendedPrice,
    commercialPrice: impossible ? 0 : Math.ceil(recommendedPrice / 10) * 10,
    totalPercent,
    impossible,
  }
}

export type PriceBreakdown = {
  cost: number
  cardFee: number
  tax: number
  profit: number
  marginPercent: number
}

/** Abre um preço praticado nas suas partes, para conferir a margem real. */
export function breakdownPrice(price: number, input: PricingInput): PriceBreakdown {
  const cost = input.productCost + input.materialCost + input.roomCost
  const cardFee = price * (input.cardFeePercent / 100)
  const tax = price * (input.taxPercent / 100)
  const profit = price - cost - cardFee - tax

  return {
    cost,
    cardFee,
    tax,
    profit,
    marginPercent: price === 0 ? 0 : (profit / price) * 100,
  }
}
