import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, FollowUpStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const updatePostCareSchema = z.object({
  status: z.nativeEnum(FollowUpStatus),
})

export async function postCareRoutes(fastify: FastifyInstance) {
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

  // GET /api/post-care
  fastify.get("/post-care", async (request) => {
    const clinicId = request.clinic!.id

    const followUps = await prisma.postCareFollowUp.findMany({
      where: { clinicId },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        procedureRecord: { select: { id: true, procedureName: true, performedAt: true } },
      },
      orderBy: { scheduledFor: "asc" },
    })

    return { followUps }
  })

  // PATCH /api/post-care/:id
  fastify.patch("/post-care/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const followUp = await prisma.postCareFollowUp.findFirst({
      where: { id, clinicId },
    })

    if (!followUp) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Acompanhamento pós-procedimento não encontrado." },
      })
    }

    const parseResult = updatePostCareSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const { status } = parseResult.data

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const res = await tx.postCareFollowUp.update({
        where: { id },
        data: {
          status,
          ...(status === FollowUpStatus.SENT && { sentAt: now }),
          ...(status === FollowUpStatus.COMPLETED && { completedAt: now }),
          ...(status === FollowUpStatus.CANCELLED && { cancelledAt: now }),
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.POST_CARE,
          entityId: id,
          action:
            status === FollowUpStatus.COMPLETED
              ? ClinicActivityAction.POST_CARE_COMPLETED
              : status === FollowUpStatus.CANCELLED
                ? ClinicActivityAction.POST_CARE_CANCELLED
                : ClinicActivityAction.POST_CARE_CREATED,
        },
      })

      return res
    })

    return { followUp: updated }
  })
}
