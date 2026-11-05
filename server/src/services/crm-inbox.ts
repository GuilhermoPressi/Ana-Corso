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
import { applyTagRules, sendWelcomeMessage } from "./crm-automations.js"

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
  "audio/webm": "webm",
  "audio/wav": "wav",
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

/** Envelopes que só embrulham a mensagem real. */
const WRAPPER_KEYS = [
  "ephemeralMessage",
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
  "documentWithCaptionMessage",
  "editedMessage",
  "deviceSentMessage",
  "futureProofMessage",
  "groupMentionedMessage",
  "botInvokeMessage",
  "associatedChildMessage",
  "lottieStickerMessage",
] as const

function unwrapMessage(message: any): any {
  let current = message
  for (let i = 0; i < 6 && current; i++) {
    const key = WRAPPER_KEYS.find((k) => current[k]?.message)
    if (!key) break
    current = current[key].message
  }
  return current
}

/** Chaves de metadados que acompanham o conteúdo e não são mensagem. */
const META_KEYS = new Set(["messageContextInfo", "senderKeyDistributionMessage", "base64", "mediaUrl"])

/** Mensagens de sistema/sem conteúdo visível: não entram na conversa. */
const SILENT_KEYS = [
  "reactionMessage",
  "encReactionMessage",
  "protocolMessage",
  "pollUpdateMessage",
  "keepInChatMessage",
  "pinInChatMessage",
  "albumMessage",
  "messageHistoryBundle",
  "requestPhoneNumberMessage",
  "placeholderMessage",
  "secretEncryptedMessage",
  "encEventResponseMessage",
] as const

const UNSUPPORTED_PREFIX = "Tipo não suportado"

/** Texto gravado para mensagens que o app não soube ler (antes e agora). */
export function isUnsupportedText(text: string | null) {
  return Boolean(text && (text === "Mensagem não suportada" || text.startsWith(UNSUPPORTED_PREFIX)))
}

const textContent = (text: string): ParsedContent => ({
  kind: CrmMessageKind.TEXT,
  text,
  mimeType: null,
  fileName: null,
  hasMedia: false,
})

function pollText(poll: any) {
  const options = Array.isArray(poll?.options) ? poll.options.map((o: any) => `• ${o?.optionName ?? ""}`) : []
  return [`📊 Enquete: ${poll?.name ?? ""}`.trim(), ...options].join("\n")
}

