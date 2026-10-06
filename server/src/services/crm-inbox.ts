import crypto from "node:crypto"
import {
  CrmConversationStatus,
  CrmMessageDirection,
  CrmMessageKind,
  CrmMessageStatus,
  Prisma,
  WhatsAppConnectionStatus,
  type WhatsAppInstance,
} from "@prisma/client"
import { prisma } from "../db.js"
import { config } from "../config.js"
import { evolution } from "./evolution.js"
import { StorageService } from "./storage.js"

const MAX_MEDIA_BYTES = 20 * 1024 * 1024

// ---------------------------------------------------------------------------
// Telefones
// ---------------------------------------------------------------------------

export function digitsOnly(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "")
}

/** Número no formato internacional usado pelo WhatsApp (DDI 55 quando ausente). */
export function toWhatsAppNumber(phone: string) {
  const digits = digitsOnly(phone)
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

/**
 * Variações de um telefone brasileiro: com e sem DDI e com e sem o nono
 * dígito. O WhatsApp ainda entrega alguns números antigos sem o 9.
 */
export function phoneVariants(phone: string) {
  const intl = toWhatsAppNumber(phone)
  const variants = new Set<string>([intl])
  if (intl.startsWith("55")) {
    const local = intl.slice(2)
    if (local.length === 11 && local[2] === "9") variants.add(`55${local.slice(0, 2)}${local.slice(3)}`)
    if (local.length === 10) variants.add(`55${local.slice(0, 2)}9${local.slice(2)}`)
    for (const v of [...variants]) variants.add(v.slice(2))
  }
  return [...variants].filter(Boolean)
}

// ---------------------------------------------------------------------------
// Instância / webhook
// ---------------------------------------------------------------------------

export function webhookUrlFor(instance: Pick<WhatsAppInstance, "webhookToken">) {
  const base = (process.env.PUBLIC_API_URL || config.FRONTEND_URL).trim().replace(/\/+$/, "")
  return `${base}/api/webhooks/evolution/${instance.webhookToken}`
}

export function newWebhookToken() {
  return crypto.randomBytes(24).toString("base64url")
}

export function instanceNameFor(clinicSlug: string) {
  const slug = clinicSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase().slice(0, 30) || "clinica"
  return `anacorso-${slug}-${crypto.randomBytes(3).toString("hex")}`
}

export async function refreshInstanceProfile(instance: WhatsAppInstance) {
  const info = await evolution.instanceInfo(instance.instanceName)
  if (!info.ok) return
  await prisma.whatsAppInstance.update({
    where: { id: instance.id },
    data: { phoneNumber: info.data.phoneNumber, profileName: info.data.profileName },
  })
}

// ---------------------------------------------------------------------------
// Contatos e conversas
// ---------------------------------------------------------------------------

/**
 * Encontra o contato pelo telefone (considerando variações) ou cria um novo,
 * já vinculando paciente/lead com o mesmo número quando houver um único match.
 */
export async function findOrCreateContact(
  clinicId: string,
  phone: string,
  opts: { name?: string | null; pushName?: string | null; source?: string } = {},
) {
  const variants = phoneVariants(phone)
  const existing = await prisma.crmContact.findFirst({ where: { clinicId, phone: { in: variants } } })
  if (existing) {
    // Atualiza o nome quando ainda é só o número.
    if (opts.pushName && (existing.name === existing.phone || !existing.pushName)) {
      return prisma.crmContact.update({
        where: { id: existing.id },
        data: {
          pushName: opts.pushName,
          ...(existing.name === existing.phone ? { name: opts.pushName } : {}),
        },
      })
    }
    return existing
  }

  const [patients, leads] = await Promise.all([
    prisma.patient.findMany({
      where: { clinicId, phone: { in: variants }, archivedAt: null },
      select: { id: true, name: true },
      take: 2,
    }),
    prisma.lead.findMany({
      where: { clinicId, phone: { in: variants }, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ])
  const patient = patients.length === 1 ? patients[0] : null
  const lead = leads.length === 1 ? leads[0] : null
  const canonical = toWhatsAppNumber(phone)

  try {
    return await prisma.crmContact.create({
      data: {
        clinicId,
        phone: canonical,
        name: opts.name?.trim() || patient?.name || lead?.name || opts.pushName?.trim() || canonical,
        pushName: opts.pushName ?? null,
        source: opts.source ?? "whatsapp",
        patientId: patient?.id ?? null,
        leadId: lead?.id ?? null,
      },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await prisma.crmContact.findFirst({ where: { clinicId, phone: canonical } })
      if (again) return again
    }
    throw err
  }
}

export async function ensureConversation(clinicId: string, contactId: string, remoteJid: string) {
  return prisma.crmConversation.upsert({
    where: { clinicId_contactId: { clinicId, contactId } },
    create: { clinicId, contactId, remoteJid },
    update: {},
  })
}

/** Destino aceito pela Evolution: o número, ou o JID completo quando é um @lid. */
export function destinationFor(conversation: { remoteJid: string }, contact: { phone: string }) {
  return conversation.remoteJid.endsWith("@lid") ? conversation.remoteJid : contact.phone
}

/**
 * Grava o id do WhatsApp numa mensagem enviada pelo app. Se o webhook
 * `send.message` chegou antes e já criou uma cópia, a cópia é descartada.
 */
export async function attachExternalId(messageId: string, conversationId: string, externalId: string | null) {
  if (!externalId) {
    return prisma.crmMessage.update({ where: { id: messageId }, data: { status: CrmMessageStatus.SENT } })
  }
  await prisma.crmMessage.deleteMany({ where: { conversationId, externalId, NOT: { id: messageId } } })
  return prisma.crmMessage.update({
    where: { id: messageId },
    data: { externalId, status: CrmMessageStatus.SENT, errorReason: null },
  })
}

export function previewFor(kind: CrmMessageKind, text: string | null | undefined) {
  const labels: Partial<Record<CrmMessageKind, string>> = {
    IMAGE: "📷 Imagem",
    AUDIO: "🎤 Áudio",
    VIDEO: "🎬 Vídeo",
    DOCUMENT: "📄 Documento",
    STICKER: "Figurinha",
    LOCATION: "📍 Localização",
  }
  const body = (text || "").trim()
  const label = labels[kind]
  const preview = label ? (body ? `${label}: ${body}` : label) : body
  return preview.slice(0, 160)
}

// ---------------------------------------------------------------------------
// Mídia
// ---------------------------------------------------------------------------

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "application/pdf": "pdf",
}

export function extensionFor(mimeType: string | null | undefined, fileName?: string | null) {
  const fromName = fileName?.includes(".") ? fileName.split(".").pop() : null
  if (fromName && /^[a-z0-9]{1,8}$/i.test(fromName)) return fromName.toLowerCase()
  const base = (mimeType || "").split(";")[0].trim().toLowerCase()
  return EXTENSIONS[base] ?? "bin"
}

export async function storeMessageMedia(
  clinicId: string,
  conversationId: string,
  messageId: string,
  base64: string,
  mimeType: string | null,
  fileName?: string | null,
) {
  const clean = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64
  const buffer = Buffer.from(clean, "base64")
  if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES) return null
  const key = `clinics/${clinicId}/crm/${conversationId}/${messageId}.${extensionFor(mimeType, fileName)}`
  return StorageService.saveObject(key, buffer)
}

// ---------------------------------------------------------------------------
// Webhook da Evolution
// ---------------------------------------------------------------------------

type ParsedContent = {
  kind: CrmMessageKind
  text: string | null
  mimeType: string | null
  fileName: string | null
  hasMedia: boolean
}

function unwrapMessage(message: any): any {
  let current = message
  for (let i = 0; i < 4 && current; i++) {
    const inner =
      current.ephemeralMessage?.message ??
      current.viewOnceMessage?.message ??
      current.viewOnceMessageV2?.message ??
      current.viewOnceMessageV2Extension?.message ??
      current.documentWithCaptionMessage?.message ??
      current.editedMessage?.message
    if (!inner) break
    current = inner
  }
  return current
}

export function parseMessageContent(rawMessage: any): ParsedContent | null {
  const m = unwrapMessage(rawMessage)
  if (!m) return null
  const media = (kind: CrmMessageKind, node: any, text: string | null = node?.caption ?? null): ParsedContent => ({
    kind,
    text: text || null,
    mimeType: node?.mimetype ?? null,
    fileName: node?.fileName ?? null,
    hasMedia: true,
  })

  if (typeof m.conversation === "string") {
    return { kind: CrmMessageKind.TEXT, text: m.conversation, mimeType: null, fileName: null, hasMedia: false }
  }
  if (m.extendedTextMessage?.text) {
    return { kind: CrmMessageKind.TEXT, text: m.extendedTextMessage.text, mimeType: null, fileName: null, hasMedia: false }
  }
  if (m.imageMessage) return media(CrmMessageKind.IMAGE, m.imageMessage)
  if (m.videoMessage) return media(CrmMessageKind.VIDEO, m.videoMessage)
  if (m.audioMessage) return media(CrmMessageKind.AUDIO, m.audioMessage, null)
  if (m.documentMessage) return media(CrmMessageKind.DOCUMENT, m.documentMessage, m.documentMessage.caption ?? m.documentMessage.fileName ?? null)
  if (m.stickerMessage) return media(CrmMessageKind.STICKER, m.stickerMessage, null)
  if (m.locationMessage || m.liveLocationMessage) {
    const loc = m.locationMessage ?? m.liveLocationMessage
    const label = [loc.name, loc.address].filter(Boolean).join(" — ")
    const coords = `${loc.degreesLatitude},${loc.degreesLongitude}`
    return { kind: CrmMessageKind.LOCATION, text: label ? `${label} (${coords})` : coords, mimeType: null, fileName: null, hasMedia: false }
  }
  if (m.contactMessage) {
    return { kind: CrmMessageKind.OTHER, text: `Contato compartilhado: ${m.contactMessage.displayName ?? ""}`.trim(), mimeType: null, fileName: null, hasMedia: false }
  }
  if (m.reactionMessage || m.protocolMessage || m.senderKeyDistributionMessage) return null
  if (m.buttonsResponseMessage?.selectedDisplayText) {
    return { kind: CrmMessageKind.TEXT, text: m.buttonsResponseMessage.selectedDisplayText, mimeType: null, fileName: null, hasMedia: false }
  }
  if (m.listResponseMessage?.title) {
    return { kind: CrmMessageKind.TEXT, text: m.listResponseMessage.title, mimeType: null, fileName: null, hasMedia: false }
  }
  return { kind: CrmMessageKind.OTHER, text: "Mensagem não suportada", mimeType: null, fileName: null, hasMedia: false }
}

function isIgnoredJid(jid: string) {
  return (
    !jid ||
    jid.endsWith("@g.us") ||
    jid.endsWith("@broadcast") ||
    jid.endsWith("@newsletter") ||
    jid === "status@broadcast"
  )
}

/** Resolve o JID de destino preferindo o número real quando o WhatsApp manda um @lid. */
function resolveJid(key: any) {
  const remoteJid: string = key?.remoteJid ?? ""
  if (remoteJid.endsWith("@lid")) {
    const alt: string | undefined = [key?.remoteJidAlt, key?.senderPn].find(
      (v) => typeof v === "string" && v.endsWith("@s.whatsapp.net"),
    )
    if (alt) return alt
  }
  return remoteJid
}

async function ingestMessage(instance: WhatsAppInstance, data: any) {
  const key = data?.key
  if (!key?.id) return
  const remoteJid = resolveJid(key)
  if (isIgnoredJid(remoteJid)) return

  const content = parseMessageContent(data.message)
  if (!content) return

  const clinicId = instance.clinicId
  const fromMe = Boolean(key.fromMe)
  const phone = remoteJid.split("@")[0].split(":")[0]
  const contact = await findOrCreateContact(clinicId, phone, { pushName: fromMe ? null : data.pushName ?? null })
  const conversation = await ensureConversation(clinicId, contact.id, remoteJid)

  // Atualiza o JID quando passamos a conhecer o número real.
  if (conversation.remoteJid.endsWith("@lid") && !remoteJid.endsWith("@lid")) {
    await prisma.crmConversation.update({ where: { id: conversation.id }, data: { remoteJid } })
  }

  const already = await prisma.crmMessage.findFirst({
    where: { conversationId: conversation.id, externalId: key.id },
    select: { id: true },
  })
  if (already) return

  const ts = Number(data.messageTimestamp)
  const sentAt = Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000) : new Date()

  let message
  try {
    message = await prisma.crmMessage.create({
      data: {
        clinicId,
        conversationId: conversation.id,
        externalId: key.id,
        direction: fromMe ? CrmMessageDirection.OUTBOUND : CrmMessageDirection.INBOUND,
        kind: content.kind,
        text: content.text,
        mediaMimeType: content.mimeType,
        mediaFileName: content.fileName,
        status: fromMe ? CrmMessageStatus.SENT : CrmMessageStatus.RECEIVED,
        sentAt,
      },
    })
  } catch (err) {
    // Mensagem duplicada (webhook reenviado ou envio feito pelo próprio app).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return
    throw err
  }

  await prisma.crmConversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: sentAt,
      lastMessagePreview: previewFor(content.kind, content.text),
      ...(fromMe
        ? {}
        : {
            unreadCount: { increment: 1 },
            lastInboundAt: sentAt,
            status: CrmConversationStatus.OPEN,
            closedAt: null,
          }),
    },
  })

  if (!fromMe && !contact.avatarUrl && !remoteJid.endsWith("@lid")) {
    evolution
      .profilePicture(instance.instanceName, contact.phone)
      .then((url) => (url ? prisma.crmContact.update({ where: { id: contact.id }, data: { avatarUrl: url } }) : null))
      .catch(() => {})
  }

  if (content.hasMedia) {
    let base64: string | null = typeof data.message?.base64 === "string" ? data.message.base64 : null
    let mimeType = content.mimeType
    if (!base64) {
      const downloaded = await evolution.downloadMedia(instance.instanceName, key.id)
      if (downloaded.ok) {
        base64 = downloaded.data.base64
        mimeType = mimeType ?? downloaded.data.mimetype
      }
    }
    if (base64) {
      const storageKey = await storeMessageMedia(clinicId, conversation.id, message.id, base64, mimeType, content.fileName)
      if (storageKey) {
        await prisma.crmMessage.update({
          where: { id: message.id },
          data: { mediaStorageKey: storageKey, mediaMimeType: mimeType },
        })
      }
    }
  }
}

