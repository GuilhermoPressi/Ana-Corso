import { useCallback } from "react"

import { followUpFor } from "@/data/followUp"
import type { Patient } from "@/data/patients"
import { addDays, CLINIC_TODAY } from "@/lib/clinic"
import { useFinanceStore } from "@/stores/useFinanceStore"
import { useInventoryStore } from "@/stores/useInventoryStore"
import { useScheduleStore } from "@/stores/useScheduleStore"
import { usePatientStore } from "@/stores/usePatientStore"

export type RegisterProcedureInput = {
  patient: Patient
  procedure: string
  regions: string[]
  productId?: string
  quantity: number
  value: number
  professional: string
  notes?: string
}

export type RegisterProcedureOutcome = {
  ok: boolean
  directCost: number
  shortage: number
  productLabel: string
  clinicalReturnDate: string
  commercialContactDate: string
  clinicalReason: string
  commercialReason: string
  errorMessage?: string
}

export function useRegisterProcedure() {
  const loadPatients = usePatientStore((state) => state.loadPatients)
  const fetchProducts = useInventoryStore((state) => state.fetchProducts)
  const fetchEntries = useFinanceStore((state) => state.fetchEntries)
  const fetchEvents = useScheduleStore((state) => state.fetchEvents)
  const products = useInventoryStore((state) => state.products)

  return useCallback(
    async (input: RegisterProcedureInput): Promise<RegisterProcedureOutcome> => {
      const product = products.find((item) => item.id === input.productId)
      const rule = followUpFor(input.procedure)

      const clinicalReturnDate = addDays(CLINIC_TODAY, rule.clinicalDays)
      const commercialContactDate = addDays(CLINIC_TODAY, rule.commercialDays)
      const productLabel = product ? `${product.name} · ${product.brand}` : "Sem produto vinculado"

      const idempotencyKey = `proc-${input.patient.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      try {
        const res = await fetch("/api/procedures", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            patientId: input.patient.id,
            procedureName: input.procedure,
            procedureCategory: input.procedure,
            regions: input.regions,
            inventoryItemId: input.productId || null,
            quantity: input.quantity,
            value: input.value,
            professionalName: input.professional,
            notes: input.notes,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          return {
            ok: false,
            directCost: 0,
            shortage: data.error?.code === "INSUFFICIENT_STOCK" ? input.quantity : 0,
            productLabel,
            clinicalReturnDate,
            commercialContactDate,
            clinicalReason: rule.clinicalReason,
            commercialReason: rule.commercialReason,
            errorMessage: data.error?.message || "Falha ao registrar procedimento.",
          }
        }

        // Refresh real backend data in background
        await Promise.all([
          loadPatients(),
          fetchProducts(),
          fetchEntries(),
          fetchEvents(),
        ])

        return {
          ok: true,
          directCost: Number(data.directCost || 0),
          shortage: 0,
          productLabel,
          clinicalReturnDate,
          commercialContactDate,
          clinicalReason: rule.clinicalReason,
          commercialReason: rule.commercialReason,
        }
      } catch (err: any) {
        return {
          ok: false,
          directCost: 0,
          shortage: 0,
          productLabel,
          clinicalReturnDate,
          commercialContactDate,
          clinicalReason: rule.clinicalReason,
          commercialReason: rule.commercialReason,
          errorMessage: err.message || "Erro de conexão ao registrar atendimento.",
        }
      }
    },
    [products, loadPatients, fetchProducts, fetchEntries, fetchEvents],
  )
}
