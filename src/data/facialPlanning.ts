/**
 * Configuração da avaliação guiada.
 *
 * Importante: nenhum campo aqui devolve dose, unidade ou volume. A ferramenta
 * organiza o raciocínio clínico — a decisão técnica é sempre da profissional.
 */

export type FieldType = "choice" | "scale" | "multi" | "text"

export type PlanningField = {
  id: string
  label: string
  help?: string
  type: FieldType
  options?: string[]
  /** Extremos do slider, do menor para o maior. */
  scaleLabels?: [string, string]
  placeholder?: string
  /** Campo considerado essencial para o planejamento ficar completo. */
  required?: boolean
}

export type PlanningRegion = {
  id: string
  name: string
  description: string
  extraFields?: PlanningField[]
}

export type PlanningLine = {
  id: string
  name: string
  subtitle: string
  description: string
  /** Campos aplicados a cada região selecionada desta linha. */
  fields: PlanningField[]
  regions: PlanningRegion[]
}

const objetivoField = (options: string[]): PlanningField => ({
  id: "objetivo",
  label: "Objetivo nesta região",
  help: "O que você quer que aconteça aqui ao final do tratamento.",
  type: "choice",
  options,
  required: true,
})

const observacoesField: PlanningField = {
  id: "observacoes",
  label: "Observações do raciocínio",
  help: "Registre o porquê da sua decisão. Isso vira histórico para as próximas sessões.",
  type: "text",
  placeholder: "Ex.: paciente relatou queda de sobrancelha na última aplicação, priorizar elevação lateral...",
}