export function parseMessageContent(rawMessage: any): ParsedContent | null {
  const m = unwrapMessage(rawMessage)
  if (!m || typeof m !== "object") return null
  const media = (kind: CrmMessageKind, node: any, text: string | null = node?.caption ?? null): ParsedContent => ({
    kind,
    text: text || null,
    mimeType: node?.mimetype ?? null,
    fileName: node?.fileName ?? null,
    hasMedia: true,
  })

  if (typeof m.conversation === "string" && m.conversation) return textContent(m.conversation)
  if (m.extendedTextMessage?.text) return textContent(m.extendedTextMessage.text)
  if (m.imageMessage) return media(CrmMessageKind.IMAGE, m.imageMessage)
  if (m.videoMessage) return media(CrmMessageKind.VIDEO, m.videoMessage)
  // Recado de vídeo (bolinha).
  if (m.ptvMessage) return media(CrmMessageKind.VIDEO, m.ptvMessage)
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
  if (m.contactsArrayMessage) {
    const names = (m.contactsArrayMessage.contacts ?? []).map((c: any) => c?.displayName).filter(Boolean)
    return { kind: CrmMessageKind.OTHER, text: `Contatos compartilhados: ${names.join(", ") || m.contactsArrayMessage.displayName || ""}`.trim(), mimeType: null, fileName: null, hasMedia: false }
  }
  if (SILENT_KEYS.some((k) => m[k])) return null

  // Respostas de botões, listas e menus (inclui anúncios com botão).
  const reply =
    m.buttonsResponseMessage?.selectedDisplayText ??
    m.templateButtonReplyMessage?.selectedDisplayText ??
    m.listResponseMessage?.title ??
    m.interactiveResponseMessage?.body?.text
  if (reply) return textContent(reply)

  // Mensagens com botões/modelos (empresas e anúncios).
  const template = m.templateMessage?.hydratedTemplate ?? m.templateMessage?.hydratedFourRowTemplate ?? m.templateMessage?.fourRowTemplate
  const rich =
    template?.hydratedContentText ??
    template?.content?.namespace ??
    m.buttonsMessage?.contentText ??
    m.listMessage?.description ??
    m.listMessage?.title ??
    m.interactiveMessage?.body?.text ??
    m.interactiveMessage?.header?.title
  if (rich) return textContent(rich)

  const poll = m.pollCreationMessage ?? m.pollCreationMessageV2 ?? m.pollCreationMessageV3 ?? m.pollCreationMessageV5
  if (poll) return textContent(pollText(poll))
  if (m.eventMessage) {
    const when = m.eventMessage.startTime ? new Date(Number(m.eventMessage.startTime) * 1000).toLocaleString("pt-BR") : ""
    return textContent([`📅 Evento: ${m.eventMessage.name ?? ""}`, when, m.eventMessage.description].filter(Boolean).join("\n"))
  }
  if (m.groupInviteMessage) return textContent(`Convite para o grupo ${m.groupInviteMessage.groupName ?? ""}`.trim())
  if (m.productMessage) {
    const product = m.productMessage.product ?? {}
    return textContent(`🛍️ Produto: ${product.title ?? ""}${product.description ? `\n${product.description}` : ""}`)
  }
  if (m.orderMessage) return textContent(`🛒 Pedido${m.orderMessage.message ? `: ${m.orderMessage.message}` : ""}`)
  if (m.stickerPackMessage) return textContent("Pacote de figurinhas")
  if (m.call || m.bcallMessage || m.callLogMesssage || m.scheduledCallCreationMessage) return textContent("📞 Chamada de voz/vídeo")

  const keys = Object.keys(m).filter((k) => !META_KEYS.has(k))
  // Só metadados (ex.: mensagem que o WhatsApp ainda não descriptografou): ignora.
  if (keys.length === 0) return null
  console.warn("[crm] tipo de mensagem não suportado:", keys.join(", "))
  return { kind: CrmMessageKind.OTHER, text: `${UNSUPPORTED_PREFIX}: ${keys.join(", ")}`, mimeType: null, fileName: null, hasMedia: false }
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
  // Primeira mensagem da conversa (e recente, para não disparar em sincronização de histórico).
  const isFirstMessage =
    !fromMe &&
    Date.now() - sentAt.getTime() < 10 * 60_000 &&
    (await prisma.crmMessage.count({ where: { conversationId: conversation.id } })) === 0

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

  if (!fromMe) {
    try {
      const tagged = await applyTagRules(contact, content.text)
      if (isFirstMessage) await sendWelcomeMessage(instance, tagged, { id: conversation.id, remoteJid })
    } catch (err) {
      console.error("[crm] automação falhou:", err)
    }
  }

  if (!fromMe && !contact.avatarUrl && !remoteJid.endsWith("@lid")) {
    evolution
      .profilePicture(instance.instanceName, contact.phone)
      .then((url) => (url ? prisma.crmContact.update({ where: { id: contact.id }, data: { avatarUrl: url } }) : null))
      .catch(() => {})
  }

  if (content.hasMedia) {
    await attachIncomingMedia(instance, message, content, key.id, typeof data.message?.base64 === "string" ? data.message.base64 : null)
  }
}

/** Baixa a mídia de uma mensagem recebida (base64 do webhook ou da Evolution) e grava no storage. */
async function attachIncomingMedia(
  instance: WhatsAppInstance,
  message: { id: string; conversationId: string },
  content: ParsedContent,
  externalId: string,
  inlineBase64: string | null,
) {
  let base64 = inlineBase64
  let mimeType = content.mimeType
  if (!base64) {
    const downloaded = await evolution.downloadMedia(instance.instanceName, externalId)
    if (downloaded.ok) {
      base64 = downloaded.data.base64
      mimeType = mimeType ?? downloaded.data.mimetype
    }
  }
  if (!base64) return
  const storageKey = await storeMessageMedia(instance.clinicId, message.conversationId, message.id, base64, mimeType, content.fileName)
  if (storageKey) {
    await prisma.crmMessage.update({
      where: { id: message.id },
      data: { mediaStorageKey: storageKey, mediaMimeType: mimeType },
    })
  }
}

