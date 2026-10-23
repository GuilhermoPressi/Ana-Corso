/**
 * Automações do CRM:
 *  - webhook de vendas (Hotmart, Kiwify ou formato genérico): a compradora entra
 *    no pipeline/etapa do produto, etiquetada;
 *  - mensagem automática de apresentação para contatos novos;
 *  - etiquetas automáticas por palavra-chave nas mensagens recebidas.
 */
import crypto from "node:crypto"
import {
  CrmMessageDirection,
  CrmMessageKind,
  CrmMessageStatus,
  CrmPipelineKind,
  CrmStageType,
  LeadPurchaseStatus,
  Prisma,
  type CrmContact,
  type WhatsAppInstance,
} from "@prisma/client"
import { config } from "../config.js"
import { prisma } from "../db.js"
import { evolution } from "./evolution.js"
import { ensureDefaultPipeline, legacyFor } from "./pipelines.js"

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

export type TagRule = { keywords: string[]; tag: string }

export async function getAutomationSettings(clinicId: string) {
  const existing = await prisma.crmAutomationSettings.findUnique({ where: { clinicId } })
  if (existing) return existing
  try {
    return await prisma.crmAutomationSettings.create({
      data: { clinicId, salesWebhookToken: crypto.randomBytes(24).toString("base64url") },
    })
  } catch {
    return prisma.crmAutomationSettings.findUniqueOrThrow({ where: { clinicId } })
  }
}

export function salesWebhookUrl(token: string) {
  const base = (process.env.PUBLIC_API_URL || config.FRONTEND_URL).trim().replace(/\/+$/, "")
  return `${base}/api/webhooks/sales/${token}`
}

export function parseTagRules(value: Prisma.JsonValue): TagRule[] {
  if (!Array.isArray(value)) return []
  return value
    .map((rule) => {
      const r = rule as { keywords?: unknown; tag?: unknown }
      const keywords = Array.isArray(r.keywords) ? r.keywords.map(String).map((k) => k.trim()).filter(Boolean) : []
      const tag = typeof r.tag === "string" ? r.tag.trim().toLowerCase() : ""
      return { keywords, tag }
    })
    .filter((r) => r.keywords.length > 0 && r.tag)
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

async function addTags(contact: CrmContact, tags: string[], remove: string[] = []) {
  const wanted = tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
  const next = [...new Set([...contact.tags.filter((t) => !remove.includes(t)), ...wanted])]
  if (next.length === contact.tags.length && next.every((t) => contact.tags.includes(t))) return contact
  if (wanted.length) {
    await prisma.crmTag.createMany({ data: wanted.map((name) => ({ clinicId: contact.clinicId, name })), skipDuplicates: true })
  }
  return prisma.crmContact.update({ where: { id: contact.id }, data: { tags: next } })
}

// ---------------------------------------------------------------------------
// Mensagens recebidas: etiquetas e apresentação
// ---------------------------------------------------------------------------

/** Aplica as regras de etiqueta ao texto de uma mensagem recebida. */
export async function applyTagRules(contact: CrmContact, text: string | null | undefined) {
  if (!text?.trim()) return contact
  const settings = await prisma.crmAutomationSettings.findUnique({ where: { clinicId: contact.clinicId } })
  if (!settings) return contact
  const body = normalize(text)
  const tags = parseTagRules(settings.tagRules)
    .filter((rule) => rule.keywords.some((k) => body.includes(normalize(k))))
    .map((rule) => rule.tag)
  return tags.length ? addTags(contact, tags) : contact
}

/** Envia a mensagem de apresentação para um contato que acabou de chegar. */
export async function sendWelcomeMessage(
  instance: WhatsAppInstance,
  contact: CrmContact,
  conversation: { id: string; remoteJid: string },
) {
  const settings = await prisma.crmAutomationSettings.findUnique({ where: { clinicId: instance.clinicId } })
  const template = settings?.welcomeMessage?.trim()
  if (!settings?.welcomeEnabled || !template) return
  if (settings.welcomeSkipPatients && contact.patientId) return

  const firstName = (contact.pushName || contact.name || "").split(" ")[0]
  const text = template.replaceAll("{nome}", /^\d+$/.test(firstName) ? "" : firstName).replace(/\s+([,!.?])/g, "$1")
  const number = conversation.remoteJid.endsWith("@lid") ? conversation.remoteJid : conversation.remoteJid.split("@")[0]

  const sent = await evolution.sendText(instance.instanceName, number, text)
  const message = await prisma.crmMessage.create({
    data: {
      clinicId: instance.clinicId,
      conversationId: conversation.id,
      externalId: sent.ok ? sent.data.externalId : null,
      direction: CrmMessageDirection.OUTBOUND,
      kind: CrmMessageKind.TEXT,
      text,
      automated: true,
      status: sent.ok ? CrmMessageStatus.SENT : CrmMessageStatus.FAILED,
      errorReason: sent.ok ? null : sent.error,
    },
  })
  await prisma.crmConversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: message.sentAt, lastMessagePreview: text.slice(0, 160) },
  })
}

