/**
 * Régua de pós-procedimento: os contatos que precisam acontecer depois de cada
 * tipo de atendimento. O sistema calcula as datas; quem conversa é a clínica.
 */
export type CarePoint = {
  id: string
  /** Dias após o procedimento. */
  day: number
  label: string
  /** O que precisa ser perguntado nesse contato. */
  question: string
  /** Sinais que exigem atenção imediata se aparecerem. */
  watchFor?: string
}

export const careRails: Record<string, CarePoint[]> = {
  "Toxina botulínica": [
    {
      id: "d1",
      day: 1,
      label: "D+1 · como passou a noite",
      question: "Teve dor de cabeça, hematoma ou algum desconforto?",
      watchFor: "Cefaleia intensa ou queda de pálpebra",
    },
    {
      id: "d7",
      day: 7,
      label: "D+7 · início do efeito",
      question: "Já sentiu o movimento começar a reduzir?",
    },
    {
      id: "d14",
      day: 14,
      label: "D+14 · avaliação de simetria",
      question: "Efeito completo. Confirmar retorno para avaliar simetria e retoque.",
      watchFor: "Assimetria de sobrancelha ou ptose",
    },
  ],
  Preenchimento: [
    {
      id: "d1",
      day: 1,
      label: "D+1 · edema e hematoma",
      question: "Como está o inchaço? Apareceu roxo ou dor forte?",
      watchFor: "Dor desproporcional, palidez ou reticulado violáceo",
    },
    {
      id: "d3",
      day: 3,
      label: "D+3 · conforto",
      question: "A região está mais confortável? Sente algum endurecimento?",
      watchFor: "Dor que piora em vez de melhorar",
    },
    {
      id: "d7",
      day: 7,
      label: "D+7 · acomodação",
      question: "O edema cedeu? Está satisfeita com o formato até aqui?",
    },
    {
      id: "d30",
      day: 30,
      label: "D+30 · resultado integrado",
      question: "Produto integrado. Avaliar simetria e necessidade de ajuste.",
      watchFor: "Nódulo palpável",
    },
  ],
  Bioestimulador: [
    {
      id: "d1",
      day: 1,
      label: "D+1 · reação imediata",
      question: "Teve edema, dor ou vermelhidão além do esperado?",
      watchFor: "Dor intensa ou área endurecida",
    },
    {
      id: "d5",
      day: 5,
      label: "D+5 · massagem",
      question: "Está conseguindo fazer a massagem como orientei?",
    },
    {
      id: "d30",
      day: 30,
      label: "D+30 · primeira resposta",
      question: "Já percebeu diferença na firmeza? Confirmar próxima sessão.",
      watchFor: "Nódulo ou irregularidade ao toque",
    },
  ],
  Skinbooster: [
    {
      id: "d1",
      day: 1,
      label: "D+1 · pápulas",
      question: "As pápulas já sumiram? Sentiu algum desconforto?",
    },
    {
      id: "d15",
      day: 15,
      label: "D+15 · textura",
      question: "Percebeu a pele mais hidratada e macia?",
    },
  ],
  Microagulhamento: [
    {
      id: "d1",
      day: 1,
      label: "D+1 · vermelhidão",
      question: "A vermelhidão cedeu? Está usando o protetor solar?",
      watchFor: "Ardência forte ou bolhas",
    },
    {
      id: "d7",
      day: 7,
      label: "D+7 · descamação",
      question: "A descamação terminou? Pode retomar os ativos.",
    },
  ],
}

export const defaultRail: CarePoint[] = [
  {
    id: "d1",
    day: 1,
    label: "D+1 · como está",
    question: "Como você está se sentindo depois do procedimento?",
  },
  {
    id: "d7",
    day: 7,
    label: "D+7 · evolução",
    question: "Está tudo dentro do esperado?",
  },
]

export function railFor(procedure: string): CarePoint[] {
  const key = Object.keys(careRails).find((item) =>
    procedure.toLowerCase().includes(item.toLowerCase()),
  )
  return key ? careRails[key] : defaultRail
}
