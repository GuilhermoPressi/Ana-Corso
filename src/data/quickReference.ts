/**
 * Referência de bolso para consultar durante o atendimento.
 *
 * Mesma regra do resto do sistema: descreve anatomia, sinais e conduta geral —
 * nunca dose. Quantidade continua sendo decisão da profissional.
 */
export type QuickFact = { label: string; value: string }

export type QuickTable = { headers: string[]; rows: string[][] }

export type QuickEntry = {
  id: string
  title: string
  category: "Anatomia" | "Diluição" | "Segurança" | "Produtos" | "Conduta"
  keywords: string[]
  summary: string
  facts?: QuickFact[]
  table?: QuickTable
  warning?: string
}

export const quickCategories = ["Anatomia", "Diluição", "Segurança", "Produtos", "Conduta"] as const

export const quickReference: QuickEntry[] = [
  {
    id: "masseter",
    title: "Masseter",
    category: "Anatomia",
    keywords: ["masseter", "bruxismo", "mandibula", "contorno", "hipertrofia", "toxina"],
    summary:
      "Músculo da mastigação. Aplicação no terço inferior afina o contorno e alivia bruxismo — o erro comum é subir demais e atingir o risório.",
    facts: [
      { label: "Delimitação", value: "Peça para a paciente cerrar os dentes e marque o ventre muscular" },
      { label: "Zona segura", value: "Abaixo da linha do lóbulo da orelha até o ângulo mandibular" },
      { label: "Plano", value: "Intramuscular profundo, agulha perpendicular" },
      { label: "Margem anterior", value: "Manter 1 cm da borda anterior para não atingir o risório" },
    ],
    warning:
      "Aplicação alta ou anterior demais pode causar sorriso assimétrico e dificuldade mastigatória. Efeito surge de forma progressiva ao longo de semanas.",
  },
  {
    id: "reconstituicao",
    title: "Reconstituição de toxina",
    category: "Diluição",
    keywords: ["reconstituicao", "diluicao", "soro", "toxina", "botox", "ui/ml", "concentracao"],
    summary:
      "Concentração resultante para um frasco de 100 UI, com soro fisiológico 0,9%. Diluições maiores espalham mais o produto.",
    table: {
      headers: ["Diluente", "Concentração", "Por 0,1 ml", "Por traço*"],
      rows: [
        ["1,0 ml", "100 UI/ml", "10,0 UI", "1,00 UI"],
        ["1,5 ml", "66,7 UI/ml", "6,7 UI", "0,67 UI"],
        ["2,0 ml", "50,0 UI/ml", "5,0 UI", "0,50 UI"],
        ["2,5 ml", "40,0 UI/ml", "4,0 UI", "0,40 UI"],
        ["4,0 ml", "25,0 UI/ml", "2,5 UI", "0,25 UI"],
        ["5,0 ml", "20,0 UI/ml", "2,0 UI", "0,20 UI"],
      ],
    },
    facts: [
      { label: "*Traço", value: "Seringa de insulina de 100 UI · cada traço equivale a 0,01 ml" },
      { label: "Reconstituição", value: "Injetar o diluente pela parede do frasco, sem agitar" },
      { label: "Validade após diluir", value: "Seguir a bula do fabricante e manter refrigerado" },
    ],
  },
  {
    id: "glabela",
    title: "Glabela · padrões de contração",
    category: "Anatomia",
    keywords: ["glabela", "corrugador", "procero", "padrao", "u", "v", "omega", "toxina"],
    summary:
      "O padrão de contração muda o desenho da aplicação. Identifique pedindo para a paciente franzir com força.",
    table: {
      headers: ["Padrão", "Como se apresenta"],
      rows: [
        ["U", "Corrugadores dominam, linhas verticais paralelas"],
        ["V", "Prócero mais ativo, convergência para o centro"],
        ["Ômega", "Corrugadores e prócero, com elevação medial"],
        ["Ômega invertido", "Depressor do supercílio predominante"],
        ["Converging arrows", "Corrugadores muito fortes com fibras oblíquas"],
      ],
    },
    warning:
      "Região com risco vascular: a artéria supratroclear passa pela glabela. Aspirar antes de injetar e evitar bolus.",
  },
  {
    id: "zonas-risco",
    title: "Zonas de risco vascular",
    category: "Segurança",
    keywords: ["risco", "vascular", "necrose", "cegueira", "arteria", "preenchimento", "seguranca"],
    summary:
      "Regiões onde o preenchimento exige mais cuidado com o vaso — aspirar, injetar devagar e preferir cânula quando possível.",
    table: {
      headers: ["Região", "Vaso principal", "Cuidado"],
      rows: [
        ["Glabela", "Supratroclear", "Maior risco de cegueira · plano superficial, sem bolus"],
        ["Nariz", "Dorsal nasal / angular", "Injeção lenta, pequenos volumes, plano supraperiosteal"],
        ["Sulco nasogeniano", "Angular", "Preferir cânula, aspirar sempre"],
        ["Sulco lacrimal", "Infraorbitária", "Plano profundo, volumes mínimos"],
        ["Têmpora", "Temporal superficial", "Supraperiosteal, contato com o osso"],
        ["Lábios", "Labial superior/inferior", "Retroinjeção, evitar plano muito profundo"],
      ],
    },
  },
  {
    id: "intercorrencia-vascular",
    title: "Suspeita de oclusão vascular",
    category: "Conduta",
    keywords: ["oclusao", "vascular", "necrose", "hialuronidase", "emergencia", "intercorrencia", "dor"],
    summary:
      "Reconhecer cedo muda o desfecho. Interrompa a aplicação ao primeiro sinal e inicie a conduta imediatamente.",
    facts: [
      { label: "Sinais imediatos", value: "Dor desproporcional, palidez (blanching) e reticulado violáceo" },
      { label: "Sinais tardios", value: "Dor persistente, bolhas, escurecimento da pele" },
      { label: "Conduta", value: "Parar a injeção, massagear, calor local e hialuronidase conforme protocolo" },
      { label: "Alerta ocular", value: "Dor ocular ou alteração visual exige encaminhamento imediato" },
    ],
    warning:
      "Este é um resumo de reconhecimento. Siga o protocolo da sua clínica e mantenha hialuronidase disponível em todo atendimento com ácido hialurônico.",
  },
  {
    id: "bioestimuladores",
    title: "Bioestimuladores · comparativo",
    category: "Produtos",
    keywords: ["bioestimulador", "sculptra", "radiesse", "colageno", "plla", "carn", "comparativo"],
    summary: "Como cada bioestimulador se comporta em estímulo, resposta e intervalo entre sessões.",
    table: {
      headers: ["Produto", "Composição", "Resposta", "Intervalo usual"],
      rows: [
        ["Sculptra", "Ácido poli-L-lático", "Gradual, sem efeito de volume imediato", "45 a 60 dias"],
        ["Radiesse", "Hidroxiapatita de cálcio", "Efeito imediato de suporte + estímulo", "60 a 90 dias"],
        ["Ellansé", "Policaprolactona", "Suporte imediato e estímulo prolongado", "Conforme linha"],
      ],
    },
    facts: [
      { label: "Sculptra", value: "Orientar massagem no pós, conforme protocolo do fabricante" },
      { label: "Radiesse", value: "Diluição altera a finalidade — mais diluído estimula, menos diluído projeta" },
    ],
  },
  {
    id: "contraindicacoes-toxina",
    title: "Contraindicações da toxina",
    category: "Segurança",
    keywords: ["contraindicacao", "toxina", "gestante", "miastenia", "alergia", "amamentacao"],
    summary: "Checar antes de qualquer aplicação, mesmo em paciente antiga.",
    facts: [
      { label: "Absolutas", value: "Gestação, amamentação, doenças neuromusculares (miastenia gravis, ELA)" },
      { label: "Absolutas", value: "Hipersensibilidade à toxina ou à albumina, infecção ativa no local" },
      { label: "Relativas", value: "Uso de aminoglicosídeos, doenças autoimunes descompensadas" },
      { label: "Adiar", value: "Quadro febril, procedimento odontológico recente, evento importante em 15 dias" },
    ],
  },
  {
    id: "skinbooster",
    title: "Skinbooster · técnica",
    category: "Anatomia",
    keywords: ["skinbooster", "hidratacao", "papula", "microbolus", "profundidade", "espacamento"],
    summary: "Hidratação dérmica com distribuição uniforme — o resultado depende mais da técnica que do volume.",
    facts: [
      { label: "Plano", value: "Derme média a profunda" },
      { label: "Técnica", value: "Micropápulas ou microbolus, distribuídos em malha" },
      { label: "Espaçamento", value: "Cerca de 1 cm entre pontos, evitando sobreposição" },
      { label: "Pós-imediato", value: "Pápulas visíveis por até 24 h — avisar a paciente antes" },
    ],
  },
  {
    id: "fitzpatrick",
    title: "Fototipos de Fitzpatrick",
    category: "Anatomia",
    keywords: ["fototipo", "fitzpatrick", "pele", "hiperpigmentacao", "laser", "peeling"],
    summary: "Classificação que orienta risco de hiperpigmentação pós-inflamatória em procedimentos ablativos.",
    table: {
      headers: ["Fototipo", "Característica", "Risco de HPI"],
      rows: [
        ["I", "Pele muito clara, sempre queima", "Baixo"],
        ["II", "Clara, queima com facilidade", "Baixo"],
        ["III", "Morena clara, queima moderadamente", "Moderado"],
        ["IV", "Morena, raramente queima", "Moderado a alto"],
        ["V", "Morena escura, quase não queima", "Alto"],
        ["VI", "Negra, nunca queima", "Alto"],
      ],
    },
  },
  {
    id: "pos-procedimento",
    title: "Orientações de pós-imediato",
    category: "Conduta",
    keywords: ["pos", "cuidado", "orientacao", "toxina", "preenchimento", "hematoma", "edema"],
    summary: "O que a paciente precisa ouvir antes de sair da sala.",
    facts: [
      { label: "Toxina · 4 h", value: "Não deitar, não massagear a região, evitar exercício intenso" },
      { label: "Preenchimento · 48 h", value: "Gelo intermitente, evitar calor, sauna e exercício pesado" },
      { label: "Todos", value: "Evitar álcool e anti-inflamatórios sem orientação nas primeiras 24 h" },
      { label: "Quando ligar", value: "Dor desproporcional, palidez, alteração visual ou febre" },
    ],
  },
]