const STATUS_RANK: Record<CrmMessageStatus, number> = {
  QUEUED: 0,
  FAILED: 0,
  RECEIVED: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
}

function mapAckStatus(raw: unknown): CrmMessageStatus | null {
  if (typeof raw === "number") {
    if (raw >= 4) return CrmMessageStatus.READ
    if (raw === 3) return CrmMessageStatus.DELIVERED
    if (raw === 2) return CrmMessageStatus.SENT
    return null
  }
  switch (String(raw).toUpperCase()) {
    case "SERVER_ACK":
      return CrmMessageStatus.SENT
    case "DELIVERY_ACK":
      return CrmMessageStatus.DELIVERED
    case "READ":
    case "PLAYED":
      return CrmMessageStatus.READ
    default:
      return null
  }
}

async function applyStatusUpdate(instance: WhatsAppInstance, data: any) {
  const externalId: string | undefined = data?.keyId ?? data?.key?.id ?? data?.id
  const status = mapAckStatus(data?.status ?? data?.update?.status)
  if (!externalId || !status) return

  const message = await prisma.crmMessage.findFirst({
    where: { clinicId: instance.clinicId, externalId, direction: CrmMessageDirection.OUTBOUND },
    select: { id: true, status: true },
  })
  if (!message || STATUS_RANK[status] <= STATUS_RANK[message.status]) return
  await prisma.crmMessage.update({ where: { id: message.id }, data: { status } })
}

