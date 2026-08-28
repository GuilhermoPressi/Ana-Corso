import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, PhotoType } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"
import { StorageService } from "../services/storage.js"

const photoTypeEnum = z.nativeEnum(PhotoType)

const createPhotoSchema = z.object({
  procedureRecordId: z.string().uuid().optional().nullable(),
  originalFileName: z.string().min(1).default("foto_clinica.jpg"),
  mimeType: z.string().refine((val) => ["image/jpeg", "image/png", "image/webp"].includes(val), {
    message: "Tipo de arquivo não permitido. Use JPEG, PNG ou WEBP.",
  }),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024, "Tamanho máximo da foto é 10 MB"),
  base64Data: z.string().min(10, "Dados da imagem são obrigatórios"),
  type: photoTypeEnum.optional().default(PhotoType.CLINICAL),
  bodyRegion: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function photoRoutes(fastify: FastifyInstance) {
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

  // GET /api/patients/:patientId/photos
  fastify.get("/patients/:patientId/photos", async (request, reply) => {
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

    const photos = await prisma.patientPhoto.findMany({
      where: { clinicId, patientId, archivedAt: null },
      orderBy: { capturedAt: "desc" },
    })

    const withAccessUrls = photos.map((p) => {
      const signed = StorageService.generateAccessToken(p.id, clinicId, 15)
      return {
        ...p,
        accessUrl: `/api/photos/${p.id}/file?token=${signed.token}`,
      }
    })

    return { photos: withAccessUrls }
  })

  // POST /api/patients/:patientId/photos
  fastify.post("/patients/:patientId/photos", async (request, reply) => {
    const { patientId } = request.params as { patientId: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
      })
    }

    const parseResult = createPhotoSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados de foto inválidos.",
        },
      })
    }

    const body = parseResult.data

    // Clean base64 string
    const cleanBase64 = body.base64Data.replace(/^data:image\/\w+;base64,/, "")
    const imageBuffer = Buffer.from(cleanBase64, "base64")

    const photoId = crypto.randomUUID()
    const extension = body.mimeType.split("/")[1] || "jpg"

    // Save into private storage (S3 / Local Fallback)
    const storageKey = await StorageService.saveFile(
      clinicId,
      patientId,
      photoId,
      imageBuffer,
      body.mimeType,
      extension,
    )

    const photo = await prisma.$transaction(async (tx) => {
      const created = await tx.patientPhoto.create({
        data: {
          id: photoId,
          clinicId,
          patientId,
          procedureRecordId: body.procedureRecordId || null,
          storageKey,
          originalFileName: body.originalFileName.trim(),
          mimeType: body.mimeType,
          fileSize: imageBuffer.length,
          type: body.type,
          bodyRegion: body.bodyRegion?.trim() || null,
          notes: body.notes?.trim() || null,
          uploadedByUserId: userId,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PHOTO,
          entityId: created.id,
          action: ClinicActivityAction.PHOTO_UPLOADED,
        },
      })

      return created
    })

    const signed = StorageService.generateAccessToken(photo.id, clinicId, 15)
    return reply.status(201).send({
      photo: {
        ...photo,
        accessUrl: `/api/photos/${photo.id}/file?token=${signed.token}`,
      },
    })
  })

  // GET /api/photos/:id/access (Signed access URL)
  fastify.get("/photos/:id/access", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id

    const photo = await prisma.patientPhoto.findFirst({
      where: { id, clinicId, archivedAt: null },
    })

    if (!photo) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Foto não encontrada." },
      })
    }

    const signed = StorageService.generateAccessToken(photo.id, clinicId, 15)
    return {
      accessUrl: `/api/photos/${photo.id}/file?token=${signed.token}`,
      expiresAt: signed.expiresAt,
    }
  })

  // GET /api/photos/:id/file (Binary Image Stream)
  fastify.get("/photos/:id/file", async (request, reply) => {
    const { id } = request.params as { id: string }
    const { token } = request.query as { token?: string }
    const clinicId = request.clinic!.id

    const photo = await prisma.patientPhoto.findFirst({
      where: { id, clinicId, archivedAt: null },
    })

    if (!photo) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Foto não encontrada." },
      })
    }

    if (token) {
      const isValidToken = StorageService.verifyAccessToken(token, photo.id, clinicId)
      if (!isValidToken) {
        return reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Link de acesso expirado ou inválido." },
        })
      }
    }

    const buffer = await StorageService.getFile(photo.storageKey)
    if (!buffer) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Arquivo físico não encontrado no storage." },
      })
    }

    reply.header("Content-Type", photo.mimeType)
    reply.header("Cache-Control", "private, max-age=900")
    return reply.send(buffer)
  })

  // POST /api/photos/:id/archive (Soft delete)
  fastify.post("/photos/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const photo = await prisma.patientPhoto.findFirst({
      where: { id, clinicId, archivedAt: null },
    })

    if (!photo) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Foto não encontrada." },
      })
    }

    await prisma.$transaction(async (tx) => {
      await tx.patientPhoto.update({
        where: { id },
        data: { archivedAt: new Date() },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PHOTO,
          entityId: id,
          action: ClinicActivityAction.PHOTO_ARCHIVED,
        },
      })
    })

    return { message: "Foto arquivada com sucesso." }
  })
}