// ---------------------------------------------------------------------------
// Webhook de vendas
// ---------------------------------------------------------------------------

type SaleEvent = {
  platform: "hotmart" | "kiwify" | "generic"
  status: LeadPurchaseStatus | null
  name: string | null
  email: string | null
  phone: string | null
  productExternalId: string | null
  productName: string | null
  value: number | null
  orderId: string | null
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null)
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN
  return Number.isFinite(n) ? n : null
}

function hotmartStatus(event: string): LeadPurchaseStatus | null {
  if (["PURCHASE_APPROVED", "PURCHASE_COMPLETE"].includes(event)) return LeadPurchaseStatus.PURCHASED
  if (["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED", "PURCHASE_PROTEST"].includes(event)) {
    return LeadPurchaseStatus.REFUNDED
  }
  if (event === "PURCHASE_OUT_OF_SHOPPING_CART") return LeadPurchaseStatus.CHECKOUT_ABANDONED
  if (["PURCHASE_BILLET_PRINTED", "PURCHASE_DELAYED", "PURCHASE_EXPIRED"].includes(event)) {
    return LeadPurchaseStatus.CHECKOUT_ABANDONED
  }
  return null
}

function kiwifyStatus(type: string, status: string): LeadPurchaseStatus | null {
  const t = type.toLowerCase()
  const s = status.toLowerCase()
  if (t.includes("approved") || s === "paid" || s === "approved") return LeadPurchaseStatus.PURCHASED
  if (t.includes("refund") || t.includes("chargeback") || ["refunded", "chargedback"].includes(s)) return LeadPurchaseStatus.REFUNDED
  if (t.includes("abandon") || s === "abandoned" || s === "waiting_payment" || s === "refused") {
    return LeadPurchaseStatus.CHECKOUT_ABANDONED
  }
  return null
}

function genericStatus(status: string | null): LeadPurchaseStatus | null {
  const s = normalize(status ?? "")
  if (!s) return LeadPurchaseStatus.PURCHASED
  if (/(comprou|compra|paid|pago|aprovad|approved|purchased|complete)/.test(s)) return LeadPurchaseStatus.PURCHASED
  if (/(reembols|refund|chargeback|cancel)/.test(s)) return LeadPurchaseStatus.REFUNDED
  if (/(abandon|carrinho|checkout|boleto|pix)/.test(s)) return LeadPurchaseStatus.CHECKOUT_ABANDONED
  if (/(interess|lead)/.test(s)) return LeadPurchaseStatus.INTERESTED
  return null
}

