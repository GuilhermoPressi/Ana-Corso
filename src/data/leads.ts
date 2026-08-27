export type LeadStage =
  | "novos-contatos"
  | "avaliacao-agendada"
  | "proposta-enviada"
  | "fechado"
  | "perdido"

export type LeadSource = "Instagram" | "Indicação" | "Google" | "WhatsApp" | "Presencial"

export type Lead = {
  id: string
  name: string
  phone: string
  interest: string
  source: LeadSource
  stage: LeadStage
  /** Valor da proposta associada ao lead, em reais. */
  value: number
  createdAt: string
  lastContact: string
  owner: string
  temperature: "quente" | "morno" | "frio"
  note?: string
  /** Recontato programado pela automação de pós-procedimento. */
  scheduledFor?: string
}

export const leadStages: { id: LeadStage; label: string; hint: string; open: boolean }[] = [
  {
    id: "novos-contatos",
    label: "Novos contatos",
    hint: "Ainda sem retorno da clínica",
    open: true,
  },
  {
    id: "avaliacao-agendada",
    label: "Avaliação agendada",
    hint: "Data marcada na agenda",
    open: true,
  },
  {
    id: "proposta-enviada",
    label: "Proposta enviada",
    hint: "Aguardando decisão da paciente",
    open: true,
  },
  { id: "fechado", label: "Fechado", hint: "Virou paciente", open: false },
  { id: "perdido", label: "Perdido", hint: "Registrar o motivo ajuda a ajustar a oferta", open: false },
]

export const seedLeads: Lead[] = [
  {
    id: "l1",
    name: "Isabela Martins",
    phone: "(51) 99614-2208",
    interest: "Preenchimento labial",
    source: "Instagram",
    stage: "novos-contatos",
    value: 2400,
    createdAt: "2026-08-24",
    lastContact: "2026-08-24",
    owner: "Recepção",
    temperature: "quente",
    note: "Mandou mensagem hoje de manhã pedindo valores.",
  },
  {
    id: "l2",
    name: "Tatiane Freitas",
    phone: "(51) 99522-7741",
    interest: "Harmonização facial completa",
    source: "Indicação",
    stage: "novos-contatos",
    value: 5800,
    createdAt: "2026-08-24",
    lastContact: "2026-08-24",
    owner: "Recepção",
    temperature: "quente",
    note: "Indicada pela Marina Bittencourt.",
  },
  {
    id: "l3",
    name: "Vanessa Lopes",
    phone: "(51) 99188-3390",
    interest: "Toxina botulínica",
    source: "Google",
    stage: "novos-contatos",
    value: 1800,
    createdAt: "2026-08-24",
    lastContact: "2026-08-24",
    owner: "Recepção",
    temperature: "morno",
  },
  {
    id: "l4",
    name: "Aline Barbosa",
    phone: "(51) 99771-5502",
    interest: "Bioestimulador de colágeno",
    source: "WhatsApp",
    stage: "novos-contatos",
    value: 3200,
    createdAt: "2026-08-23",
    lastContact: "2026-08-23",
    owner: "Recepção",
    temperature: "frio",
    note: "Sem resposta desde ontem.",
  },
  {
    id: "l5",
    name: "Cláudia Ferrari",
    phone: "(51) 99340-1188",
    interest: "Bioestimulador + toxina",
    source: "Indicação",
    stage: "avaliacao-agendada",
    value: 6400,
    createdAt: "2026-08-19",
    lastContact: "2026-08-22",
    owner: "Dra. Ana Corso",
    temperature: "quente",
    note: "Avaliação marcada para 27/08 às 10h.",
  },
  {
    id: "l6",
    name: "Débora Nunes",
    phone: "(51) 99903-4471",
    interest: "Skinbooster",
    source: "Instagram",
    stage: "avaliacao-agendada",
    value: 1600,
    createdAt: "2026-08-20",
    lastContact: "2026-08-21",
    owner: "Est. Marcela Reis",
    temperature: "morno",
  },
  {
    id: "l7",
    name: "Priscila Andrade",
    phone: "(51) 99455-9081",
    interest: "Preenchimento malar",
    source: "Google",
    stage: "avaliacao-agendada",
    value: 3800,
    createdAt: "2026-08-18",
    lastContact: "2026-08-20",
    owner: "Dra. Ana Corso",
    temperature: "morno",
  },
  {
    id: "l8",
    name: "Mônica Salles",
    phone: "(51) 99287-6612",
    interest: "Protocolo completo de harmonização",
    source: "Indicação",
    stage: "proposta-enviada",
    value: 12800,
    createdAt: "2026-08-11",
    lastContact: "2026-08-21",
    owner: "Dra. Ana Corso",
    temperature: "quente",
    note: "Pediu para reavaliar o parcelamento.",
  },
  {
    id: "l9",
    name: "Roberta Lins",
    phone: "(51) 99612-3345",
    interest: "Toxina 3 regiões + skinbooster",
    source: "Instagram",
    stage: "proposta-enviada",
    value: 3400,
    createdAt: "2026-08-14",
    lastContact: "2026-08-19",
    owner: "Recepção",
    temperature: "morno",
  },
  {
    id: "l10",
    name: "Eliane Duarte",
    phone: "(51) 99730-2214",
    interest: "Bioestimulador · protocolo de 3 sessões",
    source: "WhatsApp",
    stage: "proposta-enviada",
    value: 8700,
    createdAt: "2026-08-08",
    lastContact: "2026-08-16",
    owner: "Dra. Ana Corso",
    temperature: "frio",
    note: "Sem retorno há 8 dias.",
  },
  {
    id: "l11",
    name: "Carla Mendonça",
    phone: "(51) 99841-7723",
    interest: "Preenchimento labial",
    source: "Indicação",
    stage: "fechado",
    value: 2400,
    createdAt: "2026-08-05",
    lastContact: "2026-08-15",
    owner: "Dra. Ana Corso",
    temperature: "quente",
  },
  {
    id: "l12",
    name: "Simone Vidal",
    phone: "(51) 99366-8890",
    interest: "Harmonização facial",
    source: "Instagram",
    stage: "perdido",
    value: 5600,
    createdAt: "2026-07-28",
    lastContact: "2026-08-12",
    owner: "Recepção",
    temperature: "frio",
    note: "Achou o investimento alto e foi para outra clínica.",
  },
  {
    id: "l13",
    name: "Juliana Kraus",
    phone: "(51) 99509-1123",
    interest: "Toxina botulínica",
    source: "Google",
    stage: "perdido",
    value: 1800,
    createdAt: "2026-07-30",
    lastContact: "2026-08-06",
    owner: "Recepção",
    temperature: "frio",
    note: "Parou de responder após o orçamento.",
  },
]