/**
 * Tenta ler de novo uma mensagem gravada como "não suportada", buscando o
 * conteúdo original na Evolution pelo id do WhatsApp.
 */
export async function reloadUnsupportedMessage(instance: WhatsAppInstance, messageId: string) {
  const message = await prisma.crmMessage.findFirst({ where: { id: messageId, clinicId: instance.clinicId } })
  if (!message?.externalId) return { ok: false as const, error: "Mensagem sem identificação do WhatsApp." }
  const found = await evolution.findMessage(instance.instanceName, message.externalId)
  if (!found.ok) return { ok: false as const, error: found.error }
  if (!found.data) return { ok: false as const, error: "A Evolution não guarda mais esta mensagem." }

  const content = parseMessageContent(found.data.message)
  if (!content) return { ok: false as const, error: "Esta mensagem não tem conteúdo para mostrar (reação, voto ou aviso do WhatsApp)." }
  if (content.kind === CrmMessageKind.OTHER && isUnsupportedText(content.text)) {
    return { ok: false as const, error: `Ainda não suportado (${content.text?.replace(`${UNSUPPORTED_PREFIX}: `, "")}).` }
  }

  const updated = await prisma.crmMessage.update({
    where: { id: message.id },
    data: { kind: content.kind, text: content.text, mediaMimeType: content.mimeType, mediaFileName: content.fileName },
  })
  if (content.hasMedia) {
    await attachIncomingMedia(instance, updated, content, message.externalId, found.data.message?.base64 ?? null)
  }
  return { ok: true as const, message: await prisma.crmMessage.findUniqueOrThrow({ where: { id: message.id } }) }
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

// ---------------------------------------------------------------------------
// Verificação real da conexão
// ---------------------------------------------------------------------------

const stateCheckedAt = new Map<string, number>()
const STATE_CHECK_INTERVAL_MS = 60_000

/**
 * Confere na Evolution se a instância marcada como conectada continua
 * conectada (no máximo uma vez por minuto por clínica). O status do banco
 * dependia só do webhook `connection.update`, que pode não chegar.
 */
export async function verifyInstanceConnection(instance: WhatsAppInstance | null) {
  if (!instance || instance.status !== WhatsAppConnectionStatus.CONNECTED) return instance
  const last = stateCheckedAt.get(instance.id) ?? 0
  if (Date.now() - last < STATE_CHECK_INTERVAL_MS) return instance
  stateCheckedAt.set(instance.id, Date.now())

  const state = await evolution.connectionState(instance.instanceName)
  // Falha de rede/servidor: não muda nada (evita falso alarme).
  if (!state.ok && state.status !== 404) return instance
  const current = state.ok ? state.data.state : "close"
  if (current === "open") return instance
  return prisma.whatsAppInstance.update({
    where: { id: instance.id },
    data: {
      status: current === "connecting" ? WhatsAppConnectionStatus.CONNECTING : WhatsAppConnectionStatus.DISCONNECTED,
    },
  })
}

/**
 * Número que o WhatsApp reconhece para um telefone (resolve o nono dígito).
 * Retorna null se o número não tem WhatsApp, ou o próprio número se a
 * verificação não estiver disponível.
 */
export async function resolveWhatsAppNumber(instanceName: string, phone: string) {
  const variants = phoneVariants(phone).filter((v) => v.startsWith("55") || v.length > 11)
  const check = await evolution.checkNumbers(instanceName, variants.length ? variants : [toWhatsAppNumber(phone)])
  if (!check.ok) return { jid: null as string | null, number: toWhatsAppNumber(phone), verified: false }
  const found = check.data.find((r) => r.exists && r.jid)
  if (!found) return { jid: null, number: null as string | null, verified: true }
  return { jid: found.jid!, number: found.jid!.split("@")[0], verified: true }
}