/** Converte o payload da plataforma em um evento padronizado. */
export function parseSaleEvent(payload: any): SaleEvent | null {
  if (!payload || typeof payload !== "object") return null

  // Hotmart (webhook 2.0)
  if (typeof payload.event === "string" && payload.data && typeof payload.data === "object") {
    const d = payload.data
    const buyer = d.buyer ?? {}
    return {
      platform: "hotmart",
      status: hotmartStatus(payload.event),
      name: str(buyer.name),
      email: str(buyer.email),
      phone: str(buyer.checkout_phone) ?? str(buyer.phone),
      productExternalId: str(d.product?.id),
      productName: str(d.product?.name),
      value: num(d.purchase?.price?.value) ?? num(d.purchase?.full_price?.value),
      orderId: str(d.purchase?.transaction),
    }
  }

  // Kiwify
  if (payload.Customer || payload.webhook_event_type || payload.order_status) {
    const c = payload.Customer ?? {}
    const p = payload.Product ?? {}
    const cents = num(payload.Commissions?.charge_amount) ?? num(payload.Commissions?.product_base_price)
    return {
      platform: "kiwify",
      status: kiwifyStatus(String(payload.webhook_event_type ?? ""), String(payload.order_status ?? "")),
      name: str(c.full_name) ?? str(c.first_name),
      email: str(c.email),
      phone: str(c.mobile) ?? str(c.phone),
      productExternalId: str(p.product_id),
      productName: str(p.product_name),
      value: cents !== null ? cents / 100 : null,
      orderId: str(payload.order_id),
    }
  }

  // Genérico / carrinho abandonado Kiwify ({ name, email, phone, product_name, status })
  const name = str(payload.name) ?? str(payload.nome) ?? str(payload.customer_name)
  const phone = str(payload.phone) ?? str(payload.telefone) ?? str(payload.whatsapp) ?? str(payload.mobile)
  const email = str(payload.email)
  if (!name && !phone && !email) return null
  return {
    platform: "generic",
    status: genericStatus(str(payload.status) ?? str(payload.event)),
    name,
    email,
    phone,
    productExternalId: str(payload.product_id) ?? str(payload.productId),
    productName: str(payload.product) ?? str(payload.produto) ?? str(payload.product_name),
    value: num(payload.value) ?? num(payload.valor) ?? num(payload.price),
    orderId: str(payload.order_id) ?? str(payload.orderId) ?? str(payload.transaction),
  }
}

const STATUS_TAG: Partial<Record<LeadPurchaseStatus, string>> = {
  CHECKOUT_ABANDONED: "checkout abandonado",
  REFUNDED: "reembolso",
}

/**
 * Processa uma venda: cria/atualiza contato, produto e lead no pipeline/etapa
 * do produto. Retorna um resumo do que foi feito.
 */
