/**
 * Inteligência estética: o que precisa acontecer depois de cada procedimento.
 *
 * `clinicalDays` gera o retorno de avaliação na agenda; `commercialDays` gera o
 * lembrete de recontato no CRM, quando o efeito tende a acabar.
 */
export type FollowUpRule = {
  clinicalDays: number
  clinicalReason: string
  commercialDays: number
  commercialReason: string
}

export const followUpRules: Record<string, FollowUpRule> = {
  "Toxina botulínica": {
    clinicalDays: 14,
    clinicalReason: "Retorno de 14 dias · avaliar simetria e necessidade de retoque",
    commercialDays: 120,
    commercialReason: "Manutenção de toxina · o efeito costuma ceder por volta de 4 meses",
  },
  Preenchimento: {
    clinicalDays: 30,
    clinicalReason: "Avaliação de 30 dias · integração do produto e simetria",
    commercialDays: 270,
    commercialReason: "Retoque ou nova aplicação de preenchimento",
  },
  Bioestimulador: {
    clinicalDays: 30,
    clinicalReason: "Avaliação de 30 dias · resposta tecidual e edema",
    commercialDays: 60,
    commercialReason: "Próxima sessão do protocolo de bioestimulador",
  },
  Skinbooster: {
    clinicalDays: 15,
    clinicalReason: "Retorno de 15 dias · hidratação e textura",
    commercialDays: 90,
    commercialReason: "Manutenção trimestral de skinbooster",
  },
  Microagulhamento: {
    clinicalDays: 30,
    clinicalReason: "Avaliação de 30 dias · resposta da pele",
    commercialDays: 45,
    commercialReason: "Próxima sessão de microagulhamento",
  },
}

export const defaultFollowUpRule: FollowUpRule = {
  clinicalDays: 15,
  clinicalReason: "Retorno de 15 dias · avaliação do resultado",
  commercialDays: 180,
  commercialReason: "Recontato para manutenção",
}

export function followUpFor(procedure: string): FollowUpRule {
  const match = Object.keys(followUpRules).find((key) =>
    procedure.toLowerCase().includes(key.toLowerCase()),
  )
  return match ? followUpRules[match] : defaultFollowUpRule
}
