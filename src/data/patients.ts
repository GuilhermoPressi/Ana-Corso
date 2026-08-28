export type PatientStatus = "ativa" | "atencao" | "inativa"

export type ProcedureRecord = {
  id: string
  date: string
  procedure: string
  regions: string[]
  product: string
  lot?: string
  quantity: string
  professional: string
  value: number
  notes?: string
}

export type TimelineKind =
  | "procedimento"
  | "retorno"
  | "avaliacao"
  | "mensagem"
  | "foto"
  | "documento"
  | "financeiro"

export type TimelineEvent = {
  id: string
  date: string
  kind: TimelineKind
  title: string
  description: string
}

export type ReturnRecord = {
  id: string
  date: string
  reason: string
  status: "agendado" | "pendente" | "atrasado" | "concluido"
  note?: string
}

export type PhotoAngle =
  | "frontal"
  | "obliquo-direito"
  | "obliquo-esquerdo"
  | "perfil-direito"
  | "perfil-esquerdo"

export const photoAngleLabel: Record<PhotoAngle, string> = {
  frontal: "Frontal",
  "obliquo-direito": "45° direito",
  "obliquo-esquerdo": "45° esquerdo",
  "perfil-direito": "Perfil direito",
  "perfil-esquerdo": "Perfil esquerdo",
}

/** Grupos de enquadramento usados na galeria comparativa. */
export const photoAngleGroups: { id: string; label: string; angles: PhotoAngle[] }[] = [
  { id: "frontal", label: "Frontal", angles: ["frontal"] },
  { id: "obliquo", label: "45°", angles: ["obliquo-direito", "obliquo-esquerdo"] },
  { id: "perfil", label: "Perfil", angles: ["perfil-direito", "perfil-esquerdo"] },
]

export type PhotoRecord = {
  id: string
  date: string
  angle: PhotoAngle
  /** Momento do registro: "Antes · toxina", "30 dias", "Retorno de 15 dias"... */
  session: string
  consent: boolean
  src?: string
}

export type ProductUsage = {
  id: string
  product: string
  brand: string
  totalQuantity: string
  lastUse: string
  sessions: number
}

export type Patient = {
  id: string
  name: string
  birthDate: string
  phone: string
  email: string
  city: string
  since: string
  status: PatientStatus
  lastVisit: string
  nextReturn?: string
  totalSpent: number
  sessions: number
  ticket: number
  tags: string[]
  mainProcedure: string
  professional: string
  origin: "Instagram" | "Indicação" | "Google" | "WhatsApp" | "Presencial"
  skinType: string
  allergies: string
  observations: string
  procedures: ProcedureRecord[]
  timeline: TimelineEvent[]
  returns: ReturnRecord[]
  photos: PhotoRecord[]
  products: ProductUsage[]
}

