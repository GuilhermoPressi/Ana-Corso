import { formatCurrency, formatDate } from "@/lib/utils"

export const CLINIC_NAME = "Clínica Ana Corso"

/**
 * Monta o link wa.me. O número é normalizado para dígitos e recebe o DDI 55
 * quando o cadastro trouxer só DDD + número, como é o padrão brasileiro.
 *
 * A mensagem é opcional: sem ela o link abre a conversa em branco.
 */
export function buildWhatsAppLink(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "")
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`
  const base = `https://wa.me/${withCountry}`
  return message?.trim() ? `${base}?text=${encodeURIComponent(message)}` : base
}

export type MessageVars = {
  firstName: string
  procedure?: string
  lastVisit?: string
  nextDate?: string
  value?: number
  monthsSince?: number
  professional?: string
}

export type MessageTemplate = {
  id: string
  label: string
  hint: string
  build: (vars: MessageVars) => string
}

/**
 * Rascunhos por contexto, usados apenas para pré-preencher o link — a
 * profissional nunca escolhe modelo na interface. Ela clica, o WhatsApp abre
 * com o texto pronto e decide ali o que enviar.
 */
export const messageTemplates: MessageTemplate[] = [
  {
    id: "lembrete",
    label: "Lembrete de agendamento",
    hint: "Confirmar presença de um horário já marcado",
    build: ({ firstName, nextDate, procedure }) =>
      `Oi, ${firstName}! Tudo bem? Passando para confirmar o seu horário${
        nextDate ? ` no dia ${formatDate(nextDate)}` : ""
      }${procedure ? ` para ${procedure.toLowerCase()}` : ""}. Posso confirmar? 💗`,
  },
  {
    id: "pos-procedimento",
    label: "Pós-procedimento",
    hint: "Acompanhar como a paciente está nos dias seguintes",
    build: ({ firstName, procedure }) =>
      `Oi, ${firstName}! Como você está se sentindo depois${
        procedure ? ` do ${procedure.toLowerCase()}` : " do procedimento"
      }? Qualquer desconforto ou dúvida, me chama por aqui que eu te oriento. 💗`,
  },
  {
    id: "retorno",
    label: "Retorno pendente",
    hint: "Chamar para o retorno de avaliação",
    build: ({ firstName, procedure }) =>
      `Oi, ${firstName}! Chegou a hora do seu retorno${
        procedure ? ` do ${procedure.toLowerCase()}` : ""
      }. É rapidinho e importante para eu avaliar o resultado de perto. Quando fica melhor para você?`,
  },
  {
    id: "manutencao",
    label: "Manutenção de toxina",
    hint: "O efeito costuma ceder por volta de 4 meses",
    build: ({ firstName, lastVisit, monthsSince }) =>
      `Oi, ${firstName}! Vi aqui que a sua última aplicação foi${
        lastVisit ? ` em ${formatDate(lastVisit)}` : ""
      }${
        monthsSince ? `, já faz ${monthsSince} meses` : ""
      }. Normalmente é nessa fase que o movimento começa a voltar. Quer que eu separe um horário para a manutenção?`,
  },
  {
    id: "reativacao",
    label: "Reativação",
    hint: "Paciente sem atendimento há bastante tempo",
    build: ({ firstName, monthsSince }) =>
      `Oi, ${firstName}! Faz um tempinho que a gente não se vê${
        monthsSince ? ` — já são ${monthsSince} meses` : ""
      }. Senti sua falta por aqui! Quer marcar uma avaliação para a gente rever o seu plano com calma?`,
  },
  {
    id: "orcamento",
    label: "Orçamento parado",
    hint: "Retomar uma proposta enviada e sem resposta",
    build: ({ firstName, procedure, value }) =>
      `Oi, ${firstName}! Passando para saber se ficou alguma dúvida sobre a proposta${
        procedure ? ` de ${procedure.toLowerCase()}` : ""
      }${
        value ? ` (${formatCurrency(value)})` : ""
      }. Se preferir, a gente conversa sobre as formas de pagamento. O que você acha?`,
  },
  {
    id: "aniversario",
    label: "Aniversário",
    hint: "Mensagem de parabéns com um mimo",
    build: ({ firstName }) =>
      `Feliz aniversário, ${firstName}! 🎂 Que o seu ano seja lindo por dentro e por fora. Preparei um mimo especial para você aqui na ${CLINIC_NAME} — me avisa quando quiser vir buscar. 💗`,
  },
  {
    id: "proposta",
    label: "Envio de proposta",
    hint: "Enviar o plano montado no planejamento",
    build: ({ firstName, value }) =>
      `Oi, ${firstName}! Terminei de montar o seu plano com base na nossa avaliação${
        value ? `. O investimento total ficou em ${formatCurrency(value)}` : ""
      }. Te mando os detalhes aqui e a gente ajusta o que precisar, combinado?`,
  },
]

export function templateById(id: string) {
  return messageTemplates.find((template) => template.id === id) ?? messageTemplates[0]
}

export const firstNameOf = (name: string) => name.trim().split(" ")[0]

/**
 * Escolhe o rascunho conforme o momento da paciente, sem pedir nada a ela.
 * A ordem reflete o que costuma ser mais urgente no dia a dia da clínica.
 */
export function contextualMessage(input: {
  vars: MessageVars
  daysSinceLastVisit?: number
  hasOverdueReturn?: boolean
  hasScheduledReturn?: boolean
  isInactive?: boolean
  birthdayThisMonth?: boolean
  hasOpenProposal?: boolean
}) {
  const id = input.hasOverdueReturn
    ? "retorno"
    : input.daysSinceLastVisit !== undefined && input.daysSinceLastVisit <= 7
      ? "pos-procedimento"
      : input.birthdayThisMonth
        ? "aniversario"
        : input.hasOpenProposal
          ? "orcamento"
          : input.isInactive
            ? "reativacao"
            : input.hasScheduledReturn
              ? "lembrete"
              : "retorno"

  return templateById(id).build(input.vars)
}
