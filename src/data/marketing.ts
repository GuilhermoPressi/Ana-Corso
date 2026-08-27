export type ContentGoal = "educar" | "atrair" | "converter" | "confianca"
export type ContentFormat = "Reels" | "Carrossel" | "Story"

export const contentGoals: { id: ContentGoal; label: string; hint: string }[] = [
  { id: "educar", label: "Educar", hint: "Ensina algo e derruba um mito" },
  { id: "atrair", label: "Atrair", hint: "Fala da dor de quem ainda não te conhece" },
  { id: "converter", label: "Converter", hint: "Responde a objeção que trava a decisão" },
  { id: "confianca", label: "Gerar confiança", hint: "Mostra o seu critério e o seu cuidado" },
]

export const contentFormats: ContentFormat[] = ["Reels", "Carrossel", "Story"]

/** Matéria-prima de copy por procedimento — o que dói, o que travam e o que entrega. */
export type ProcedureCopy = {
  id: string
  name: string
  painPoint: string
  myth: string
  benefit: string
  objection: string
  timeline: string
  detail: string
}

export const procedureCopy: ProcedureCopy[] = [
  {
    id: "toxina",
    name: "Toxina botulínica",
    painPoint: "a testa marcada mesmo quando você está descansada",
    myth: "que toxina congela o rosto",
    benefit: "suavizar as linhas sem perder a sua expressão",
    objection: "o medo de ficar com cara de artificial",
    timeline: "o efeito completo aparece por volta do 14º dia",
    detail: "cada músculo tem uma força diferente, e é isso que define o desenho da aplicação",
  },
  {
    id: "preenchimento",
    name: "Preenchimento",
    painPoint: "aquele cansaço no olhar que não sai nem dormindo bem",
    myth: "que preenchimento sempre deixa o rosto inchado",
    benefit: "devolver o volume que o tempo levou, respeitando o seu formato",
    objection: "o receio de exagerar e mudar os seus traços",
    timeline: "o produto leva cerca de 30 dias para integrar de vez",
    detail: "a escolha do plano de aplicação importa mais do que a quantidade",
  },
  {
    id: "bioestimulador",
    name: "Bioestimulador de colágeno",
    painPoint: "a pele que começou a ceder e você percebe na foto",
    myth: "que bioestimulador dá resultado na hora",
    benefit: "firmeza construída pelo seu próprio colágeno",
    objection: "a dúvida se vale esperar meses para ver diferença",
    timeline: "a resposta aparece de forma gradual, entre 30 e 90 dias",
    detail: "é um tratamento de protocolo, não de sessão única",
  },
  {
    id: "skinbooster",
    name: "Skinbooster",
    painPoint: "a pele opaca, com textura irregular e sem viço",
    myth: "que hidratar por fora resolve pele desidratada",
    benefit: "hidratação profunda que aparece na luz da pele",
    objection: "achar que é só um creme caro",
    timeline: "a textura melhora já nas primeiras semanas",
    detail: "a distribuição uniforme importa mais do que o volume aplicado",
  },
]

export type ContentIdea = {
  id: string
  category: "Educativo" | "Bastidores" | "Prova social" | "Objeção" | "Sazonal"
  format: ContentFormat
  hook: string
  note: string
  procedureId?: string
}

export const ideaBank: ContentIdea[] = [
  {
    id: "idea-1",
    category: "Educativo",
    format: "Carrossel",
    hook: "Os 5 padrões de glabela — descubra o seu",
    note: "Ilustre cada padrão com um desenho simples. Fecha convidando para avaliação.",
    procedureId: "toxina",
  },
  {
    id: "idea-2",
    category: "Objeção",
    format: "Reels",
    hook: "\"Vou ficar com cara de artificial?\"",
    note: "Mostre o antes e depois de uma paciente com resultado natural, com autorização.",
    procedureId: "toxina",
  },
  {
    id: "idea-3",
    category: "Bastidores",
    format: "Story",
    hook: "O que eu faço antes de encostar a agulha em você",
    note: "Sequência de stories: anamnese, avaliação, planejamento, assepsia.",
  },
  {
    id: "idea-4",
    category: "Educativo",
    format: "Reels",
    hook: "Por que o seu preenchimento durou menos que o da sua amiga",
    note: "Fale de metabolismo, área tratada e produto. Sem prometer durações fixas.",
    procedureId: "preenchimento",
  },
  {
    id: "idea-5",
    category: "Prova social",
    format: "Carrossel",
    hook: "3 meses de bioestimulador: o que mudou",
    note: "Fotos padronizadas no mesmo ângulo e na mesma luz. Consentimento assinado.",
    procedureId: "bioestimulador",
  },
  {
    id: "idea-6",
    category: "Objeção",
    format: "Reels",
    hook: "\"É caro?\" Vamos fazer a conta juntas",
    note: "Divida o investimento pelos meses de resultado. Nada de promessa de preço.",
  },
  {
    id: "idea-7",
    category: "Educativo",
    format: "Carrossel",
    hook: "Skinbooster não é preenchimento — e essa diferença muda tudo",
    note: "Compare objetivo, plano de aplicação e resultado esperado.",
    procedureId: "skinbooster",
  },
  {
    id: "idea-8",
    category: "Sazonal",
    format: "Story",
    hook: "Vai ter casamento? Comece 90 dias antes",
    note: "Monte a régua de tempo até o evento e ofereça avaliação.",
  },
  {
    id: "idea-9",
    category: "Bastidores",
    format: "Reels",
    hook: "Um dia na clínica em 30 segundos",
    note: "Corte rápido: chegada, avaliação, procedimento, paciente saindo feliz.",
  },
  {
    id: "idea-10",
    category: "Educativo",
    format: "Carrossel",
    hook: "O que eu NÃO faço em consulta — e por quê",
    note: "Posicionamento: recusar o que não é indicado gera mais confiança que aceitar tudo.",
  },
  {
    id: "idea-11",
    category: "Prova social",
    format: "Story",
    hook: "Print do WhatsApp de quem voltou depois de 6 meses",
    note: "Sempre com autorização e nome oculto.",
  },
  {
    id: "idea-12",
    category: "Sazonal",
    format: "Reels",
    hook: "Pele no inverno: a hora certa para os procedimentos que pedem sol zero",
    note: "Aproveite a sazonalidade para agendar peelings e lasers.",
  },
]

