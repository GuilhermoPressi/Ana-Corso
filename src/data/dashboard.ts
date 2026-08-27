export type Metric = {
  id: string
  label: string
  value: number
  format: "currency" | "number" | "percent"
  delta: number
  deltaLabel: string
  hint: string
}

export const metrics: Metric[] = [
  {
    id: "faturamento",
    label: "Faturamento",
    value: 84350,
    format: "currency",
    delta: 12.4,
    deltaLabel: "vs. julho",
    hint: "Recebido + a receber no mês",
  },
  {
    id: "lucro",
    label: "Lucro líquido",
    value: 41720,
    format: "currency",
    delta: 8.1,
    deltaLabel: "vs. julho",
    hint: "Margem de 49,5% no período",
  },
  {
    id: "ticket",
    label: "Ticket médio",
    value: 1490,
    format: "currency",
    delta: 4.6,
    deltaLabel: "vs. julho",
    hint: "57 atendimentos realizados",
  },
  {
    id: "novas",
    label: "Novas pacientes",
    value: 18,
    format: "number",
    delta: -6.2,
    deltaLabel: "vs. julho",
    hint: "9 vieram de indicação",
  },
  {
    id: "retorno",
    label: "Taxa de retorno",
    value: 68,
    format: "percent",
    delta: 5.3,
    deltaLabel: "vs. julho",
    hint: "Pacientes que remarcaram em 90 dias",
  },
  {
    id: "ocupacao",
    label: "Ocupação da agenda",
    value: 82,
    format: "percent",
    delta: 2.8,
    deltaLabel: "vs. julho",
    hint: "Média de 6,4 horas por dia",
  },
]

export type RevenuePoint = {
  month: string
  faturamento: number
  lucro: number
  meta: number
}

export const revenueSeries: RevenuePoint[] = [
  { month: "Set", faturamento: 52400, lucro: 24100, meta: 60000 },
  { month: "Out", faturamento: 58900, lucro: 27600, meta: 60000 },
  { month: "Nov", faturamento: 71200, lucro: 34800, meta: 65000 },
  { month: "Dez", faturamento: 88600, lucro: 45200, meta: 70000 },
  { month: "Jan", faturamento: 49300, lucro: 21700, meta: 70000 },
  { month: "Fev", faturamento: 63800, lucro: 30900, meta: 70000 },
  { month: "Mar", faturamento: 69400, lucro: 33100, meta: 75000 },
  { month: "Abr", faturamento: 72100, lucro: 35600, meta: 75000 },
  { month: "Mai", faturamento: 78500, lucro: 38900, meta: 78000 },
  { month: "Jun", faturamento: 74200, lucro: 36400, meta: 78000 },
  { month: "Jul", faturamento: 75050, lucro: 38600, meta: 80000 },
  { month: "Ago", faturamento: 84350, lucro: 41720, meta: 80000 },
]

export type AgendaStatus = "confirmado" | "aguardando" | "em-atendimento" | "concluido"

export type AgendaItem = {
  id: string
  time: string
  patient: string
  patientId?: string
  procedure: string
  duration: string
  value?: number
  status: AgendaStatus
  room?: string
  note?: string
}

export const todayAppointments: AgendaItem[] = [
  {
    id: "a1",
    time: "08:30",
    patient: "Juliana Prado",
    patientId: "p1",
    procedure: "Toxina botulínica · terço superior",
    duration: "45 min",
    value: 1800,
    status: "concluido",
    room: "Sala 1",
  },
  {
    id: "a2",
    time: "09:45",
    patient: "Marina Bittencourt",
    patientId: "p3",
    procedure: "Preenchimento de lábios",
    duration: "60 min",
    value: 2400,
    status: "em-atendimento",
    room: "Sala 2",
  },
  {
    id: "a3",
    time: "11:15",
    patient: "Fernanda Rocha",
    patientId: "p4",
    procedure: "Bioestimulador de colágeno · face",
    duration: "75 min",
    value: 3200,
    status: "confirmado",
    room: "Sala 1",
    note: "Primeira sessão do protocolo de 3",
  },
  {
    id: "a4",
    time: "14:00",
    patient: "Camila Duarte",
    patientId: "p6",
    procedure: "Skinbooster · face e pescoço",
    duration: "50 min",
    value: 1600,
    status: "confirmado",
    room: "Sala 2",
  },
  {
    id: "a5",
    time: "15:30",
    patient: "Renata Nogueira",
    patientId: "p8",
    procedure: "Avaliação facial completa",
    duration: "40 min",
    status: "aguardando",
    room: "Sala 1",
    note: "Ainda não confirmou pelo WhatsApp",
  },
  {
    id: "a6",
    time: "16:45",
    patient: "Patrícia Lemos",
    patientId: "p9",
    procedure: "Toxina botulínica · retoque",
    duration: "30 min",
    value: 600,
    status: "confirmado",
    room: "Sala 1",
  },
]

