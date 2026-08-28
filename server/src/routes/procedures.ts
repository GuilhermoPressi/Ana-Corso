import type { FastifyInstance } from "fastify"
import {
  ClinicActivityAction,
  ClinicActivityEntityType,
  ClinicStatus,
  FollowUpStage,
  FollowUpStatus,
  InventoryMovementType,
  LedgerKind,
  LedgerSource,
  PatientReturnStatus,
  ScheduleEventKind,
  ScheduleEventStatus,
} from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const createProcedureSchema = z.object({
  patientId: z.string().uuid("ID de paciente inválido"),
  procedureName: z.string().min(1, "Nome do procedimento é obrigatório"),
  procedureCategory: z.string().min(1, "Categoria do procedimento é obrigatória"),
  regions: z.array(z.string()).optional().default([]),
  inventoryItemId: z.string().nullable().optional(),
  quantity: z.number().nonnegative().optional().default(0),
  value: z.number().positive("Valor cobrado deve ser maior que zero"),
  professionalName: z.string().min(1, "Nome do profissional é obrigatório"),
  notes: z.string().nullable().optional(),
  performedAt: z.string().optional(),
  scheduleEventId: z.string().nullable().optional(),
})

export async function procedureRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica ativa vinculada à sessão." },
      })
    }
    if (request.clinic.status === ClinicStatus.BLOCKED) {
      return reply.status(403).send({
        error: { code: "CLINIC_BLOCKED", message: "Acesso da clínica temporariamente suspenso." },
      })
    }
  })

  // GET /api/patients/:patientId/procedures
  fastify.get("/patients/:patientId/procedures", async (request, reply) => {
    const { patientId } = request.params as { patientId: string }
    const clinicId = request.clinic!.id

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
      })
    }

    const procedures = await prisma.procedureRecord.findMany({
      where: { clinicId, patientId },
      include: {
        productUsages: true,
      },
      orderBy: { performedAt: "desc" },
    })

    return { procedures }
  })

  // POST /api/procedures (Atomic Transaction Master Route)
  fastify.post("/procedures", async (request, reply) => {
    const clinicId = request.clinic!.id
    const userId = request.user!.id
    const idempotencyKeyHeader = (request.headers["idempotency-key"] || request.headers["x-idempotency-key"]) as string | undefined

    // Refinement 1: Persistent Idempotency Key in PostgreSQL
    if (idempotencyKeyHeader && idempotencyKeyHeader.trim()) {
      const keyStr = idempotencyKeyHeader.trim()
      const existingKey = await prisma.idempotencyKey.findUnique({
        where: {
          clinicId_key: {
            clinicId,
            key: keyStr,
          },
        },
      })

      if (existingKey) {
        if (existingKey.status === "COMPLETED") {
          return reply.status(existingKey.responseCode || 200).send(existingKey.responseBody)
        }
        if (existingKey.status === "PENDING") {
          return reply.status(409).send({
            error: {
              code: "OPERATION_IN_PROGRESS",
              message: "Esta operação já está em processamento.",
            },
          })
        }
      }

      // Record PENDING key
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      await prisma.idempotencyKey.create({
        data: {
          clinicId,
          userId,
          key: keyStr,
          operation: "POST /api/procedures",
          status: "PENDING",
          expiresAt,
        },
      })
    }

    const parseResult = createProcedureSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const body = parseResult.data
    const performedAt = body.performedAt ? new Date(body.performedAt) : new Date()

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Step 1: Verify Patient
        const patient = await tx.patient.findFirst({
          where: { id: body.patientId, clinicId },
        })

        if (!patient) {
          throw new Error("PATIENT_NOT_FOUND")
        }

        let directCost = 0
        let inventoryItemToUse: any = null

        // Step 2: Concurrency Safe Inventory Check and Reduction
        if (body.inventoryItemId && body.quantity > 0) {
          inventoryItemToUse = await tx.inventoryItem.findFirst({
            where: { id: body.inventoryItemId, clinicId, archivedAt: null },
          })

          if (!inventoryItemToUse) {
            throw new Error("PRODUCT_NOT_FOUND")
          }

          // Refinement 5: Atomic conditional update for concurrency safety
          const updatedCount = await tx.inventoryItem.updateMany({
            where: {
              id: body.inventoryItemId,
              clinicId,
              archivedAt: null,
              quantity: { gte: body.quantity },
            },
            data: {
              quantity: { decrement: body.quantity },
            },
          })

          if (updatedCount.count === 0) {
            throw new Error("INSUFFICIENT_STOCK")
          }

          const packCostNum = Number(inventoryItemToUse.packCost)
          const contentPerPackNum = Number(inventoryItemToUse.contentPerPack)
          const unitCostSnapshot = packCostNum / contentPerPackNum
          directCost = Math.round(body.quantity * unitCostSnapshot * 100) / 100
        }

        // Step 3: Create ProcedureRecord
        const procedureRecord = await tx.procedureRecord.create({
          data: {
            clinicId,
            patientId: patient.id,
            procedureName: body.procedureName.trim(),
            procedureCategory: body.procedureCategory.trim(),
            performedAt,
            professionalUserId: userId,
            professionalName: body.professionalName.trim(),
            regions: body.regions,
            value: body.value,
            directCost,
            notes: body.notes?.trim() || null,
            createdByUserId: userId,
          },
        })

        // Step 4: Create Product Usage & Inventory Movement
        if (inventoryItemToUse && body.quantity > 0) {
          const packCostNum = Number(inventoryItemToUse.packCost)
          const contentPerPackNum = Number(inventoryItemToUse.contentPerPack)
          const unitCostSnapshot = packCostNum / contentPerPackNum

          await tx.procedureProductUsage.create({
            data: {
              clinicId,
              procedureRecordId: procedureRecord.id,
              inventoryItemId: inventoryItemToUse.id,
              productNameSnapshot: inventoryItemToUse.name,
              brandSnapshot: inventoryItemToUse.brand,
              lotSnapshot: inventoryItemToUse.lot,
              unitSnapshot: inventoryItemToUse.contentUnit,
              quantity: body.quantity,
              unitCostSnapshot,
              totalCost: directCost,
            },
          })

          await tx.inventoryMovement.create({
            data: {
              clinicId,
              inventoryItemId: inventoryItemToUse.id,
              procedureRecordId: procedureRecord.id,
              patientId: patient.id,
              type: InventoryMovementType.OUT,
              productNameSnapshot: inventoryItemToUse.name,
              lotSnapshot: inventoryItemToUse.lot,
              quantity: body.quantity,
              unit: inventoryItemToUse.contentUnit,
              reason: `Atendimento: ${body.procedureName} · paciente ${patient.name}`,
              createdByUserId: userId,
            },
          })
        }

        // Step 5: Create LedgerEntry (Revenue)
        await tx.ledgerEntry.create({
          data: {
            clinicId,
            patientId: patient.id,
            procedureRecordId: procedureRecord.id,
            kind: LedgerKind.REVENUE,
            source: LedgerSource.PROCEDURE,
            category: body.procedureCategory.trim(),
            description: `Atendimento: ${body.procedureName} · ${patient.name}`,
            amount: body.value,
            directCost,
            countsAsAppointment: true,
            occurredAt: performedAt,
            createdByUserId: userId,
          },
        })

        // Step 6: Create 15-day PatientReturn
        const returnDueAt = new Date(performedAt.getTime() + 15 * 24 * 60 * 60 * 1000)
        const patientReturn = await tx.patientReturn.create({
          data: {
            clinicId,
            patientId: patient.id,
            procedureRecordId: procedureRecord.id,
            dueAt: returnDueAt,
            status: PatientReturnStatus.PENDING,
            reason: `Retorno clínico de ${body.procedureName}`,
          },
        })

        // Step 7: Create ScheduleEvent for Return (Refinement 8: exact same hour/minute + 15 days)
        const returnScheduleEvent = await tx.scheduleEvent.create({
          data: {
            clinicId,
            patientId: patient.id,
            patientName: patient.name,
            title: `Retorno · ${body.procedureName}`,
            kind: ScheduleEventKind.RETURN,
            status: ScheduleEventStatus.CONFIRMED,
            startsAt: returnDueAt,
            durationMin: 30,
            professionalName: body.professionalName.trim(),
            auto: true,
            createdByUserId: userId,
          },
        })

        await tx.patientReturn.update({
          where: { id: patientReturn.id },
          data: { scheduleEventId: returnScheduleEvent.id },
        })

        // Step 8: Update original schedule event if provided (Refinement 10)
        if (body.scheduleEventId) {
          const originalEvent = await tx.scheduleEvent.findFirst({
            where: { id: body.scheduleEventId, clinicId },
          })
          if (originalEvent && originalEvent.status !== ScheduleEventStatus.COMPLETED) {
            await tx.scheduleEvent.update({
              where: { id: body.scheduleEventId },
              data: { status: ScheduleEventStatus.COMPLETED },
            })
          }
        }

        // Step 9: Create PostCareFollowUps (H24, DAY_7, DAY_15)
        const h24Date = new Date(performedAt.getTime() + 24 * 60 * 60 * 1000)
        const day7Date = new Date(performedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
        const day15Date = new Date(performedAt.getTime() + 15 * 24 * 60 * 60 * 1000)

        await tx.postCareFollowUp.createMany({
          data: [
            {
              clinicId,
              patientId: patient.id,
              procedureRecordId: procedureRecord.id,
              stage: FollowUpStage.H24,
              scheduledFor: h24Date,
              status: FollowUpStatus.PENDING,
            },
            {
              clinicId,
              patientId: patient.id,
              procedureRecordId: procedureRecord.id,
              stage: FollowUpStage.DAY_7,
              scheduledFor: day7Date,
              status: FollowUpStatus.PENDING,
            },
            {
              clinicId,
              patientId: patient.id,
              procedureRecordId: procedureRecord.id,
              stage: FollowUpStage.DAY_15,
              scheduledFor: day15Date,
              status: FollowUpStatus.PENDING,
            },
          ],
          skipDuplicates: true,
        })

        // Step 10: Clinic Activity Log
        await tx.clinicActivityLog.create({
          data: {
            clinicId,
            userId,
            entityType: ClinicActivityEntityType.PROCEDURE,
            entityId: procedureRecord.id,
            action: ClinicActivityAction.PROCEDURE_CREATED,
          },
        })

        return {
          procedureRecord,
          directCost,
          returnDate: returnDueAt.toISOString().split("T")[0],
        }
      })

      const responsePayload = {
        procedure: result.procedureRecord,
        directCost: result.directCost,
        returnDate: result.returnDate,
        message: "Procedimento registrado com sucesso.",
      }

      // Update IdempotencyKey status if present
      if (idempotencyKeyHeader && idempotencyKeyHeader.trim()) {
        await prisma.idempotencyKey.update({
          where: {
            clinicId_key: {
              clinicId,
              key: idempotencyKeyHeader.trim(),
            },
          },
          data: {
            status: "COMPLETED",
            resourceId: result.procedureRecord.id,
            responseCode: 201,
            responseBody: responsePayload,
          },
        })
      }

      return reply.status(201).send(responsePayload)
    } catch (err: any) {
      if (err.message === "PATIENT_NOT_FOUND") {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
        })
      }
      if (err.message === "PRODUCT_NOT_FOUND") {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Produto não encontrado no estoque." },
        })
      }
      if (err.message === "INSUFFICIENT_STOCK") {
        return reply.status(400).send({
          error: {
            code: "INSUFFICIENT_STOCK",
            message: "Estoque insuficiente para realizar esta baixa de produto.",
          },
        })
      }

      throw err
    }
  })
}