/* ------------------------------------------------------------------ *
 * Geração de conteúdo (mock determinístico)
 * ------------------------------------------------------------------ */

export type GeneratedContent = {
  hook: string
  script: { beat: string; text: string }[]
  caption: string
  hashtags: string[]
  cta: string
}

const hookByGoal: Record<ContentGoal, (copy: ProcedureCopy) => string> = {
  educar: (copy) => `Mentira que te contaram: ${copy.myth}.`,
  atrair: (copy) => `Se ${copy.painPoint} te incomoda, esse vídeo é para você.`,
  converter: (copy) => `${capitalize(copy.objection)}? Foi por isso que eu mudei a minha forma de avaliar.`,
  confianca: (copy) => `O que eu avalio antes de indicar ${copy.name.toLowerCase()} para alguém.`,
}

const ctaByGoal: Record<ContentGoal, string> = {
  educar: "Salva esse post para não esquecer — e me chama se ficou alguma dúvida.",
  atrair: "Me manda um oi no direct que eu te explico como funciona a avaliação.",
  converter: "Chama no WhatsApp e a gente monta o seu plano com calma.",
  confianca: "Se você procura esse cuidado, a minha agenda está aberta para avaliação.",
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function beatsFor(format: ContentFormat, copy: ProcedureCopy, goal: ContentGoal) {
  const commonClose = { beat: "Fechamento", text: ctaByGoal[goal] }

  if (format === "Carrossel") {
    return [
      { beat: "Capa", text: hookByGoal[goal](copy) },
      { beat: "Slide 2", text: `A verdade: ${copy.benefit}.` },
      { beat: "Slide 3", text: capitalize(copy.detail) + "." },
      { beat: "Slide 4", text: `Sobre o tempo: ${copy.timeline}.` },
      { beat: "Slide 5", text: "O que eu avalio em você antes de indicar qualquer coisa." },
      commonClose,
    ]
  }

  if (format === "Story") {
    return [
      { beat: "Story 1", text: hookByGoal[goal](copy) },
      { beat: "Story 2", text: `Explico em 15 segundos: ${copy.benefit}.` },
      { beat: "Story 3", text: "Caixinha de perguntas: o que você quer saber?" },
      commonClose,
    ]
  }

  return [
    { beat: "0-3 s · gancho", text: hookByGoal[goal](copy) },
    { beat: "3-10 s · contexto", text: `Muita gente acredita ${copy.myth}. Não é bem assim.` },
    { beat: "10-20 s · conteúdo", text: capitalize(copy.detail) + "." },
    { beat: "20-27 s · prova", text: `${capitalize(copy.timeline)} — e é isso que eu combino com a paciente antes de começar.` },
    commonClose,
  ]
}

export function generateContent(
  copy: ProcedureCopy,
  goal: ContentGoal,
  format: ContentFormat,
  clinicName: string,
): GeneratedContent {
  const hashtagBase = copy.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "")

  return {
    hook: hookByGoal[goal](copy),
    script: beatsFor(format, copy, goal),
    caption: [
      hookByGoal[goal](copy),
      "",
      `${capitalize(copy.benefit)} — esse é o objetivo quando a indicação é bem feita.`,
      capitalize(copy.detail) + ".",
      "",
      `Sobre o tempo: ${copy.timeline}.`,
      "",
      ctaByGoal[goal],
    ].join("\n"),
    hashtags: [
      `#${hashtagBase}`,
      "#harmonizacaofacial",
      "#estetica",
      "#resultadonatural",
      `#${clinicName.toLowerCase().replace(/[^a-z]/g, "")}`,
    ],
    cta: ctaByGoal[goal],
  }
}
