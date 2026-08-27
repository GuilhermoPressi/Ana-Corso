import {
  Activity,
  BadgeDollarSign,
  BookMarked,
  Boxes,
  BrainCircuit,
  CalendarClock,
  ClipboardList,
  Contact,
  FileHeart,
  GraduationCap,
  HeartPulse,
  Images,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Map,
  Megaphone,
  Package2,
  Settings,
  Sparkles,
  Stethoscope,
  UserRoundPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react"

export type NavItem = {
  title: string
  short?: string
  url: string
  icon: LucideIcon
  badge?: string
  ready?: boolean
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const navigation: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { title: "Minha Clínica", url: "/", icon: LayoutDashboard, ready: true },
      { title: "Agenda Inteligente", url: "/agenda", icon: CalendarClock, ready: true },
      { title: "Financeiro", url: "/financeiro", icon: Wallet, ready: true },
    ],
  },
  {
    label: "Atendimento clínico",
    items: [
      { title: "Pacientes", url: "/pacientes", icon: Users, ready: true },
      { title: "Planejamento Facial", url: "/planejamento-facial", icon: Sparkles, ready: true },
      { title: "Mapa do Procedimento", url: "/mapa-do-procedimento", icon: Map, ready: true },
      { title: "Calculadoras Clínicas", short: "Calculadoras", url: "/calculadoras", icon: Activity, ready: true },
      { title: "Criador de Protocolos e Combos", short: "Protocolos e Combos", url: "/protocolos", icon: ClipboardList, ready: true },
      { title: "Gerador de Plano para a Paciente", short: "Plano da Paciente", url: "/plano-da-paciente", icon: FileHeart },
      { title: "Pós-procedimento", url: "/pos-procedimento", icon: HeartPulse, ready: true },
      { title: "Central de Intercorrências", short: "Intercorrências", url: "/intercorrencias", icon: LifeBuoy, ready: true },
      { title: "Consulta Rápida", url: "/consulta-rapida", icon: Stethoscope, ready: true },
    ],
  },
  {
    label: "Relacionamento e crescimento",
    items: [
      { title: "CRM de Pacientes e Leads", short: "CRM e Leads", url: "/crm", icon: Contact, ready: true },
      { title: "Recuperador de Pacientes", short: "Recuperador", url: "/recuperador", icon: UserRoundPlus, ready: true },
      { title: "Antes e Depois", url: "/antes-e-depois", icon: Images },
      { title: "Marketing", url: "/marketing", icon: Megaphone, ready: true },
      { title: "Precificação Inteligente", url: "/precificacao", icon: BadgeDollarSign, ready: true },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Estoque", url: "/estoque", icon: Boxes, ready: true },
      { title: "Biblioteca de Documentos", short: "Documentos", url: "/documentos", icon: BookMarked, ready: true },
    ],
  },
  {
    label: "Evolução",
    items: [
      { title: "Academia", url: "/academia", icon: GraduationCap },
      { title: "IA da Especialista", url: "/ia-da-especialista", icon: BrainCircuit, badge: "Beta" },
    ],
  },
]

export const secondaryNavigation: NavItem[] = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
]

/** Ícones auxiliares reutilizados fora da navegação. */
export const utilityIcons = { Package2, Zap }

export const allNavItems: NavItem[] = navigation.flatMap((group) => group.items)

export function findNavItem(pathname: string): NavItem | undefined {
  return [...allNavItems, ...secondaryNavigation].find((item) =>
    item.url === "/" ? pathname === "/" : pathname.startsWith(item.url),
  )
}
