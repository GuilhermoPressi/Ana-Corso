import type { Lead } from "@/data/leads"
import type { Patient } from "@/data/patients"
import { CLINIC_TODAY } from "@/lib/clinic"
import { parseLocalDate } from "@/lib/utils"

export type SegmentId =
  | "sem-atendimento"
  | "retorno-pendente"
  | "orcamento-parado"
  | "toxina-vencendo"

export type RecoveryTarget = {
  id: string
  name: string
  phone: string
  patientId?: string
  /** Motivo curto, para o cabeçalho da linha. */
  reason: string
  /** Detalhe com a informação que justifica o contato. */
  detail: string
  lastActivity: string
  daysSince: number
  monthsSince: number
  /** Quanto essa paciente costuma deixar por atendimento. */
  potential: number
  procedure?: string
  /** Modelo de mensagem que faz mais sentido para este caso. */
  template: string
}

export type RecoverySegment = {
  id: SegmentId
  label: string
  description: string
  template: string
  targets: RecoveryTarget[]
  potential: number
}

export function daysSince(iso: string) {
  return Math.round(
    (parseLocalDate(CLINIC_TODAY).getTime() - parseLocalDate(iso).getTime()) / 86_400_000,
  )
}

const monthsOf = (days: number) => Math.max(Math.round(days / 30), 0)

/** Data da aplicação de toxina mais recente da paciente, se houver. */
function lastToxinaDate(patient: Patient) {
  const dates = patient.procedures
    .filter((record) => record.procedure.toLowerCase().includes("toxina"))
    .map((record) => record.date)
    .sort()
  return dates.at(-1)
}

export function buildSegments(
  patients: Patient[],
  leads: Lead[],
  inactivityMonths: number,
  toxinaMonths: number,
): RecoverySegment[] {
  const inactivityDays = inactivityMonths * 30
  const toxinaDays = toxinaMonths * 30

  const semAtendimento: RecoveryTarget[] = patients
    .filter((patient) => patient.sessions > 0 && daysSince(patient.lastVisit) >= inactivityDays)
    .map((patient) => {
      const days = daysSince(patient.lastVisit)
      return {
        id: `inativa-${patient.id}`,
        name: patient.name,
        phone: patient.phone,
        patientId: patient.id,
        reason: "Sem atendimento",
        detail: `Última visita em ${patient.lastVisit} · ${monthsOf(days)} meses atrás`,
        lastActivity: patient.lastVisit,
        daysSince: days,
        monthsSince: monthsOf(days),
        potential: patient.ticket,
        procedure: patient.mainProcedure,
        template: "reativacao",
      }
    })
    .sort((a, b) => b.daysSince - a.daysSince)

  const retornoPendente: RecoveryTarget[] = patients
    .flatMap((patient) =>
      patient.returns
        .filter((item) => item.status === "pendente" || item.status === "atrasado")
        .map((item) => {
          const days = daysSince(item.date)
          return {
            id: `retorno-${item.id}`,
            name: patient.name,
            phone: patient.phone,
            patientId: patient.id,
            reason: item.status === "atrasado" ? "Retorno atrasado" : "Retorno a agendar",
            detail: item.reason,
            lastActivity: item.date,
            daysSince: days,
            monthsSince: monthsOf(days),
            potential: patient.ticket,
            procedure: patient.mainProcedure,
            template: "retorno",
          }
        }),
    )
    .sort((a, b) => b.daysSince - a.daysSince)

  const orcamentoParado: RecoveryTarget[] = leads
    .filter((lead) => lead.stage === "proposta-enviada" && !lead.scheduledFor)
    .map((lead) => {
      const days = daysSince(lead.lastContact)
      return {
        id: `lead-${lead.id}`,
        name: lead.name,
        phone: lead.phone,
        reason: "Proposta sem resposta",
        detail: `${lead.interest} · último contato há ${days} dias`,
        lastActivity: lead.lastContact,
        daysSince: days,
        monthsSince: monthsOf(days),
        potential: lead.value,
        procedure: lead.interest,
        template: "orcamento",
      }
    })
    .sort((a, b) => b.potential - a.potential)

  const toxinaVencendo: RecoveryTarget[] = patients
    .flatMap((patient) => {
      const last = lastToxinaDate(patient)
      if (!last) return []
      const days = daysSince(last)
      if (days < toxinaDays) return []

      const record = patient.procedures.find(
        (item) => item.date === last && item.procedure.toLowerCase().includes("toxina"),
      )

      return [
        {
          id: `toxina-${patient.id}`,
          name: patient.name,
          phone: patient.phone,
          patientId: patient.id,
          reason: "Toxina vencendo",
          detail: `Última aplicação há ${monthsOf(days)} meses${
            record ? ` · ${record.quantity}` : ""
          }`,
          lastActivity: last,
          daysSince: days,
          monthsSince: monthsOf(days),
          potential: record?.value ?? patient.ticket,
          procedure: "Toxina botulínica",
          template: "manutencao",
        },
      ]
    })
    .sort((a, b) => b.daysSince - a.daysSince)

  const segments: RecoverySegment[] = [
    {
      id: "toxina-vencendo",
      label: "Toxina vencendo",
      description: `Última aplicação há mais de ${toxinaMonths} meses — é quando o movimento volta`,
      template: "manutencao",
      targets: toxinaVencendo,
      potential: 0,
    },
    {
      id: "sem-atendimento",
      label: "Sem atendimento",
      description: `Nenhuma visita há mais de ${inactivityMonths} meses`,
      template: "reativacao",
      targets: semAtendimento,
      potential: 0,
    },
    {
      id: "retorno-pendente",
      label: "Retorno pendente",
      description: "Retorno combinado que ainda não foi marcado",
      template: "retorno",
      targets: retornoPendente,
      potential: 0,
    },
    {
      id: "orcamento-parado",
      label: "Orçamento parado",
      description: "Proposta enviada e sem resposta da paciente",
      template: "orcamento",
      targets: orcamentoParado,
      potential: 0,
    },
  ]

  return segments.map((segment) => ({
    ...segment,
    potential: segment.targets.reduce((sum, target) => sum + target.potential, 0),
  }))
}