export const patients: Patient[] = [
  {
    id: "p1",
    name: "Juliana Prado",
    birthDate: "1988-04-12",
    phone: "(51) 99812-4477",
    email: "juliana.prado@email.com",
    city: "Porto Alegre · RS",
    since: "2023-02-18",
    status: "ativa",
    lastVisit: "2026-08-24",
    nextReturn: "2026-09-08",
    totalSpent: 14200,
    sessions: 11,
    ticket: 1291,
    tags: ["Toxina", "Preenchimento", "Fidelizada"],
    mainProcedure: "Toxina botulínica",
    professional: "Dra. Ana Corso",
    origin: "Indicação",
    skinType: "Fototipo III · mista",
    allergies: "Nenhuma relatada",
    observations:
      "Musculatura frontal forte, prefere resultado natural. Trabalha com imagem e evita hematomas em semana de gravação.",
    procedures: [
      {
        id: "pr1",
        date: "2026-08-24",
        procedure: "Toxina botulínica",
        regions: ["Frontal", "Glabela", "Periorbital"],
        product: "Botox 100U · Allergan",
        lot: "BTX-4471",
        quantity: "42U",
        professional: "Dra. Ana Corso",
        value: 1800,
        notes: "Frontal 12U, glabela 20U, periorbital 10U. Musculatura forte no terço superior.",
      },
      {
        id: "pr2",
        date: "2026-05-02",
        procedure: "Preenchimento",
        regions: ["Sulco nasogeniano"],
        product: "Ácido hialurônico 1ml · Restylane",
        lot: "AH-2210",
        quantity: "1ml",
        professional: "Dra. Ana Corso",
        value: 2200,
        notes: "Técnica retroinjeção em plano profundo. Assimetria leve à direita corrigida.",
      },
      {
        id: "pr3",
        date: "2026-02-14",
        procedure: "Toxina botulínica",
        regions: ["Frontal", "Glabela"],
        product: "Botox 100U · Allergan",
        lot: "BTX-3980",
        quantity: "34U",
        professional: "Dra. Ana Corso",
        value: 1650,
      },
      {
        id: "pr4",
        date: "2025-10-08",
        procedure: "Skinbooster",
        regions: ["Face"],
        product: "Skinbooster Vital · Galderma",
        lot: "SB-1120",
        quantity: "2ml",
        professional: "Dra. Ana Corso",
        value: 1500,
      },
    ],
    timeline: [
      {
        id: "t1",
        date: "2026-08-24",
        kind: "procedimento",
        title: "Toxina botulínica · terço superior",
        description: "42U aplicadas em frontal, glabela e periorbital. Sem intercorrências.",
      },
      {
        id: "t2",
        date: "2026-08-24",
        kind: "financeiro",
        title: "Pagamento recebido",
        description: "R$ 1.800 · Cartão de crédito em 3x",
      },
      {
        id: "t3",
        date: "2026-08-20",
        kind: "mensagem",
        title: "Confirmação de agendamento",
        description: "Paciente confirmou pelo WhatsApp o horário de 08:30.",
      },
      {
        id: "t4",
        date: "2026-05-17",
        kind: "retorno",
        title: "Retorno de 15 dias",
        description: "Preenchimento integrado, sem nódulos. Paciente satisfeita.",
      },
      {
        id: "t5",
        date: "2026-05-02",
        kind: "foto",
        title: "Fotos antes e depois registradas",
        description: "3 ângulos padronizados com consentimento assinado.",
      },
      {
        id: "t6",
        date: "2026-05-02",
        kind: "documento",
        title: "Termo de consentimento assinado",
        description: "Preenchimento com ácido hialurônico · assinatura digital.",
      },
      {
        id: "t7",
        date: "2026-02-10",
        kind: "avaliacao",
        title: "Avaliação facial completa",
        description: "Planejamento do terço superior e sulco nasogeniano.",
      },
    ],
    returns: [
      {
        id: "rt1",
        date: "2026-09-08",
        reason: "Retorno de 15 dias · toxina",
        status: "agendado",
        note: "Avaliar simetria do frontal e necessidade de retoque.",
      },
      {
        id: "rt2",
        date: "2026-05-17",
        reason: "Retorno de 15 dias · preenchimento",
        status: "concluido",
      },
      {
        id: "rt3",
        date: "2026-11-24",
        reason: "Nova sessão de toxina · 3 meses",
        status: "pendente",
      },
    ],
    photos: [
      { id: "ph1", date: "2026-02-14", angle: "frontal", session: "Antes · toxina", consent: true },
      { id: "ph2", date: "2026-02-14", angle: "obliquo-direito", session: "Antes · toxina", consent: true },
      { id: "ph3", date: "2026-05-02", angle: "frontal", session: "Antes · preenchimento", consent: true },
      { id: "ph4", date: "2026-05-02", angle: "obliquo-direito", session: "Antes · preenchimento", consent: true },
      { id: "ph5", date: "2026-05-02", angle: "perfil-direito", session: "Antes · preenchimento", consent: true },
      { id: "ph6", date: "2026-05-17", angle: "frontal", session: "Retorno de 15 dias", consent: true },
      { id: "ph7", date: "2026-05-17", angle: "obliquo-direito", session: "Retorno de 15 dias", consent: true },
      { id: "ph8", date: "2026-05-17", angle: "perfil-direito", session: "Retorno de 15 dias", consent: true },
      { id: "ph9", date: "2026-08-24", angle: "frontal", session: "Antes · toxina", consent: true },
    ],
    products: [
      {
        id: "pu1",
        product: "Botox 100U",
        brand: "Allergan",
        totalQuantity: "76U",
        lastUse: "2026-08-24",
        sessions: 2,
      },
      {
        id: "pu2",
        product: "Ácido hialurônico 1ml",
        brand: "Restylane",
        totalQuantity: "1ml",
        lastUse: "2026-05-02",
        sessions: 1,
      },
      {
        id: "pu3",
        product: "Skinbooster Vital",
        brand: "Galderma",
        totalQuantity: "2ml",
        lastUse: "2025-10-08",
        sessions: 1,
      },
    ],
  },
  {
    id: "p2",
    name: "Beatriz Almeida",
    birthDate: "1993-09-30",
    phone: "(51) 99745-1120",
    email: "bia.almeida@email.com",
    city: "Canoas · RS",
    since: "2024-06-05",
    status: "atencao",
    lastVisit: "2026-08-09",
    nextReturn: "2026-08-24",
    totalSpent: 6800,
    sessions: 5,
    ticket: 1360,
    tags: ["Toxina", "Retorno hoje"],
    mainProcedure: "Toxina botulínica",
    professional: "Dra. Ana Corso",
    origin: "Instagram",
    skinType: "Fototipo II · seca",
    allergies: "Alergia a lidocaína",
    observations: "Sensibilidade alta à dor. Usar anestésico tópico com 30 min de antecedência.",
    procedures: [
      {
        id: "pr5",
        date: "2026-08-09",
        procedure: "Toxina botulínica",
        regions: ["Glabela", "Frontal"],
        product: "Dysport 300U · Ipsen",
        lot: "DYS-8812",
        quantity: "60U",
        professional: "Dra. Ana Corso",
        value: 1700,
        notes: "Primeira aplicação com Dysport. Avaliar resposta no retorno.",
      },
      {
        id: "pr6",
        date: "2026-03-21",
        procedure: "Microagulhamento",
        regions: ["Face"],
        product: "Dermapen · 1.0mm",
        quantity: "1 sessão",
        professional: "Est. Marcela Reis",
        value: 650,
      },
    ],
    timeline: [
      {
        id: "t8",
        date: "2026-08-09",
        kind: "procedimento",
        title: "Toxina botulínica · glabela e frontal",
        description: "60U de Dysport. Anestésico tópico aplicado previamente.",
      },
      {
        id: "t9",
        date: "2026-08-10",
        kind: "mensagem",
        title: "Contato de pós-procedimento D+1",
        description: "Paciente relatou leve cefaleia, orientada e tranquilizada.",
      },
      {
        id: "t10",
        date: "2026-03-21",
        kind: "procedimento",
        title: "Microagulhamento facial",
        description: "Sessão única com Dermapen 1.0mm.",
      },
    ],
    returns: [
      {
        id: "rt4",
        date: "2026-08-24",
        reason: "Retorno de 15 dias · toxina",
        status: "atrasado",
        note: "Paciente não respondeu às duas últimas mensagens.",
      },
    ],
    photos: [
      { id: "ph10", date: "2026-08-09", angle: "frontal", session: "Antes · toxina", consent: true },
    ],
    products: [
      { id: "pu4", product: "Dysport 300U", brand: "Ipsen", totalQuantity: "60U", lastUse: "2026-08-09", sessions: 1 },
    ],
  },
  {
    id: "p3",
    name: "Marina Bittencourt",
    birthDate: "1990-01-24",
    phone: "(51) 99333-8890",
    email: "marina.b@email.com",
    city: "Porto Alegre · RS",
    since: "2022-11-11",
    status: "ativa",
    lastVisit: "2026-08-24",
    nextReturn: "2026-09-24",
    totalSpent: 21600,
    sessions: 16,
    ticket: 1350,
    tags: ["Preenchimento", "Lábios", "VIP"],
    mainProcedure: "Preenchimento labial",
    professional: "Dra. Ana Corso",
    origin: "Indicação",
    skinType: "Fototipo IV · normal",
    allergies: "Nenhuma relatada",
    observations: "Busca volume moderado com definição de contorno. Histórico de assimetria labial à esquerda.",
    procedures: [
      {
        id: "pr7",
        date: "2026-08-24",
        procedure: "Preenchimento labial",
        regions: ["Lábio superior", "Lábio inferior"],
        product: "Juvéderm Volift 1ml · Allergan",
        lot: "JV-5540",
        quantity: "1ml",
        professional: "Dra. Ana Corso",
        value: 2400,
        notes: "0,6ml no inferior e 0,4ml no superior. Compensação da assimetria à esquerda.",
      },
      {
        id: "pr8",
        date: "2026-02-28",
        procedure: "Bioestimulador de colágeno",
        regions: ["Terço médio", "Mandíbula"],
        product: "Sculptra · Galderma",
        lot: "SC-7712",
        quantity: "2 frascos",
        professional: "Dra. Ana Corso",
        value: 3400,
      },
    ],
    timeline: [
      {
        id: "t11",
        date: "2026-08-24",
        kind: "procedimento",
        title: "Preenchimento labial · 1ml",
        description: "Volift com técnica de retroinjeção. Contorno preservado.",
      },
      {
        id: "t12",
        date: "2026-02-28",
        kind: "procedimento",
        title: "Bioestimulador · 2 frascos",
        description: "Sculptra em terço médio e mandíbula. Massagem orientada por 5 dias.",
      },
    ],
    returns: [
      { id: "rt5", date: "2026-09-24", reason: "Avaliação de 30 dias · lábios", status: "agendado" },
    ],
    photos: [
      { id: "ph11", date: "2026-02-28", angle: "frontal", session: "Antes · bioestimulador", consent: true },
      { id: "ph12", date: "2026-02-28", angle: "obliquo-esquerdo", session: "Antes · bioestimulador", consent: true },
      { id: "ph13", date: "2026-05-30", angle: "frontal", session: "90 dias", consent: true },
      { id: "ph14", date: "2026-05-30", angle: "obliquo-esquerdo", session: "90 dias", consent: true },
      { id: "ph15", date: "2026-08-24", angle: "frontal", session: "Antes · lábios", consent: true },
    ],
    products: [
      { id: "pu5", product: "Juvéderm Volift", brand: "Allergan", totalQuantity: "1ml", lastUse: "2026-08-24", sessions: 1 },
      { id: "pu6", product: "Sculptra", brand: "Galderma", totalQuantity: "2 frascos", lastUse: "2026-02-28", sessions: 1 },
    ],
  },
  {
    id: "p4",
    name: "Fernanda Rocha",
    birthDate: "1985-07-19",
    phone: "(51) 99120-3344",
    email: "fernanda.rocha@email.com",
    city: "Porto Alegre · RS",
    since: "2025-01-22",
    status: "ativa",
    lastVisit: "2026-08-24",
    nextReturn: "2026-10-24",
    totalSpent: 9600,
    sessions: 4,
    ticket: 2400,
    tags: ["Bioestimulador", "Protocolo em andamento"],
    mainProcedure: "Bioestimulador de colágeno",
    professional: "Dra. Ana Corso",
    origin: "Google",
    skinType: "Fototipo III · normal",
    allergies: "Nenhuma relatada",
    observations: "Flacidez moderada em terço inferior. Protocolo de 3 sessões com intervalo de 60 dias.",
    procedures: [
      {
        id: "pr9",
        date: "2026-08-24",
        procedure: "Bioestimulador de colágeno",
        regions: ["Terço inferior", "Mandíbula"],
        product: "Radiesse · Merz",
        lot: "RD-9902",
        quantity: "1,5ml diluído",
        professional: "Dra. Ana Corso",
        value: 3200,
        notes: "Primeira sessão do protocolo de 3. Diluição 1:1 com lidocaína.",
      },
    ],
    timeline: [
      {
        id: "t13",
        date: "2026-08-24",
        kind: "procedimento",
        title: "Bioestimulador · 1ª sessão",
        description: "Radiesse diluído em terço inferior e mandíbula.",
      },
      {
        id: "t14",
        date: "2026-08-18",
        kind: "avaliacao",
        title: "Avaliação e planejamento facial",
        description: "Definido protocolo de 3 sessões com intervalo de 60 dias.",
      },
    ],
    returns: [
      { id: "rt6", date: "2026-10-24", reason: "Bioestimulador · 2ª sessão", status: "agendado" },
    ],
    photos: [
      { id: "ph16", date: "2026-08-24", angle: "perfil-direito", session: "Antes · bioestimulador", consent: true },
      { id: "ph17", date: "2026-08-24", angle: "frontal", session: "Antes · bioestimulador", consent: true },
    ],
    products: [
      { id: "pu7", product: "Radiesse", brand: "Merz", totalQuantity: "1,5ml", lastUse: "2026-08-24", sessions: 1 },
    ],
  },
  {
    id: "p5",
    name: "Larissa Menezes",
    birthDate: "1996-03-08",
    phone: "(51) 99887-2201",
    email: "larissa.menezes@email.com",
    city: "Gravataí · RS",
    since: "2025-09-14",
    status: "atencao",
    lastVisit: "2026-06-20",
    nextReturn: "2026-08-20",
    totalSpent: 4300,
    sessions: 3,
    ticket: 1433,
    tags: ["Bioestimulador", "Retorno atrasado"],
    mainProcedure: "Bioestimulador de colágeno",
    professional: "Dra. Ana Corso",
    origin: "Instagram",
    skinType: "Fototipo II · oleosa",
    allergies: "Nenhuma relatada",
    observations: "Protocolo interrompido na 1ª sessão. Alegou questão financeira no último contato.",
    procedures: [
      {
        id: "pr10",
        date: "2026-06-20",
        procedure: "Bioestimulador de colágeno",
        regions: ["Terço médio"],
        product: "Sculptra · Galderma",
        lot: "SC-8120",
        quantity: "1 frasco",
        professional: "Dra. Ana Corso",
        value: 2300,
      },
    ],
    timeline: [
      {
        id: "t15",
        date: "2026-08-12",
        kind: "mensagem",
        title: "Tentativa de reagendamento",
        description: "Mensagem enviada sem resposta há 12 dias.",
      },
      {
        id: "t16",
        date: "2026-06-20",
        kind: "procedimento",
        title: "Bioestimulador · 1ª sessão",
        description: "Sculptra em terço médio.",
      },
    ],
    returns: [
      { id: "rt7", date: "2026-08-20", reason: "Bioestimulador · 2ª sessão", status: "atrasado", note: "4 dias de atraso." },
    ],
    photos: [],
    products: [
      { id: "pu8", product: "Sculptra", brand: "Galderma", totalQuantity: "1 frasco", lastUse: "2026-06-20", sessions: 1 },
    ],
  },
  {
    id: "p6",
    name: "Camila Duarte",
    birthDate: "1991-11-02",
    phone: "(51) 99441-7788",
    email: "camila.duarte@email.com",
    city: "Porto Alegre · RS",
    since: "2024-03-30",
    status: "ativa",
    lastVisit: "2026-08-24",
    nextReturn: "2026-09-21",
    totalSpent: 11200,
    sessions: 9,
    ticket: 1244,
    tags: ["Skinbooster", "Fidelizada"],
    mainProcedure: "Skinbooster",
    professional: "Est. Marcela Reis",
    origin: "Indicação",
    skinType: "Fototipo III · desidratada",
    allergies: "Nenhuma relatada",
    observations: "Faz manutenção trimestral. Queixa principal é textura e viço da pele.",
    procedures: [
      {
        id: "pr11",
        date: "2026-08-24",
        procedure: "Skinbooster",
        regions: ["Face", "Pescoço"],
        product: "Skinbooster Vital · Galderma",
        lot: "SB-2240",
        quantity: "2ml",
        professional: "Est. Marcela Reis",
        value: 1600,
      },
    ],
    timeline: [
      {
        id: "t17",
        date: "2026-08-24",
        kind: "procedimento",
        title: "Skinbooster · face e pescoço",
        description: "2ml distribuídos em pápulas. Sem intercorrências.",
      },
    ],
    returns: [{ id: "rt8", date: "2026-09-21", reason: "Skinbooster · 2ª sessão", status: "agendado" }],
    photos: [
      { id: "ph18", date: "2026-08-24", angle: "frontal", session: "Antes · skinbooster", consent: true },
    ],
    products: [
      { id: "pu9", product: "Skinbooster Vital", brand: "Galderma", totalQuantity: "8ml", lastUse: "2026-08-24", sessions: 4 },
    ],
  },
  {
    id: "p7",
    name: "Sofia Ribeiro",
    birthDate: "1987-05-27",
    phone: "(51) 99664-0912",
    email: "sofia.ribeiro@email.com",
    city: "Viamão · RS",
    since: "2023-08-02",
    status: "atencao",
    lastVisit: "2026-07-14",
    nextReturn: "2026-08-13",
    totalSpent: 8900,
    sessions: 6,
    ticket: 1483,
    tags: ["Preenchimento", "Retorno atrasado"],
    mainProcedure: "Preenchimento",
    professional: "Dra. Ana Corso",
    origin: "WhatsApp",
    skinType: "Fototipo IV · mista",
    allergies: "Nenhuma relatada",
    observations: "Retorno de 30 dias pendente há 11 dias. Prefere contato por telefone.",
    procedures: [
      {
        id: "pr12",
        date: "2026-07-14",
        procedure: "Preenchimento",
        regions: ["Malar"],
        product: "Juvéderm Voluma 1ml · Allergan",
        lot: "JV-6011",
        quantity: "2ml",
        professional: "Dra. Ana Corso",
        value: 3800,
      },
    ],
    timeline: [
      {
        id: "t18",
        date: "2026-07-14",
        kind: "procedimento",
        title: "Preenchimento malar · 2ml",
        description: "Voluma em plano supraperiosteal, 1ml de cada lado.",
      },
    ],
    returns: [
      { id: "rt9", date: "2026-08-13", reason: "Avaliação de 30 dias · malar", status: "atrasado", note: "11 dias de atraso." },
    ],
    photos: [
      { id: "ph19", date: "2026-07-14", angle: "obliquo-direito", session: "Antes · malar", consent: true },
    ],
    products: [
      { id: "pu10", product: "Juvéderm Voluma", brand: "Allergan", totalQuantity: "2ml", lastUse: "2026-07-14", sessions: 1 },
    ],
  },
  {
    id: "p8",
    name: "Renata Nogueira",
    birthDate: "1979-12-15",
    phone: "(51) 99201-5566",
    email: "renata.nogueira@email.com",
    city: "Porto Alegre · RS",
    since: "2026-08-10",
    status: "ativa",
    lastVisit: "2026-08-24",
    totalSpent: 0,
    sessions: 0,
    ticket: 0,
    tags: ["Primeira consulta"],
    mainProcedure: "Avaliação facial",
    professional: "Dra. Ana Corso",
    origin: "Instagram",
    skinType: "Fototipo II · seca",
    allergies: "A confirmar na anamnese",
    observations: "Primeira avaliação hoje às 15:30. Ainda não confirmou presença pelo WhatsApp.",
    procedures: [],
    timeline: [
      {
        id: "t19",
        date: "2026-08-10",
        kind: "mensagem",
        title: "Primeiro contato",
        description: "Lead vindo do Instagram, interesse em harmonização facial.",
      },
    ],
    returns: [],
    photos: [],
    products: [],
  },
  {
    id: "p9",
    name: "Patrícia Lemos",
    birthDate: "1983-02-04",
    phone: "(51) 99555-4433",
    email: "patricia.lemos@email.com",
    city: "Alvorada · RS",
    since: "2024-10-09",
    status: "ativa",
    lastVisit: "2026-08-24",
    nextReturn: "2026-11-24",
    totalSpent: 7400,
    sessions: 6,
    ticket: 1233,
    tags: ["Toxina", "Retoque"],
    mainProcedure: "Toxina botulínica",
    professional: "Dra. Ana Corso",
    origin: "Presencial",
    skinType: "Fototipo III · normal",
    allergies: "Nenhuma relatada",
    observations: "Retoque de 4U no frontal direito por assimetria residual.",
    procedures: [
      {
        id: "pr13",
        date: "2026-08-24",
        procedure: "Toxina botulínica · retoque",
        regions: ["Frontal direito"],
        product: "Botox 100U · Allergan",
        lot: "BTX-4471",
        quantity: "4U",
        professional: "Dra. Ana Corso",
        value: 600,
        notes: "Retoque sem custo de produto, cobrado apenas o procedimento.",
      },
    ],
    timeline: [
      {
        id: "t20",
        date: "2026-08-24",
        kind: "procedimento",
        title: "Retoque de toxina · frontal direito",
        description: "4U para correção de assimetria residual.",
      },
    ],
    returns: [{ id: "rt10", date: "2026-11-24", reason: "Nova sessão de toxina", status: "pendente" }],
    photos: [],
    products: [
      { id: "pu11", product: "Botox 100U", brand: "Allergan", totalQuantity: "58U", lastUse: "2026-08-24", sessions: 3 },
    ],
  },
  {
    id: "p10",
    name: "Helena Costa",
    birthDate: "1994-06-21",
    phone: "(51) 99878-1234",
    email: "helena.costa@email.com",
    city: "Porto Alegre · RS",
    since: "2025-04-17",
    status: "ativa",
    lastVisit: "2026-07-27",
    nextReturn: "2026-08-24",
    totalSpent: 5200,
    sessions: 4,
    ticket: 1300,
    tags: ["Skinbooster", "Retorno hoje"],
    mainProcedure: "Skinbooster",
    professional: "Est. Marcela Reis",
    origin: "Indicação",
    skinType: "Fototipo II · desidratada",
    allergies: "Nenhuma relatada",
    observations: "Terceira sessão do protocolo de skinbooster prevista para hoje.",
    procedures: [
      {
        id: "pr14",
        date: "2026-07-27",
        procedure: "Skinbooster",
        regions: ["Face"],
        product: "Skinbooster Vital · Galderma",
        lot: "SB-2240",
        quantity: "2ml",
        professional: "Est. Marcela Reis",
        value: 1400,
      },
    ],
    timeline: [
      {
        id: "t21",
        date: "2026-07-27",
        kind: "procedimento",
        title: "Skinbooster · 2ª sessão",
        description: "2ml em face. Boa resposta de hidratação.",
      },
    ],
    returns: [{ id: "rt11", date: "2026-08-24", reason: "Skinbooster · 3ª sessão", status: "pendente" }],
    photos: [
      { id: "ph20", date: "2026-04-20", angle: "frontal", session: "Antes · skinbooster", consent: true },
      { id: "ph21", date: "2026-07-27", angle: "frontal", session: "2ª sessão", consent: true },
    ],
    products: [
      { id: "pu12", product: "Skinbooster Vital", brand: "Galderma", totalQuantity: "6ml", lastUse: "2026-07-27", sessions: 3 },
    ],
  },
  {
    id: "p11",
    name: "Vanessa Antunes",
    birthDate: "1981-08-11",
    phone: "(51) 99310-7745",
    email: "vanessa.antunes@email.com",
    city: "Porto Alegre · RS",
    since: "2023-05-19",
    status: "inativa",
    lastVisit: "2025-11-06",
    totalSpent: 12900,
    sessions: 8,
    ticket: 1613,
    tags: ["Toxina", "Preenchimento", "Inativa"],
    mainProcedure: "Toxina botulínica",
    professional: "Dra. Ana Corso",
    origin: "Indicação",
    skinType: "Fototipo III · normal",
    allergies: "Nenhuma relatada",
    observations: "Sem retorno há mais de 9 meses. Última mensagem enviada em março, sem resposta.",
    procedures: [
      {
        id: "pr15",
        date: "2025-11-06",
        procedure: "Toxina botulínica",
        regions: ["Frontal", "Glabela", "Periorbital"],
        product: "Botox 100U · Allergan",
        lot: "BTX-3110",
        quantity: "46U",
        professional: "Dra. Ana Corso",
        value: 1900,
      },
    ],
    timeline: [
      {
        id: "t22",
        date: "2026-03-14",
        kind: "mensagem",
        title: "Campanha de reativação",
        description: "Mensagem enviada sem resposta.",
      },
      {
        id: "t23",
        date: "2025-11-06",
        kind: "procedimento",
        title: "Toxina botulínica · terço superior",
        description: "46U aplicadas. Última visita registrada.",
      },
    ],
    returns: [],
    photos: [],
    products: [
      { id: "pu13", product: "Botox 100U", brand: "Allergan", totalQuantity: "142U", lastUse: "2025-11-06", sessions: 4 },
    ],
  },
  {
    id: "p12",
    name: "Cristina Vasques",
    birthDate: "1976-10-03",
    phone: "(51) 99123-9987",
    email: "cristina.vasques@email.com",
    city: "Novo Hamburgo · RS",
    since: "2022-07-25",
    status: "inativa",
    lastVisit: "2025-09-18",
    totalSpent: 18400,
    sessions: 12,
    ticket: 1533,
    tags: ["Bioestimulador", "Alto valor", "Inativa"],
    mainProcedure: "Bioestimulador de colágeno",
    professional: "Dra. Ana Corso",
    origin: "Google",
    skinType: "Fototipo III · mista",
    allergies: "Nenhuma relatada",
    observations: "Paciente de alto valor histórico. Mudou de cidade, avaliar atendimento em dia concentrado.",
    procedures: [
      {
        id: "pr16",
        date: "2025-09-18",
        procedure: "Bioestimulador de colágeno",
        regions: ["Face", "Pescoço"],
        product: "Sculptra · Galderma",
        lot: "SC-6640",
        quantity: "2 frascos",
        professional: "Dra. Ana Corso",
        value: 3600,
      },
    ],
    timeline: [
      {
        id: "t24",
        date: "2025-09-18",
        kind: "procedimento",
        title: "Bioestimulador · face e pescoço",
        description: "2 frascos de Sculptra. Última visita registrada.",
      },
    ],
    returns: [],
    photos: [],
    products: [
      { id: "pu14", product: "Sculptra", brand: "Galderma", totalQuantity: "7 frascos", lastUse: "2025-09-18", sessions: 4 },
    ],
  },
  {
    id: "p13",
    name: "Adriana Vasconcelos",
    birthDate: "1984-03-22",
    phone: "(51) 99617-3382",
    email: "adriana.v@email.com",
    city: "Porto Alegre · RS",
    since: "2023-09-14",
    status: "atencao",
    lastVisit: "2026-03-12",
    totalSpent: 9200,
    sessions: 7,
    ticket: 1314,
    tags: ["Toxina", "Manutenção atrasada"],
    mainProcedure: "Toxina botulínica",
    professional: "Dra. Ana Corso",
    origin: "Indicação",
    skinType: "Fototipo III · normal",
    allergies: "Nenhuma relatada",
    observations: "Fazia manutenção a cada 4 meses com regularidade. Última aplicação em março.",
    procedures: [
      {
        id: "pr17",
        date: "2026-03-12",
        procedure: "Toxina botulínica",
        regions: ["Frontal", "Glabela", "Periorbital"],
        product: "Botox 100U · Allergan",
        lot: "BTX-4102",
        quantity: "44U",
        professional: "Dra. Ana Corso",
        value: 1850,
      },
    ],
    timeline: [
      {
        id: "t25",
        date: "2026-03-12",
        kind: "procedimento",
        title: "Toxina botulínica · terço superior",
        description: "44U aplicadas. Última visita registrada.",
      },
    ],
    returns: [],
    photos: [],
    products: [
      { id: "pu15", product: "Botox 100U", brand: "Allergan", totalQuantity: "298U", lastUse: "2026-03-12", sessions: 7 },
    ],
  },
  {
    id: "p14",
    name: "Michele Prado",
    birthDate: "1990-07-09",
    phone: "(51) 99248-7710",
    email: "michele.prado@email.com",
    city: "Cachoeirinha · RS",
    since: "2024-01-30",
    status: "atencao",
    lastVisit: "2026-02-20",
    totalSpent: 6400,
    sessions: 5,
    ticket: 1280,
    tags: ["Toxina", "Manutenção atrasada"],
    mainProcedure: "Toxina botulínica",
    professional: "Dra. Ana Corso",
    origin: "Instagram",
    skinType: "Fototipo II · mista",
    allergies: "Nenhuma relatada",
    observations: "Sumiu depois da última aplicação. Costumava responder rápido no WhatsApp.",
    procedures: [
      {
        id: "pr18",
        date: "2026-02-20",
        procedure: "Toxina botulínica",
        regions: ["Frontal", "Glabela"],
        product: "Botox 100U · Allergan",
        lot: "BTX-3980",
        quantity: "36U",
        professional: "Dra. Ana Corso",
        value: 1650,
      },
    ],
    timeline: [
      {
        id: "t26",
        date: "2026-02-20",
        kind: "procedimento",
        title: "Toxina botulínica · terço superior",
        description: "36U aplicadas. Última visita registrada.",
      },
    ],
    returns: [],
    photos: [],
    products: [
      { id: "pu16", product: "Botox 100U", brand: "Allergan", totalQuantity: "180U", lastUse: "2026-02-20", sessions: 5 },
    ],
  },
  {
    id: "p15",
    name: "Gabriela Sanches",
    birthDate: "1987-11-16",
    phone: "(51) 99530-4419",
    email: "gabi.sanches@email.com",
    city: "Porto Alegre · RS",
    since: "2022-05-08",
    status: "ativa",
    lastVisit: "2026-04-02",
    nextReturn: "2026-08-30",
    totalSpent: 11800,
    sessions: 9,
    ticket: 1311,
    tags: ["Toxina", "Preenchimento", "Fidelizada"],
    mainProcedure: "Toxina botulínica",
    professional: "Dra. Ana Corso",
    origin: "Indicação",
    skinType: "Fototipo III · mista",
    allergies: "Nenhuma relatada",
    observations: "Cliente antiga e fiel. Deve estar próxima de sentir o efeito ceder.",
    procedures: [
      {
        id: "pr19",
        date: "2026-04-02",
        procedure: "Toxina botulínica",
        regions: ["Frontal", "Glabela", "Periorbital"],
        product: "Botox 100U · Allergan",
        lot: "BTX-4102",
        quantity: "40U",
        professional: "Dra. Ana Corso",
        value: 1780,
      },
    ],
    timeline: [
      {
        id: "t27",
        date: "2026-04-02",
        kind: "procedimento",
        title: "Toxina botulínica · terço superior",
        description: "40U aplicadas.",
      },
    ],
    returns: [
      { id: "rt12", date: "2026-08-30", reason: "Nova sessão de toxina · 5 meses", status: "pendente" },
    ],
    photos: [],
    products: [
      { id: "pu17", product: "Botox 100U", brand: "Allergan", totalQuantity: "356U", lastUse: "2026-04-02", sessions: 9 },
    ],
  },
  {
    id: "p16",
    name: "Luciana Reis",
    birthDate: "1978-09-05",
    phone: "(51) 99804-2265",
    email: "luciana.reis@email.com",
    city: "Porto Alegre · RS",
    since: "2023-03-19",
    status: "inativa",
    lastVisit: "2025-12-15",
    totalSpent: 7300,
    sessions: 6,
    ticket: 1217,
    tags: ["Preenchimento", "Inativa"],
    mainProcedure: "Preenchimento",
    professional: "Dra. Ana Corso",
    origin: "Google",
    skinType: "Fototipo IV · normal",
    allergies: "Nenhuma relatada",
    observations: "Sem contato desde dezembro. Vale tentar uma abordagem diferente.",
    procedures: [
      {
        id: "pr20",
        date: "2025-12-15",
        procedure: "Preenchimento",
        regions: ["Sulco nasogeniano"],
        product: "Restylane 1ml · Galderma",
        lot: "AH-1980",
        quantity: "1ml",
        professional: "Dra. Ana Corso",
        value: 2100,
      },
    ],
    timeline: [
      {
        id: "t28",
        date: "2025-12-15",
        kind: "procedimento",
        title: "Preenchimento · sulco nasogeniano",
        description: "1ml aplicado. Última visita registrada.",
      },
    ],
    returns: [],
    photos: [],
    products: [
      { id: "pu18", product: "Restylane 1ml", brand: "Galderma", totalQuantity: "3ml", lastUse: "2025-12-15", sessions: 3 },
    ],
  },
  {
    id: "p17",
    name: "Bruna Camargo",
    birthDate: "1995-05-28",
    phone: "(51) 99172-6634",
    email: "bruna.camargo@email.com",
    city: "Canoas · RS",
    since: "2025-02-11",
    status: "ativa",
    lastVisit: "2026-04-18",
    totalSpent: 5400,
    sessions: 4,
    ticket: 1350,
    tags: ["Toxina"],
    mainProcedure: "Toxina botulínica",
    professional: "Dra. Ana Corso",
    origin: "Instagram",
    skinType: "Fototipo II · oleosa",
    allergies: "Nenhuma relatada",
    observations: "Primeira manutenção deve estar chegando.",
    procedures: [
      {
        id: "pr21",
        date: "2026-04-18",
        procedure: "Toxina botulínica",
        regions: ["Frontal", "Glabela"],
        product: "Dysport 300U · Ipsen",
        lot: "DYS-8120",
        quantity: "50U",
        professional: "Dra. Ana Corso",
        value: 1600,
      },
    ],
    timeline: [
      {
        id: "t29",
        date: "2026-04-18",
        kind: "procedimento",
        title: "Toxina botulínica · terço superior",
        description: "50U de Dysport.",
      },
    ],
    returns: [],
    photos: [],
    products: [
      { id: "pu19", product: "Dysport 300U", brand: "Ipsen", totalQuantity: "190U", lastUse: "2026-04-18", sessions: 4 },
    ],
  },
]

export function getPatient(id: string) {
  return patients.find((patient) => patient.id === id)
}

export const patientStatusLabel: Record<PatientStatus, string> = {
  ativa: "Ativa",
  atencao: "Atenção",
  inativa: "Inativa",
}

export const procedureFilters = [
  "Todos os procedimentos",
  "Toxina botulínica",
  "Preenchimento",
  "Preenchimento labial",
  "Bioestimulador de colágeno",
  "Skinbooster",
  "Microagulhamento",
  "Avaliação facial",
]