export const planningLines: PlanningLine[] = [
  {
    id: "toxina",
    name: "Toxina botulínica",
    subtitle: "Avaliação muscular dinâmica",
    description:
      "Mapeie força, padrão de contração e assimetria de cada músculo antes de definir sua conduta.",
    fields: [
      {
        id: "forca-muscular",
        label: "Força muscular",
        help: "Avalie na contração máxima, comparando com o padrão da paciente.",
        type: "scale",
        scaleLabels: ["Muito leve", "Muito forte"],
        required: true,
      },
      {
        id: "padrao-contracao",
        label: "Padrão de contração",
        type: "choice",
        options: ["Homogêneo", "Predomínio medial", "Predomínio lateral", "Irregular"],
        required: true,
      },
      {
        id: "assimetria",
        label: "Assimetria",
        help: "Compare os dois lados em repouso e em contração.",
        type: "choice",
        options: ["Sem assimetria", "Leve à direita", "Leve à esquerda", "Acentuada à direita", "Acentuada à esquerda"],
        required: true,
      },
      {
        id: "rugas-repouso",
        label: "Rugas em repouso",
        type: "choice",
        options: ["Ausentes", "Superficiais", "Moderadas", "Profundas"],
      },
      {
        id: "resposta-anterior",
        label: "Resposta em sessões anteriores",
        type: "choice",
        options: ["Primeira aplicação", "Resposta esperada", "Duração curta", "Duração longa", "Resposta parcial"],
      },
      objetivoField(["Suavizar movimento", "Bloquear movimento", "Elevar/reposicionar", "Corrigir assimetria"]),
      observacoesField,
    ],
    regions: [
      { id: "frontal", name: "Frontal", description: "Linhas horizontais e sustentação da sobrancelha" },
      {
        id: "glabela",
        name: "Glabela",
        description: "Corrugador, prócero e depressor do supercílio",
        extraFields: [
          {
            id: "padrao-glabelar",
            label: "Padrão glabelar",
            help: "Classificação clássica do padrão de contração glabelar.",
            type: "choice",
            options: ["U", "V", "Ômega", "Ômega invertido", "Converging arrows"],
          },
        ],
      },
      { id: "periorbital", name: "Periorbital", description: "Orbicular dos olhos · linhas de expressão laterais" },
      { id: "nasal", name: "Dorso nasal", description: "Nasal transverso · bunny lines" },
      { id: "labio-superior", name: "Lábio superior", description: "Lip flip e sorriso gengival" },
      { id: "mento", name: "Mento", description: "Mentual · aspecto de casca de laranja" },
      { id: "masseter", name: "Masseter", description: "Hipertrofia, bruxismo e contorno mandibular" },
      { id: "platisma", name: "Platisma", description: "Bandas cervicais e definição do contorno" },
    ],
  },
  {
    id: "preenchimento",
    name: "Preenchimento",
    subtitle: "Avaliação de volume e suporte",
    description:
      "Registre perda de volume, qualidade tecidual e vetor pretendido antes de escolher produto e plano.",
    fields: [
      {
        id: "perda-volume",
        label: "Perda de volume",
        help: "Compare com fotos anteriores sempre que possível.",
        type: "scale",
        scaleLabels: ["Discreta", "Severa"],
        required: true,
      },
      {
        id: "qualidade-pele",
        label: "Qualidade da pele",
        type: "choice",
        options: ["Firme", "Levemente flácida", "Flácida", "Muito flácida"],
        required: true,
      },
      {
        id: "assimetria",
        label: "Assimetria",
        type: "choice",
        options: ["Sem assimetria", "Leve à direita", "Leve à esquerda", "Acentuada à direita", "Acentuada à esquerda"],
        required: true,
      },
      {
        id: "plano-pretendido",
        label: "Plano de aplicação pretendido",
        type: "choice",
        options: ["Supraperiosteal", "Subcutâneo profundo", "Subcutâneo superficial", "Intradérmico"],
      },
      {
        id: "vetor",
        label: "Vetor pretendido",
        type: "choice",
        options: ["Vertical (elevação)", "Horizontal (projeção)", "Oblíquo", "Suporte estrutural"],
      },
      {
        id: "restricoes",
        label: "Pontos de atenção anatômicos",
        help: "Marque o que exige cuidado redobrado nesta região.",
        type: "multi",
        options: [
          "Proximidade vascular",
          "Preenchimento prévio no local",
          "Cicatriz ou fibrose",
          "Histórico de edema",
          "Pele muito fina",
        ],
      },
      objetivoField(["Repor volume", "Projetar", "Definir contorno", "Hidratar e melhorar textura", "Corrigir assimetria"]),
      observacoesField,
    ],
    regions: [
      { id: "malar", name: "Malar", description: "Projeção zigomática e suporte do terço médio" },
      { id: "sulco-nasogeniano", name: "Sulco nasogeniano", description: "Sulco naso-labial e transição do terço médio" },
      { id: "labios", name: "Lábios", description: "Volume, contorno e definição do arco de cupido" },
      { id: "mandibula", name: "Mandíbula", description: "Contorno mandibular e ângulo goníaco" },
      { id: "mento", name: "Mento", description: "Projeção e harmonia do perfil" },
      { id: "olheira", name: "Olheira", description: "Sulco lacrimal e transição pálpebra-malar" },
      { id: "temporal", name: "Têmporas", description: "Reposição de volume da fossa temporal" },
      { id: "nariz", name: "Nariz", description: "Dorso, ponta e ângulo nasolabial" },
    ],
  },
  {
    id: "bioestimulador",
    name: "Bioestimulador",
    subtitle: "Avaliação de flacidez e resposta tecidual",
    description:
      "Organize grau de flacidez, espessura do tecido e expectativa de resposta ao longo do protocolo.",
    fields: [
      {
        id: "grau-flacidez",
        label: "Grau de flacidez",
        type: "scale",
        scaleLabels: ["Discreta", "Severa"],
        required: true,
      },
      {
        id: "espessura-tecido",
        label: "Espessura do tecido",
        type: "choice",
        options: ["Fino", "Intermediário", "Espesso"],
        required: true,
      },
      {
        id: "qualidade-colageno",
        label: "Sinais de perda de colágeno",
        type: "multi",
        options: [
          "Perda de firmeza ao toque",
          "Rugas finas em repouso",
          "Poros dilatados",
          "Textura irregular",
          "Fotoenvelhecimento",
        ],
      },
      {
        id: "sessoes-previstas",
        label: "Sessões previstas no protocolo",
        type: "choice",
        options: ["1 sessão", "2 sessões", "3 sessões", "4 sessões ou mais"],
        required: true,
      },
      {
        id: "intervalo",
        label: "Intervalo entre sessões",
        type: "choice",
        options: ["30 dias", "45 dias", "60 dias", "90 dias"],
      },
      {
        id: "expectativa",
        label: "Expectativa da paciente",
        help: "Alinhar expectativa é parte do planejamento — bioestimulador tem resposta gradual.",
        type: "choice",
        options: ["Alinhada com o método", "Espera resultado imediato", "Insegura", "Muito exigente"],
        required: true,
      },
      objetivoField(["Melhorar firmeza", "Melhorar qualidade da pele", "Sustentar contorno", "Prevenção"]),
      observacoesField,
    ],
    regions: [
      { id: "terco-medio", name: "Terço médio", description: "Região malar e transição para o terço inferior" },
      { id: "terco-inferior", name: "Terço inferior", description: "Contorno mandibular e região jugal" },
      { id: "pescoco", name: "Pescoço", description: "Flacidez cervical e bandas platismais" },
      { id: "colo", name: "Colo", description: "Rugas verticais e qualidade de pele" },
      { id: "bracos", name: "Braços", description: "Flacidez de face interna" },
      { id: "gluteo", name: "Glúteo", description: "Firmeza e textura da pele" },
    ],
  },
]

export const facialThirds = [
  {
    id: "superior",
    name: "Terço superior",
    detail: "Frontal, glabela e periorbital",
  },
  {
    id: "medio",
    name: "Terço médio",
    detail: "Malar, olheira, nariz e têmporas",
  },
  {
    id: "inferior",
    name: "Terço inferior",
    detail: "Lábios, mento, mandíbula e masseter",
  },
]