export async function processSaleEvent(clinicId: string, event: SaleEvent) {
  if (!event.status) return { ignored: true, reason: "Evento sem ação no CRM." }

  // Produto: pelo código da plataforma, senão pelo nome; cria se não existir.
  let product = event.productExternalId
    ? await prisma.crmProduct.findFirst({ where: { clinicId, externalIds: { has: event.productExternalId } } })
    : null
  if (!product && event.productName) {
    product = await prisma.crmProduct.findFirst({
      where: { clinicId, name: { equals: event.productName, mode: "insensitive" } },
    })
  }
  if (!product && (event.productName || event.productExternalId)) {
    product = await prisma.crmProduct.create({
      data: {
        clinicId,
        name: event.productName ?? `Produto ${event.productExternalId}`,
        price: event.value ?? 0,
        externalIds: event.productExternalId ? [event.productExternalId] : [],
      },
    })
  } else if (product && event.productExternalId && !product.externalIds.includes(event.productExternalId)) {
    product = await prisma.crmProduct.update({
      where: { id: product.id },
      data: { externalIds: [...product.externalIds, event.productExternalId] },
    })
  }

  // Pipeline/etapas de destino.
  const pipeline =
    (product?.pipelineId
      ? await prisma.crmPipeline.findFirst({ where: { id: product.pipelineId, clinicId }, include: { stages: true } })
      : null) ??
    (await prisma.crmPipeline.findFirst({
      where: { clinicId, kind: CrmPipelineKind.DIGITAL },
      include: { stages: true },
      orderBy: { position: "asc" },
    })) ??
    (await ensureDefaultPipeline(clinicId))
  const stages = [...pipeline.stages].sort((a, b) => a.position - b.position)
  const firstOpen = stages.find((s) => s.type === CrmStageType.OPEN) ?? stages[0]
  const wonStage =
    (product?.buyerStageId ? stages.find((s) => s.id === product!.buyerStageId) : undefined) ??
    stages.find((s) => s.type === CrmStageType.WON) ??
    firstOpen
  const lostStage = stages.find((s) => s.type === CrmStageType.LOST)

  // Contato do WhatsApp (precisa de telefone).
  let contact: CrmContact | null = null
  if (event.phone && event.phone.replace(/\D/g, "").length >= 10) {
    const { findOrCreateContact } = await import("./crm-inbox.js")
    contact = await findOrCreateContact(clinicId, event.phone, { name: event.name, source: event.platform })
    if (event.email && !contact.email) {
      contact = await prisma.crmContact.update({ where: { id: contact.id }, data: { email: event.email } })
    }
    const buyerTag = product?.buyerTag ?? "compradora"
    if (event.status === LeadPurchaseStatus.PURCHASED) {
      contact = await addTags(contact, [buyerTag], [STATUS_TAG.CHECKOUT_ABANDONED!])
    } else if (event.status === LeadPurchaseStatus.REFUNDED) {
      contact = await addTags(contact, [STATUS_TAG.REFUNDED!], [buyerTag])
    } else if (event.status === LeadPurchaseStatus.CHECKOUT_ABANDONED && !contact.tags.includes(buyerTag)) {
      contact = await addTags(contact, [STATUS_TAG.CHECKOUT_ABANDONED!])
    }
  }

  // Lead: pelo pedido, pelo contato + produto, ou pelo e-mail + produto.
  const orFilters: Prisma.LeadWhereInput[] = []
  if (event.orderId) orFilters.push({ externalOrderId: event.orderId })
  if (contact) orFilters.push({ crmContacts: { some: { id: contact.id } }, productId: product?.id ?? null })
  if (event.email) orFilters.push({ email: { equals: event.email, mode: "insensitive" }, productId: product?.id ?? null })
  let lead = orFilters.length
    ? await prisma.lead.findFirst({ where: { clinicId, archivedAt: null, OR: orFilters }, orderBy: { createdAt: "desc" } })
    : null

  const target =
    event.status === LeadPurchaseStatus.PURCHASED
      ? wonStage
      : event.status === LeadPurchaseStatus.REFUNDED
        ? (lostStage ?? firstOpen)
        : firstOpen
  const now = new Date()

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        clinicId,
        name: event.name ?? contact?.name ?? event.email ?? "Compradora",
        phone: contact?.phone ?? event.phone,
        email: event.email,
        interest: product?.name ?? "Produto digital",
        source: event.platform === "hotmart" ? "Hotmart" : event.platform === "kiwify" ? "Kiwify" : "Venda online",
        value: event.value ?? (product ? Number(product.price) : 0),
        pipelineId: target.pipelineId,
        stageId: target.id,
        stage: legacyFor(target),
        productId: product?.id ?? null,
        purchaseStatus: event.status,
        externalOrderId: event.orderId,
        ...(event.status === LeadPurchaseStatus.PURCHASED ? { wonAt: now } : {}),
      },
    })
  } else {
    // Carrinho abandonado não "rebaixa" quem já comprou.
    const keepStage =
      event.status === LeadPurchaseStatus.CHECKOUT_ABANDONED && lead.purchaseStatus === LeadPurchaseStatus.PURCHASED
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        purchaseStatus: keepStage ? lead.purchaseStatus : event.status,
        productId: product?.id ?? lead.productId,
        externalOrderId: event.orderId ?? lead.externalOrderId,
        lastContact: now,
        ...(event.value ? { value: event.value } : {}),
        ...(!keepStage && event.status !== LeadPurchaseStatus.CHECKOUT_ABANDONED
          ? {
              pipelineId: target.pipelineId,
              stageId: target.id,
              stage: legacyFor(target),
              ...(event.status === LeadPurchaseStatus.PURCHASED ? { wonAt: now } : { lostAt: now }),
            }
          : {}),
      },
    })
  }

  if (contact && !contact.leadId) {
    await prisma.crmContact.update({ where: { id: contact.id }, data: { leadId: lead.id } })
  }

  return { ok: true, leadId: lead.id, contactId: contact?.id ?? null, productId: product?.id ?? null, status: event.status }
}