export type ReturnItem = {
  id: string
  patient: string
  patientId?: string
  procedure: string
  dueLabel: string
  overdueDays: number
  channel: "whatsapp" | "telefone"
}

export const todayReturns: ReturnItem[] = [
  {
    id: "r1",
    patient: "Beatriz Almeida",
    patientId: "p2",
    procedure: "Toxina · retorno de 15 dias",
    dueLabel: "Vence hoje",
    overdueDays: 0,
    channel: "whatsapp",
  },
  {
    id: "r2",
    patient: "Larissa Menezes",
    patientId: "p5",
    procedure: "Bioestimulador · 2ª sessão",
    dueLabel: "Atrasado 4 dias",
    overdueDays: 4,
    channel: "whatsapp",
  },
  {
    id: "r3",
    patient: "Sofia Ribeiro",
    patientId: "p7",
    procedure: "Preenchimento · avaliação de 30 dias",
    dueLabel: "Atrasado 11 dias",
    overdueDays: 11,
    channel: "telefone",
  },
  {
    id: "r4",
    patient: "Helena Costa",
    patientId: "p10",
    procedure: "Skinbooster · 3ª sessão",
    dueLabel: "Vence hoje",
    overdueDays: 0,
    channel: "whatsapp",
  },
]

export type LeadItem = {
  id: string
  name: string
  interest: string
  source: "Instagram" | "Indicação" | "Google" | "WhatsApp"
  waitingLabel: string
  temperature: "quente" | "morno" | "frio"
}

export const todayLeads: LeadItem[] = [
  {
    id: "l1",
    name: "Isabela Martins",
    interest: "Preenchimento labial",
    source: "Instagram",
    waitingLabel: "há 22 min",
    temperature: "quente",
  },
  {
    id: "l2",
    name: "Tatiane Freitas",
    interest: "Harmonização facial",
    source: "Indicação",
    waitingLabel: "há 1h40",
    temperature: "quente",
  },
  {
    id: "l3",
    name: "Vanessa Lopes",
    interest: "Toxina botulínica",
    source: "Google",
    waitingLabel: "há 3h",
    temperature: "morno",
  },
  {
    id: "l4",
    name: "Aline Barbosa",
    interest: "Bioestimulador",
    source: "WhatsApp",
    waitingLabel: "ontem",
    temperature: "frio",
  },
]

export type AlertLevel = "critico" | "atencao" | "info"

export type ClinicAlert = {
  id: string
  level: AlertLevel
  title: string
  description: string
  action: string
  to: string
}

export const clinicAlerts: ClinicAlert[] = [
  {
    id: "al1",
    level: "critico",
    title: "Toxina Botulínica 100U · 1 frasco",
    description: "Abaixo do estoque mínimo. Consumo médio de 6 frascos por mês.",
    action: "Ver estoque",
    to: "/estoque",
  },
  {
    id: "al2",
    level: "critico",
    title: "3 pacientes sem retorno há mais de 90 dias",
    description: "Juntas somam R$ 9.400 em ticket histórico.",
    action: "Abrir recuperador",
    to: "/recuperador",
  },
  {
    id: "al3",
    level: "atencao",
    title: "Ácido hialurônico 1ml · lote AH-2291",
    description: "Validade em 18 dias. 4 seringas em estoque.",
    action: "Ver lote",
    to: "/estoque",
  },
  {
    id: "al4",
    level: "atencao",
    title: "2 leads sem resposta há mais de 2 horas",
    description: "Leads de Instagram costumam esfriar após 1 hora.",
    action: "Abrir CRM",
    to: "/crm",
  },
  {
    id: "al5",
    level: "info",
    title: "5 termos de consentimento pendentes",
    description: "Assinaturas pendentes de atendimentos desta semana.",
    action: "Ver documentos",
    to: "/documentos",
  },
]

export type ProcedureShare = {
  name: string
  revenue: number
  sessions: number
}

export const topProcedures: ProcedureShare[] = [
  { name: "Bioestimulador", revenue: 26400, sessions: 11 },
  { name: "Preenchimento", revenue: 22100, sessions: 14 },
  { name: "Toxina botulínica", revenue: 19850, sessions: 22 },
  { name: "Skinbooster", revenue: 9800, sessions: 8 },
  { name: "Microagulhamento", revenue: 6200, sessions: 9 },
]

export const monthGoal = {
  target: 80000,
  current: 84350,
  daysLeft: 7,
}