async function applyConnectionUpdate(instance: WhatsAppInstance, data: any) {
  const state = String(data?.state ?? "")
  if (state === "open") {
    const updated = await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: {
        status: WhatsAppConnectionStatus.CONNECTED,
        qrCode: null,
        connectedAt: instance.status === WhatsAppConnectionStatus.CONNECTED ? instance.connectedAt : new Date(),
        ...(data?.wuid ? { phoneNumber: String(data.wuid).split("@")[0].split(":")[0] } : {}),
        ...(data?.profileName ? { profileName: String(data.profileName) } : {}),
      },
    })
    if (!updated.phoneNumber) await refreshInstanceProfile(updated)
  } else if (state === "close") {
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: WhatsAppConnectionStatus.DISCONNECTED, qrCode: null },
    })
  } else if (state === "connecting" && instance.status !== WhatsAppConnectionStatus.CONNECTED) {
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: WhatsAppConnectionStatus.CONNECTING },
    })
  }
}

async function applyQrUpdate(instance: WhatsAppInstance, data: any) {
  const base64 = data?.qrcode?.base64 ?? data?.base64
  if (typeof base64 !== "string" || !base64) return
  await prisma.whatsAppInstance.update({
    where: { id: instance.id },
    data: { qrCode: base64, qrUpdatedAt: new Date(), status: WhatsAppConnectionStatus.CONNECTING },
  })
}

export async function processEvolutionEvent(instance: WhatsAppInstance, payload: any) {
  const event = String(payload?.event ?? "").toLowerCase().replace(/_/g, ".")
  const items = Array.isArray(payload?.data) ? payload.data : [payload?.data]

  for (const data of items) {
    if (!data) continue
    switch (event) {
      case "messages.upsert":
      case "send.message":
        await ingestMessage(instance, data)
        break
      case "messages.update":
        await applyStatusUpdate(instance, data)
        break
      case "connection.update":
        await applyConnectionUpdate(instance, data)
        break
      case "qrcode.updated":
        await applyQrUpdate(instance, data)
        break
      default:
        break
    }
  }
}
