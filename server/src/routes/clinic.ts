import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicRole, ClinicStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const updateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  professionalName: z.string().nullable().optional(),
  professionalRegistry: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
})

export async function clinicRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  // GET /api/clinic
  fastify.get("/clinic", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica vinculada ao usuário atual." },
      })
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: request.clinic.id },
    })

    if (!clinic || clinic.status === ClinicStatus.BLOCKED) {
      return reply.status(403).send({
        error: { code: "CLINIC_BLOCKED", message: "Acesso da clínica temporariamente suspenso." },
      })
    }

    return { clinic }
  })

  // PATCH /api/clinic
  fastify.patch("/clinic", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica vinculada." },
      })
    }

    // Role check: Only OWNER or ADMIN of the clinic
    const allowedRoles: string[] = [ClinicRole.OWNER, ClinicRole.ADMIN]
    if (!request.clinicRole || !allowedRoles.includes(request.clinicRole)) {
      return reply.status(403).send({
        error: {
          code: "FORBIDDEN",
          message: "Somente o proprietário ou administrador da clínica podem alterar estas configurações.",
        },
      })
    }

    const parseResult = updateClinicSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const dataToUpdate = parseResult.data
    const currentClinic = await prisma.clinic.findUnique({
      where: { id: request.clinic.id },
    })

    if (!currentClinic || currentClinic.status === ClinicStatus.BLOCKED) {
      return reply.status(403).send({
        error: { code: "CLINIC_BLOCKED", message: "Acesso da clínica suspenso." },
      })
    }

    // Refinement 14: Check if anything actually changed
    const hasChanges = Object.entries(dataToUpdate).some(([key, val]) => {
      if (val === undefined) return false
      return (currentClinic as any)[key] !== val
    })

    if (!hasChanges) {
      return { clinic: currentClinic, message: "Nenhuma alteração detectada." }
    }

    // Refinement 6: Notice that Clinic.slug is NOT modified on name updates!
    const updatedClinic = await prisma.$transaction(async (tx) => {
      const updated = await tx.clinic.update({
        where: { id: currentClinic.id },
        data: dataToUpdate,
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId: currentClinic.id,
          userId: request.user!.id,
          entityType: ClinicActivityEntityType.CLINIC,
          entityId: currentClinic.id,
          action: ClinicActivityAction.CLINIC_UPDATED,
        },
      })

      return updated
    })

    return { clinic: updatedClinic, message: "Configurações da clínica atualizadas com sucesso." }
  })
}
