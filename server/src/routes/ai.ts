import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"
import { AIServiceAdapter } from "../services/ai/adapter.js"

const createConversationSchema = z.object({
  title: z.string().optional().default("Consulta Clínica"),
  patientId: z.string().uuid().optional().nullable(),
})

const sendMessageSchema = z.object({
  content: z.string().min(1, "Mensagem é obrigatória"),
})

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica ativa vinculada à sessão." },
      })
    }
  })

  // GET /api/ai/conversations - List conversations for clinic & user
  fastify.get("/ai/conversations", async (request) => {
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const conversations = await prisma.aIConversation.findMany({
      where: { clinicId, userId, archivedAt: null },
      include: {
        patient: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    })

    return { conversations }
  })

  // POST /api/ai/conversations - Create new conversation
  fastify.post("/api/ai/conversations", async (request, reply) => {
    const parseResult = createConversationSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: "Dados de conversa inválidos." },
      })
    }

    const { title, patientId } = parseResult.data
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    if (patientId) {
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, clinicId },
      })
      if (!patient) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
        })
      }
    }

    const conversation = await prisma.aIConversation.create({
      data: {
        clinicId,
        userId,
        patientId: patientId || null,
        title: title.trim(),
      },
      include: { patient: { select: { id: true, name: true } } },
    })

    return reply.status(201).send({ conversation })
  })

  // GET /api/ai/conversations/:id - Get conversation messages
  fastify.get("/ai/conversations/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const conversation = await prisma.aIConversation.findFirst({
      where: { id, clinicId, userId, archivedAt: null },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mainProcedure: true,
            clinicalProfile: true,
          },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!conversation) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Conversa não encontrada." },
      })
    }

    return { conversation }
  })

  // POST /api/ai/conversations/:id/messages - Send message to AI
  fastify.post("/ai/conversations/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const conversation = await prisma.aIConversation.findFirst({
      where: { id, clinicId, userId, archivedAt: null },
      include: {
        patient: {
          select: {
            name: true,
            mainProcedure: true,
            clinicalProfile: true,
          },
        },
        messages: { orderBy: { createdAt: "asc" }, take: 10 },
      },
    })

    if (!conversation) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Conversa não encontrada." },
      })
    }

    const parseResult = sendMessageSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: "Mensagem inválida." },
      })
    }

    const userMessageContent = parseResult.data.content.trim()

    // 1. Record User Message
    const userMsg = await prisma.aIMessage.create({
      data: {
        conversationId: id,
        role: "user",
        content: userMessageContent,
      },
    })

    // 2. Prepare context for AI Adapter
    const historyMessages = [
      ...conversation.messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user" as const, content: userMessageContent },
    ]

    const patientCtx = conversation.patient
      ? {
          name: conversation.patient.name,
          mainProcedure: conversation.patient.mainProcedure || undefined,
          allergies: conversation.patient.clinicalProfile?.allergies || undefined,
          notes: conversation.patient.clinicalProfile?.clinicalNotes || undefined,
        }
      : undefined

    // 3. Call AI Service Adapter
    const aiResult = await AIServiceAdapter.generateResponse(historyMessages, patientCtx)

    // 4. Save Assistant Message & AI Usage
    const [assistantMsg] = await prisma.$transaction([
      prisma.aIMessage.create({
        data: {
          conversationId: id,
          role: "assistant",
          content: aiResult.content,
          tokensUsed: aiResult.inputTokens + aiResult.outputTokens,
          sources: aiResult.sources ? (aiResult.sources as any) : undefined,
        },
      }),
      prisma.aIUsage.create({
        data: {
          clinicId,
          userId,
          provider: aiResult.provider,
          model: aiResult.model,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens,
          operation: "CHAT_COMPLETION",
        },
      }),
      prisma.aIConversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ])

    return reply.status(201).send({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    })
  })
}
