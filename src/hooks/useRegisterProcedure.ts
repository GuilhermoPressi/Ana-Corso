import { useCallback } from "react"

import { followUpFor } from "@/data/followUp"
import type { Patient } from "@/data/patients"
import { addDays, CLINIC_TODAY } from "@/lib/clinic"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useFinanceStore } from "@/stores/useFinanceStore"
import { useInventoryStore } from "@/stores/useInventoryStore"
import { useScheduleStore } from "@/stores/useScheduleStore"
import { usePatientStore } from "@/stores/usePatientStore"

export type RegisterProcedureInput = {
  patient: Patient
  procedure: string
  regions: string[]
  productId?: string
  /** Quantidade consumida, na unidade de conteúdo do produto. */
  quantity: number
  value: number
  professional: string
  notes?: string
}

export type RegisterProcedureOutcome = {
  directCost: number
  /** Quanto faltou no estoque para atender o consumo informado. */
  shortage: number
  productLabel: string
  clinicalReturnDate: string
  commercialContactDate: string
  clinicalReason: string
  commercialReason: string
}

/**
 * Registrar um procedimento é o ponto em que os módulos se encontram: dá baixa
 * no estoque, lança a receita com o custo direto, escreve na ficha da paciente,
 * agenda o retorno clínico e programa o recontato comercial.
 */
export function useRegisterProcedure() {
  const registerProcedure = usePatientStore((state) => state.registerProcedure)
  const addScheduledLead = usePatientStore((state) => state.addScheduledLead)
  const consume = useInventoryStore((state) => state.consume)
  const products = useInventoryStore((state) => state.products)
  const registerRevenue = useFinanceStore((state) => state.registerRevenue)
  const addEvent = useScheduleStore((state) => state.addEvent)

  return useCallback(
    (input: RegisterProcedureInput): RegisterProcedureOutcome => {
      const product = products.find((item) => item.id === input.productId)
      const rule = followUpFor(input.procedure)

      // 1. Estoque — baixa e custo do que saiu
      const consumption =
        product && input.quantity > 0
          ? consume({
              productId: product.id,
              quantity: input.quantity,
              reason: `${input.procedure}${input.regions.length ? ` · ${input.regions.join(", ")}` : ""}`,
              patientId: input.patient.id,
              patientName: input.patient.name,
            })
          : { ok: true, consumed: 0, cost: 0, shortage: 0 }

      const quantityLabel = product
        ? `${input.quantity.toLocaleString("pt-BR")} ${product.contentUnit}`
        : "—"
      const productLabel = product ? `${product.name} · ${product.brand}` : "Sem produto vinculado"

      const clinicalReturnDate = addDays(CLINIC_TODAY, rule.clinicalDays)
      const commercialContactDate = addDays(CLINIC_TODAY, rule.commercialDays)

      // 2. Ficha da paciente — histórico, linha do tempo, retorno e totais
      registerProcedure({
        patientId: input.patient.id,
        record: {
          date: CLINIC_TODAY,
          procedure: input.procedure,
          regions: input.regions,
          product: productLabel,
          lot: product?.lot,
          quantity: quantityLabel,
          professional: input.professional,
          value: input.value,
          notes: input.notes?.trim() || undefined,
        },
        returnDate: clinicalReturnDate,
        returnReason: rule.clinicalReason,
      })

      // 3. Financeiro — receita com o custo direto do produto consumido
      registerRevenue({
        description: `${input.procedure} · ${input.patient.name}`,
        category: input.procedure,
        amount: input.value,
        directCost: consumption.cost,
        patientId: input.patient.id,
        countsAsAppointment: true,
      })

      // 4. Agenda — retorno clínico
      addEvent({
        date: clinicalReturnDate,
        time: "10:00",
        durationMin: 30,
        title: rule.clinicalReason,
        kind: "retorno",
        status: "confirmado",
        patientId: input.patient.id,
        patientName: input.patient.name,
        professional: input.professional,
        room: "Sala 1",
        note: `Gerado ao registrar ${input.procedure} em ${formatDate(CLINIC_TODAY)}.`,
        auto: true,
      })

      // 5. CRM — recontato comercial quando o efeito tende a ceder
      addScheduledLead({
        name: input.patient.name,
        phone: input.patient.phone,
        interest: input.procedure,
        source: input.patient.origin,
        value: input.value,
        scheduledFor: commercialContactDate,
        note: `${rule.commercialReason}. Último atendimento em ${formatDate(
          CLINIC_TODAY,
        )} por ${formatCurrency(input.value)}.`,
      })

      return {
        directCost: consumption.cost,
        shortage: consumption.shortage,
        productLabel,
        clinicalReturnDate,
        commercialContactDate,
        clinicalReason: rule.clinicalReason,
        commercialReason: rule.commercialReason,
      }
    },
    [products, consume, registerProcedure, registerRevenue, addEvent, addScheduledLead],
  )
}
