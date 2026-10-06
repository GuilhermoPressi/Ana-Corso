import type { FastifyInstance } from "fastify"
import {
  ClinicActivityAction,
  ClinicActivityEntityType,
  ClinicStatus,
  CrmConversationStatus,
  CrmMessageDirection,
  CrmMessageKind,
  CrmMessageStatus,
  LeadStage,
  Prisma,
  WhatsAppConnectionStatus,
} from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth, requirePermission } from "../middlewares/auth.js"
import { evolution, evolutionConfig } from "../services/evolution.js"
import {
  attachExternalId,
  destinationFor,
  digitsOnly,
  ensureConversation,
  findOrCreateContact,
  instanceNameFor,
  newWebhookToken,
  phoneVariants,
  previewFor,
  refreshInstanceProfile,
  storeMessageMedia,
  toWhatsAppNumber,
  webhookUrlFor,
} from "../services/crm-inbox.js"
import { StorageService } from "../services/storage.js"

// As telas de atendimento fazem polling; o limite global (100/min por IP)
// estoura fácil numa recepção com várias atendentes atrás do mesmo IP.
const pollingLimit = { rateLimit: { max: 600, timeWindow: "1 minute" } }

const CRM_READ = { preHandler: [requirePermission("CRM_READ")], config: pollingLimit }
const CRM_WRITE = { preHandler: [requirePermission("CRM_WRITE")] }
const SETTINGS = { preHandler: [requirePermission("CLINIC_SETTINGS_MANAGE")] }

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

function badRequest(message: string) {
  return { error: { code: "INVALID_INPUT", message } }
}

function notFound(message: string) {
  return { error: { code: "NOT_FOUND", message } }
}

function serializeInstance(instance: Awaited<ReturnType<typeof prisma.whatsAppInstance.findUnique>>) {
  if (!instance) return null
  return {
    status: instance.status,
    qrCode: instance.qrCode,
    qrUpdatedAt: instance.qrUpdatedAt,
    phoneNumber: instance.phoneNumber,
    profileName: instance.profileName,
    connectedAt: instance.connectedAt,
  }
}

const contactInclude = {
  lead: { select: { id: true, name: true, stage: true } },
  patient: { select: { id: true, name: true } },
  conversations: { select: { id: true, status: true, lastMessageAt: true, unreadCount: true }, take: 1 },
} satisfies Prisma.CrmContactInclude

function serializeContact(contact: Prisma.CrmContactGetPayload<{ include: typeof contactInclude }>) {
  const { conversations, ...rest } = contact
  return { ...rest, conversation: conversations[0] ?? null }
}

const conversationInclude = {
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      avatarUrl: true,
      tags: true,
      leadId: true,
      patientId: true,
    },
  },
  assignedUser: { select: { id: true, name: true } },
} satisfies Prisma.CrmConversationInclude

function serializeMessage(message: {
  id: string
  direction: CrmMessageDirection
  kind: CrmMessageKind
  text: string | null
  mediaStorageKey: string | null
  mediaMimeType: string | null
  mediaFileName: string | null
  status: CrmMessageStatus
  errorReason: string | null
  sentAt: Date
  sentByUser?: { id: string; name: string } | null
}) {
  return {
    id: message.id,
    direction: message.direction,
    kind: message.kind,
    text: message.text,
    hasMedia: Boolean(message.mediaStorageKey),
    mediaMimeType: message.mediaMimeType,
    mediaFileName: message.mediaFileName,
    status: message.status,
    errorReason: message.errorReason,
    sentAt: message.sentAt,
    sentBy: message.sentByUser ?? null,
  }
}

const listQuerySchema = z.object({
  filter: z.enum(["open", "unread", "mine", "unassigned", "closed", "all"]).default("open"),
  search: z.string().optional(),
})

const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Mensagem vazia.").max(4096),
  note: z.boolean().optional().default(false),
})

const sendMediaSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(3).max(120),
  base64: z.string().min(1),
  caption: z.string().trim().max(1024).optional(),
})

const updateConversationSchema = z.object({
  status: z.nativeEnum(CrmConversationStatus).optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
})

const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120),
  phone: z.string().trim().min(8, "Telefone inválido."),
  email: z.string().trim().email("E-mail inválido.").nullable().optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  notes: z.string().max(5000).nullable().optional(),
})

const updateContactSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email("E-mail inválido.").nullable().optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  notes: z.string().max(5000).nullable().optional(),
  patientId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
})

const createLeadSchema = z.object({
  interest: z.string().trim().min(1, "Informe o interesse.").max(200),
  value: z.number().nonnegative().optional().default(0),
})

const quickReplySchema = z.object({
  shortcut: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .transform((v) => v.replace(/^\/+/, "").toLowerCase().replace(/\s+/g, "-")),
  content: z.string().trim().min(1).max(4096),
})

function normalizeTags(tags: string[] | undefined) {
  if (!tags) return undefined
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))]
}

function mediaTypeFor(mimeType: string): "image" | "video" | "document" | "audio" {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  return "document"
}

const KIND_FOR_MEDIA = {
  image: CrmMessageKind.IMAGE,
  video: CrmMessageKind.VIDEO,
  audio: CrmMessageKind.AUDIO,
  document: CrmMessageKind.DOCUMENT,
} as const

export async function crmRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send(notFound("Nenhuma clínica ativa vinculada à sessão."))
    }
    if (request.clinic.status === ClinicStatus.BLOCKED) {
      return reply.status(403).send({
        error: { code: "CLINIC_BLOCKED", message: "Acesso da clínica temporariamente suspenso." },
      })
    }
  })

  async function connectedInstance(clinicId: string) {
    const instance = await prisma.whatsAppInstance.findUnique({ where: { clinicId } })
    if (!instance || instance.status !== WhatsAppConnectionStatus.CONNECTED) return null
    return instance
  }

  async function loadConversation(clinicId: string, id: string) {
    return prisma.crmConversation.findFirst({
      where: { id, clinicId },
      include: conversationInclude,
    })
  }

  // ==========================================================================
  // Conexão do WhatsApp (instância Evolution da clínica)
  // ==========================================================================

  fastify.get("/crm/whatsapp", CRM_READ, async (request) => {
    const clinicId = request.clinic!.id
    let instance = await prisma.whatsAppInstance.findUnique({ where: { clinicId } })

    // Enquanto aguarda a leitura do QR, confirma o estado direto na Evolution
    // caso o webhook não tenha chegado (ex.: URL pública mal configurada).
    if (instance && instance.status === WhatsAppConnectionStatus.CONNECTING) {
      const state = await evolution.connectionState(instance.instanceName)
      if (state.ok && state.data.state === "open") {
        instance = await prisma.whatsAppInstance.update({
          where: { id: instance.id },
          data: { status: WhatsAppConnectionStatus.CONNECTED, qrCode: null, connectedAt: new Date() },
        })
        await refreshInstanceProfile(instance)
        instance = await prisma.whatsAppInstance.findUnique({ where: { clinicId } })
      } else if (!instance.qrCode || !instance.qrUpdatedAt || Date.now() - instance.qrUpdatedAt.getTime() > 45_000) {
        const qr = await evolution.connect(instance.instanceName)
        if (qr.ok && qr.data.base64) {
          instance = await prisma.whatsAppInstance.update({
            where: { id: instance.id },
            data: { qrCode: qr.data.base64, qrUpdatedAt: new Date() },
          })
        }
      }
    }

    return { configured: evolutionConfig().configured, instance: serializeInstance(instance) }
  })

  fastify.post("/crm/whatsapp/connect", SETTINGS, async (request, reply) => {
    if (!evolutionConfig().configured) {
      return reply.status(503).send({
        error: {
          code: "EVOLUTION_NOT_CONFIGURED",
          message: "A integração com o WhatsApp ainda não foi configurada no servidor (EVOLUTION_API_URL / EVOLUTION_API_KEY).",
        },
      })
    }

    const clinicId = request.clinic!.id
    let instance = await prisma.whatsAppInstance.findUnique({ where: { clinicId } })
    let qrCode: string | null = null

    if (!instance) {
      instance = await prisma.whatsAppInstance.create({
        data: {
          clinicId,
          instanceName: instanceNameFor(request.clinic!.slug),
          webhookToken: newWebhookToken(),
          status: WhatsAppConnectionStatus.CONNECTING,
        },
      })
      const created = await evolution.createInstance(instance.instanceName, webhookUrlFor(instance))
      if (!created.ok) {
        await prisma.whatsAppInstance.delete({ where: { id: instance.id } })
        return reply.status(502).send({
          error: { code: "EVOLUTION_ERROR", message: `Não foi possível criar a instância: ${created.error}` },
        })
      }
      qrCode = created.data.base64
    } else {
      await evolution.setWebhook(instance.instanceName, webhookUrlFor(instance))
      const state = await evolution.connectionState(instance.instanceName)
      if (state.ok && state.data.state === "open") {
        instance = await prisma.whatsAppInstance.update({
          where: { id: instance.id },
          data: { status: WhatsAppConnectionStatus.CONNECTED, qrCode: null },
        })
        await refreshInstanceProfile(instance)
        const fresh = await prisma.whatsAppInstance.findUnique({ where: { clinicId } })
        return { instance: serializeInstance(fresh) }
      }
      if (!state.ok && state.status === 404) {
        // A instância foi apagada na Evolution: recria com o mesmo nome.
        const created = await evolution.createInstance(instance.instanceName, webhookUrlFor(instance))
        if (!created.ok) {
          return reply.status(502).send({
            error: { code: "EVOLUTION_ERROR", message: `Não foi possível recriar a instância: ${created.error}` },
          })
        }
        qrCode = created.data.base64
      }
    }

    if (!qrCode) {
      const qr = await evolution.connect(instance.instanceName)
      if (!qr.ok) {
        return reply.status(502).send({
          error: { code: "EVOLUTION_ERROR", message: `Não foi possível gerar o QR Code: ${qr.error}` },
        })
      }
      qrCode = qr.data.base64
    }

    const updated = await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: {
        status: WhatsAppConnectionStatus.CONNECTING,
        qrCode,
        qrUpdatedAt: qrCode ? new Date() : null,
      },
    })
    return { instance: serializeInstance(updated) }
  })

  fastify.post("/crm/whatsapp/disconnect", SETTINGS, async (request) => {
    const clinicId = request.clinic!.id
    const instance = await prisma.whatsAppInstance.findUnique({ where: { clinicId } })
    if (!instance) return { instance: null }
    await evolution.logout(instance.instanceName)
    const updated = await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: WhatsAppConnectionStatus.DISCONNECTED, qrCode: null, connectedAt: null },
    })
    return { instance: serializeInstance(updated) }
  })

  // ==========================================================================
  // Conversas
  // ==========================================================================

  fastify.get("/crm/conversations", CRM_READ, async (request) => {
    const clinicId = request.clinic!.id
    const userId = request.user!.id
    const { filter, search } = listQuerySchema.parse(request.query)

    const where: Prisma.CrmConversationWhereInput = { clinicId }
    if (filter === "open") where.status = CrmConversationStatus.OPEN
    if (filter === "closed") where.status = CrmConversationStatus.CLOSED
    if (filter === "unread") Object.assign(where, { status: CrmConversationStatus.OPEN, unreadCount: { gt: 0 } })
    if (filter === "mine") Object.assign(where, { status: CrmConversationStatus.OPEN, assignedUserId: userId })
    if (filter === "unassigned") Object.assign(where, { status: CrmConversationStatus.OPEN, assignedUserId: null })

    const term = search?.trim()
    if (term) {
      const digits = digitsOnly(term)
      where.contact = {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        ],
      }
    }

    const [conversations, grouped, unread, mine, unassigned] = await Promise.all([
      prisma.crmConversation.findMany({
        where,
        include: conversationInclude,
        orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: 150,
      }),
      prisma.crmConversation.groupBy({ by: ["status"], where: { clinicId }, _count: { _all: true } }),
      prisma.crmConversation.count({ where: { clinicId, status: CrmConversationStatus.OPEN, unreadCount: { gt: 0 } } }),
      prisma.crmConversation.count({ where: { clinicId, status: CrmConversationStatus.OPEN, assignedUserId: userId } }),
      prisma.crmConversation.count({ where: { clinicId, status: CrmConversationStatus.OPEN, assignedUserId: null } }),
    ])

    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]))
    return {
      conversations,
      counts: {
        open: byStatus.OPEN ?? 0,
        closed: byStatus.CLOSED ?? 0,
        unread,
        mine,
        unassigned,
      },
    }
  })

  fastify.get("/crm/unread", CRM_READ, async (request) => {
    const clinicId = request.clinic!.id
    const [result, latest] = await Promise.all([
      prisma.crmConversation.aggregate({
        where: { clinicId, status: CrmConversationStatus.OPEN },
        _sum: { unreadCount: true },
      }),
      // Última mensagem recebida: o front compara o id para saber quando tocar o som.
      prisma.crmMessage.findFirst({
        where: { clinicId, direction: CrmMessageDirection.INBOUND },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          conversationId: true,
          createdAt: true,
          conversation: { select: { contact: { select: { name: true } } } },
        },
      }),
    ])
    return {
      unread: result._sum.unreadCount ?? 0,
      latestInbound: latest
        ? {
            id: latest.id,
            conversationId: latest.conversationId,
            contactName: latest.conversation.contact.name,
            receivedAt: latest.createdAt,
          }
        : null,
    }
  })

  fastify.get("/crm/conversations/:id", CRM_READ, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const conversation = await loadConversation(clinicId, id)
    if (!conversation) return reply.status(404).send(notFound("Conversa não encontrada."))

    const messages = await prisma.crmMessage.findMany({
      where: { conversationId: id },
      include: { sentByUser: { select: { id: true, name: true } } },
      orderBy: { sentAt: "desc" },
      take: 200,
    })

    return { conversation, messages: messages.reverse().map(serializeMessage) }
  })

  fastify.post("/crm/conversations/:id/read", CRM_READ, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const conversation = await prisma.crmConversation.findFirst({ where: { id, clinicId } })
    if (!conversation) return reply.status(404).send(notFound("Conversa não encontrada."))
    if (conversation.unreadCount === 0) return { ok: true }

    await prisma.crmConversation.update({ where: { id }, data: { unreadCount: 0 } })

    const instance = await connectedInstance(clinicId)
    if (instance) {
      const pending = await prisma.crmMessage.findMany({
        where: { conversationId: id, direction: CrmMessageDirection.INBOUND, externalId: { not: null } },
        orderBy: { sentAt: "desc" },
        take: Math.min(conversation.unreadCount, 20),
        select: { externalId: true },
      })
      evolution
        .markAsRead(
          instance.instanceName,
          pending.map((m) => ({ remoteJid: conversation.remoteJid, id: m.externalId! })),
        )
        .catch(() => {})
    }
    return { ok: true }
  })

  fastify.patch("/crm/conversations/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const parsed = updateConversationSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))

    const conversation = await prisma.crmConversation.findFirst({ where: { id, clinicId } })
    if (!conversation) return reply.status(404).send(notFound("Conversa não encontrada."))

    const { status, assignedUserId } = parsed.data
    if (assignedUserId) {
      const member = await prisma.clinicUser.findFirst({ where: { clinicId, userId: assignedUserId } })
      if (!member) return reply.status(400).send(badRequest("Usuário não faz parte da equipe da clínica."))
    }

    await prisma.crmConversation.update({
      where: { id },
      data: {
        ...(status
          ? {
              status,
              closedAt: status === CrmConversationStatus.CLOSED ? new Date() : null,
              ...(status === CrmConversationStatus.CLOSED ? { unreadCount: 0 } : {}),
            }
          : {}),
        ...(assignedUserId !== undefined ? { assignedUserId } : {}),
      },
    })
    return { conversation: await loadConversation(clinicId, id) }
  })

  fastify.post("/crm/conversations/:id/messages", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const userId = request.user!.id
    const { id } = request.params as { id: string }
    const parsed = sendMessageSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))

    const conversation = await loadConversation(clinicId, id)
    if (!conversation) return reply.status(404).send(notFound("Conversa não encontrada."))
    const { text, note } = parsed.data

    if (note) {
      const message = await prisma.crmMessage.create({
        data: {
          clinicId,
          conversationId: id,
          direction: CrmMessageDirection.OUTBOUND,
          kind: CrmMessageKind.NOTE,
          text,
          status: CrmMessageStatus.SENT,
          sentByUserId: userId,
        },
        include: { sentByUser: { select: { id: true, name: true } } },
      })
      return reply.status(201).send({ message: serializeMessage(message) })
    }

    const instance = await connectedInstance(clinicId)
    if (!instance) {
      return reply.status(409).send({
        error: { code: "WHATSAPP_DISCONNECTED", message: "O WhatsApp da clínica não está conectado." },
      })
    }

    const message = await prisma.crmMessage.create({
      data: {
        clinicId,
        conversationId: id,
        direction: CrmMessageDirection.OUTBOUND,
        kind: CrmMessageKind.TEXT,
        text,
        status: CrmMessageStatus.QUEUED,
        sentByUserId: userId,
      },
    })

    const now = new Date()
    await prisma.crmConversation.update({
      where: { id },
      data: {
        lastMessageAt: now,
        lastMessagePreview: previewFor(CrmMessageKind.TEXT, text),
        status: CrmConversationStatus.OPEN,
        closedAt: null,
        unreadCount: 0,
        ...(conversation.assignedUserId ? {} : { assignedUserId: userId }),
      },
    })

    const sent = await evolution.sendText(instance.instanceName, destinationFor(conversation, conversation.contact), text)
    if (sent.ok) {
      await attachExternalId(message.id, id, sent.data.externalId)
    } else {
      await prisma.crmMessage.update({
        where: { id: message.id },
        data: { status: CrmMessageStatus.FAILED, errorReason: sent.error },
      })
    }

    const saved = await prisma.crmMessage.findUniqueOrThrow({
      where: { id: message.id },
      include: { sentByUser: { select: { id: true, name: true } } },
    })
    return reply.status(sent.ok ? 201 : 502).send({
      message: serializeMessage(saved),
      ...(sent.ok ? {} : { error: { code: "SEND_FAILED", message: `Falha ao enviar: ${sent.error}` } }),
    })
  })

  fastify.post("/crm/conversations/:id/media", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const userId = request.user!.id
    const { id } = request.params as { id: string }
    const parsed = sendMediaSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))

    const conversation = await loadConversation(clinicId, id)
    if (!conversation) return reply.status(404).send(notFound("Conversa não encontrada."))

    const instance = await connectedInstance(clinicId)
    if (!instance) {
      return reply.status(409).send({
        error: { code: "WHATSAPP_DISCONNECTED", message: "O WhatsApp da clínica não está conectado." },
      })
    }

    const { fileName, mimeType, caption } = parsed.data
    const base64 = parsed.data.base64.includes(",") ? parsed.data.base64.split(",").pop()! : parsed.data.base64
    if (Buffer.byteLength(base64, "base64") > MAX_UPLOAD_BYTES) {
      return reply.status(413).send(badRequest("Arquivo maior que 10 MB."))
    }

    const mediaType = mediaTypeFor(mimeType)
    const kind = KIND_FOR_MEDIA[mediaType]
    const message = await prisma.crmMessage.create({
      data: {
        clinicId,
        conversationId: id,
        direction: CrmMessageDirection.OUTBOUND,
        kind,
        text: caption || (kind === CrmMessageKind.DOCUMENT ? fileName : null),
        mediaMimeType: mimeType,
        mediaFileName: fileName,
        status: CrmMessageStatus.QUEUED,
        sentByUserId: userId,
      },
    })
    const storageKey = await storeMessageMedia(clinicId, id, message.id, base64, mimeType, fileName)
    if (storageKey) {
      await prisma.crmMessage.update({ where: { id: message.id }, data: { mediaStorageKey: storageKey } })
    }

    await prisma.crmConversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: previewFor(kind, caption),
        status: CrmConversationStatus.OPEN,
        closedAt: null,
        unreadCount: 0,
        ...(conversation.assignedUserId ? {} : { assignedUserId: userId }),
      },
    })

    const number = destinationFor(conversation, conversation.contact)
    const sent =
      mediaType === "audio"
        ? await evolution.sendAudio(instance.instanceName, number, base64)
        : await evolution.sendMedia(instance.instanceName, {
            number,
            mediatype: mediaType,
            mimetype: mimeType,
            base64,
            fileName,
            caption,
          })

    if (sent.ok) {
      await attachExternalId(message.id, id, sent.data.externalId)
    } else {
      await prisma.crmMessage.update({
        where: { id: message.id },
        data: { status: CrmMessageStatus.FAILED, errorReason: sent.error },
      })
    }

    const saved = await prisma.crmMessage.findUniqueOrThrow({
      where: { id: message.id },
      include: { sentByUser: { select: { id: true, name: true } } },
    })
    return reply.status(sent.ok ? 201 : 502).send({
      message: serializeMessage(saved),
      ...(sent.ok ? {} : { error: { code: "SEND_FAILED", message: `Falha ao enviar: ${sent.error}` } }),
    })
  })

  fastify.post("/crm/messages/:id/retry", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const message = await prisma.crmMessage.findFirst({
      where: { id, clinicId, status: CrmMessageStatus.FAILED },
      include: { conversation: { include: { contact: true } } },
    })
    if (!message) return reply.status(404).send(notFound("Mensagem não encontrada."))

    const instance = await connectedInstance(clinicId)
    if (!instance) {
      return reply.status(409).send({
        error: { code: "WHATSAPP_DISCONNECTED", message: "O WhatsApp da clínica não está conectado." },
      })
    }

    const number = destinationFor(message.conversation, message.conversation.contact)
    let sent
    if (message.kind === CrmMessageKind.TEXT) {
      sent = await evolution.sendText(instance.instanceName, number, message.text ?? "")
    } else {
      const buffer = message.mediaStorageKey ? await StorageService.getFile(message.mediaStorageKey) : null
      if (!buffer || !message.mediaMimeType) {
        return reply.status(410).send(badRequest("O arquivo desta mensagem não está mais disponível."))
      }
      const base64 = buffer.toString("base64")
      const mediaType = mediaTypeFor(message.mediaMimeType)
      sent =
        mediaType === "audio"
          ? await evolution.sendAudio(instance.instanceName, number, base64)
          : await evolution.sendMedia(instance.instanceName, {
              number,
              mediatype: mediaType,
              mimetype: message.mediaMimeType,
              base64,
              fileName: message.mediaFileName ?? "arquivo",
              caption: message.kind === CrmMessageKind.DOCUMENT ? undefined : message.text ?? undefined,
            })
    }

    if (sent.ok) {
      await attachExternalId(message.id, message.conversationId, sent.data.externalId)
    } else {
      await prisma.crmMessage.update({ where: { id: message.id }, data: { errorReason: sent.error } })
    }
    const saved = await prisma.crmMessage.findUniqueOrThrow({
      where: { id: message.id },
      include: { sentByUser: { select: { id: true, name: true } } },
    })
    return reply.status(sent.ok ? 200 : 502).send({
      message: serializeMessage(saved),
      ...(sent.ok ? {} : { error: { code: "SEND_FAILED", message: `Falha ao reenviar: ${sent.error}` } }),
    })
  })

  fastify.get("/crm/messages/:id/media", CRM_READ, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const message = await prisma.crmMessage.findFirst({
      where: { id, clinicId },
      select: { mediaStorageKey: true, mediaMimeType: true, mediaFileName: true },
    })
    if (!message?.mediaStorageKey) return reply.status(404).send(notFound("Mídia não encontrada."))
    const buffer = await StorageService.getFile(message.mediaStorageKey)
    if (!buffer) return reply.status(404).send(notFound("Mídia não encontrada."))

    const mime = (message.mediaMimeType || "application/octet-stream").split(";")[0].trim()
    reply.header("Content-Type", mime)
    reply.header("Cache-Control", "private, max-age=86400")
    if (message.mediaFileName) {
      reply.header("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(message.mediaFileName)}`)
    }
    return reply.send(buffer)
  })

  // ==========================================================================
  // Contatos
  // ==========================================================================

  fastify.get("/crm/contacts", CRM_READ, async (request) => {
    const clinicId = request.clinic!.id
    const query = z
      .object({ search: z.string().optional(), tag: z.string().optional() })
      .parse(request.query)

    const where: Prisma.CrmContactWhereInput = { clinicId }
    const term = query.search?.trim()
    if (term) {
      const digits = digitsOnly(term)
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
      ]
    }
    if (query.tag) where.tags = { has: query.tag.toLowerCase() }

    const contacts = await prisma.crmContact.findMany({
      where,
      include: contactInclude,
      orderBy: { updatedAt: "desc" },
      take: 500,
    })
    return { contacts: contacts.map(serializeContact) }
  })

  fastify.get("/crm/contacts/tags", CRM_READ, async (request) => {
    const clinicId = request.clinic!.id
    const rows = await prisma.$queryRaw<{ tag: string; total: bigint }[]>`
      SELECT tag, COUNT(*) AS total
      FROM crm_contacts, unnest(tags) AS tag
      WHERE clinic_id = ${clinicId}
      GROUP BY tag
      ORDER BY total DESC, tag ASC
      LIMIT 100
    `
    return { tags: rows.map((r) => ({ tag: r.tag, count: Number(r.total) })) }
  })

  fastify.get("/crm/contacts/:id", CRM_READ, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const contact = await prisma.crmContact.findFirst({ where: { id, clinicId }, include: contactInclude })
    if (!contact) return reply.status(404).send(notFound("Contato não encontrado."))
    return { contact: serializeContact(contact) }
  })

  fastify.post("/crm/contacts", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const parsed = contactSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))

    const { name, phone, email, tags, notes } = parsed.data
    const digits = digitsOnly(phone)
    if (digits.length < 10 || digits.length > 15) return reply.status(400).send(badRequest("Telefone inválido."))

    const existing = await prisma.crmContact.findFirst({ where: { clinicId, phone: { in: phoneVariants(digits) } } })
    if (existing) {
      return reply.status(409).send({
        error: { code: "DUPLICATE_PHONE", message: `Já existe um contato com este telefone (${existing.name}).` },
      })
    }

    const created = await findOrCreateContact(clinicId, digits, { name, source: "manual" })
    const contact = await prisma.crmContact.update({
      where: { id: created.id },
      data: { email: email || null, tags: normalizeTags(tags) ?? [], notes: notes ?? null },
      include: contactInclude,
    })
    return reply.status(201).send({ contact: serializeContact(contact) })
  })

  fastify.patch("/crm/contacts/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const parsed = updateContactSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))

    const existing = await prisma.crmContact.findFirst({ where: { id, clinicId } })
    if (!existing) return reply.status(404).send(notFound("Contato não encontrado."))

    const { name, email, tags, notes, patientId, leadId } = parsed.data
    if (patientId) {
      const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } })
      if (!patient) return reply.status(400).send(badRequest("Paciente não encontrado."))
    }
    if (leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: leadId, clinicId } })
      if (!lead) return reply.status(400).send(badRequest("Lead não encontrado."))
    }

    const contact = await prisma.crmContact.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(tags !== undefined ? { tags: normalizeTags(tags) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(patientId !== undefined ? { patientId } : {}),
        ...(leadId !== undefined ? { leadId } : {}),
      },
      include: contactInclude,
    })
    return { contact: serializeContact(contact) }
  })

  fastify.delete("/crm/contacts/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const existing = await prisma.crmContact.findFirst({ where: { id, clinicId } })
    if (!existing) return reply.status(404).send(notFound("Contato não encontrado."))
    await prisma.crmContact.delete({ where: { id } })
    return { ok: true }
  })

  /** Garante uma conversa para o contato (para iniciar atendimento ativo). */
  fastify.post("/crm/contacts/:id/conversation", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const contact = await prisma.crmContact.findFirst({ where: { id, clinicId } })
    if (!contact) return reply.status(404).send(notFound("Contato não encontrado."))
    const conversation = await ensureConversation(clinicId, contact.id, `${toWhatsAppNumber(contact.phone)}@s.whatsapp.net`)
    return { conversation: await loadConversation(clinicId, conversation.id) }
  })

  /** Cria um lead no funil a partir do contato e já deixa os dois vinculados. */
  fastify.post("/crm/contacts/:id/lead", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const userId = request.user!.id
    const { id } = request.params as { id: string }
    const parsed = createLeadSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))

    const contact = await prisma.crmContact.findFirst({ where: { id, clinicId } })
    if (!contact) return reply.status(404).send(notFound("Contato não encontrado."))
    if (contact.leadId) {
      return reply.status(409).send({ error: { code: "ALREADY_LINKED", message: "Este contato já tem um lead vinculado." } })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          clinicId,
          patientId: contact.patientId,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          interest: parsed.data.interest,
          source: "WhatsApp",
          value: parsed.data.value,
          stage: LeadStage.NEW_CONTACT,
          note: contact.notes,
          createdByUserId: userId,
          assignedUserId: userId,
          owner: request.user!.name,
        },
      })
      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.LEAD,
          entityId: lead.id,
          action: ClinicActivityAction.LEAD_CREATED,
        },
      })
      return tx.crmContact.update({ where: { id }, data: { leadId: lead.id }, include: contactInclude })
    })
    return reply.status(201).send({ contact: serializeContact(updated) })
  })

  // ==========================================================================
  // Respostas rápidas
  // ==========================================================================

  fastify.get("/crm/quick-replies", CRM_READ, async (request) => {
    const clinicId = request.clinic!.id
    const quickReplies = await prisma.crmQuickReply.findMany({ where: { clinicId }, orderBy: { shortcut: "asc" } })
    return { quickReplies }
  })

  fastify.post("/crm/quick-replies", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const parsed = quickReplySchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send(badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos."))
    try {
      const quickReply = await prisma.crmQuickReply.create({ data: { clinicId, ...parsed.data } })
      return reply.status(201).send({ quickReply })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return reply.status(409).send({ error: { code: "DUPLICATE", message: "Já existe uma resposta com esse atalho." } })
      }
      throw err
    }
  })

  fastify.delete("/crm/quick-replies/:id", CRM_WRITE, async (request, reply) => {
    const clinicId = request.clinic!.id
    const { id } = request.params as { id: string }
    const result = await prisma.crmQuickReply.deleteMany({ where: { id, clinicId } })
    if (result.count === 0) return reply.status(404).send(notFound("Resposta rápida não encontrada."))
    return { ok: true }
  })
}
