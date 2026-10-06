/**
 * Cliente das rotas /api/crm (atendimento via WhatsApp / Evolution API).
 */

export type WhatsAppStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED"

export type WhatsAppInstance = {
  status: WhatsAppStatus
  qrCode: string | null
  qrUpdatedAt: string | null
  phoneNumber: string | null
  profileName: string | null
  connectedAt: string | null
}

export type ConversationFilter = "open" | "unread" | "mine" | "unassigned" | "closed" | "all"

export type ConversationContact = {
  id: string
  name: string
  phone: string
  avatarUrl: string | null
  tags: string[]
  leadId: string | null
  patientId: string | null
}

export type Conversation = {
  id: string
  contactId: string
  remoteJid: string
  status: "OPEN" | "CLOSED"
  assignedUserId: string | null
  unreadCount: number
  lastMessageAt: string | null
  lastMessagePreview: string | null
  lastInboundAt: string | null
  closedAt: string | null
  createdAt: string
  contact: ConversationContact
  assignedUser: { id: string; name: string } | null
}

export type ConversationCounts = {
  open: number
  closed: number
  unread: number
  mine: number
  unassigned: number
}

export type MessageKind = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "STICKER" | "LOCATION" | "NOTE" | "OTHER"
export type MessageStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "RECEIVED"

export type Message = {
  id: string
  direction: "INBOUND" | "OUTBOUND"
  kind: MessageKind
  text: string | null
  hasMedia: boolean
  mediaMimeType: string | null
  mediaFileName: string | null
  status: MessageStatus
  errorReason: string | null
  sentAt: string
  sentBy: { id: string; name: string } | null
}

export type Contact = {
  id: string
  name: string
  phone: string
  email: string | null
  pushName: string | null
  avatarUrl: string | null
  tags: string[]
  notes: string | null
  source: string
  leadId: string | null
  patientId: string | null
  createdAt: string
  updatedAt: string
  lead: { id: string; name: string; stage: string } | null
  patient: { id: string; name: string } | null
  conversation: { id: string; status: "OPEN" | "CLOSED"; lastMessageAt: string | null; unreadCount: number } | null
}

export type QuickReply = { id: string; shortcut: string; content: string }

export type TeamMember = { id: string; name: string; role: string; status: string }

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      json?.error?.message ??
      (res.status === 403 ? "Você não possui permissão para esta ação." : `Erro ${res.status} ao falar com o servidor.`)
    throw new ApiError(res.status, json?.error?.code ?? "ERROR", message)
  }
  return json as T
}

/** Envio de mensagem: devolve a mensagem mesmo quando a Evolution recusa (status FAILED). */
async function sendRequest(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  if (json?.message) return { message: json.message as Message, error: json.error?.message as string | undefined }
  const fallback = res.status === 413 ? "Arquivo grande demais para envio (limite de 10 MB)." : `Erro ${res.status}`
  throw new ApiError(res.status, json?.error?.code ?? "ERROR", json?.error?.message ?? fallback)
}

export const crmApi = {
  whatsappStatus: () => request<{ configured: boolean; instance: WhatsAppInstance | null }>("GET", "/api/crm/whatsapp"),
  connectWhatsapp: () => request<{ instance: WhatsAppInstance }>("POST", "/api/crm/whatsapp/connect", {}),
  disconnectWhatsapp: () => request<{ instance: WhatsAppInstance | null }>("POST", "/api/crm/whatsapp/disconnect", {}),

  listConversations: (filter: ConversationFilter, search: string) => {
    const params = new URLSearchParams({ filter })
    if (search.trim()) params.set("search", search.trim())
    return request<{ conversations: Conversation[]; counts: ConversationCounts }>("GET", `/api/crm/conversations?${params}`)
  },
  unreadTotal: () => request<{ unread: number }>("GET", "/api/crm/unread"),
  getConversation: (id: string) =>
    request<{ conversation: Conversation; messages: Message[] }>("GET", `/api/crm/conversations/${id}`),
  markRead: (id: string) => request<{ ok: true }>("POST", `/api/crm/conversations/${id}/read`, {}),
  updateConversation: (id: string, patch: { status?: "OPEN" | "CLOSED"; assignedUserId?: string | null }) =>
    request<{ conversation: Conversation }>("PATCH", `/api/crm/conversations/${id}`, patch),
  sendText: (id: string, text: string, note = false) =>
    sendRequest(`/api/crm/conversations/${id}/messages`, { text, note }),
  sendMedia: (id: string, input: { fileName: string; mimeType: string; base64: string; caption?: string }) =>
    sendRequest(`/api/crm/conversations/${id}/media`, input),
  retryMessage: (id: string) => sendRequest(`/api/crm/messages/${id}/retry`, {}),
  mediaUrl: (messageId: string) => `/api/crm/messages/${messageId}/media`,

  listContacts: (search: string, tag?: string) => {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    if (tag) params.set("tag", tag)
    return request<{ contacts: Contact[] }>("GET", `/api/crm/contacts?${params}`)
  },
  getContact: (id: string) => request<{ contact: Contact }>("GET", `/api/crm/contacts/${id}`),
  listTags: () => request<{ tags: { tag: string; count: number }[] }>("GET", "/api/crm/contacts/tags"),
  createContact: (input: { name: string; phone: string; email?: string; tags?: string[]; notes?: string }) =>
    request<{ contact: Contact }>("POST", "/api/crm/contacts", input),
  updateContact: (
    id: string,
    patch: Partial<{ name: string; email: string | null; tags: string[]; notes: string | null; patientId: string | null; leadId: string | null }>,
  ) => request<{ contact: Contact }>("PATCH", `/api/crm/contacts/${id}`, patch),
  deleteContact: (id: string) => request<{ ok: true }>("DELETE", `/api/crm/contacts/${id}`),
  openConversation: (contactId: string) =>
    request<{ conversation: Conversation }>("POST", `/api/crm/contacts/${contactId}/conversation`, {}),
  createLeadFromContact: (contactId: string, input: { interest: string; value?: number }) =>
    request<{ contact: Contact }>("POST", `/api/crm/contacts/${contactId}/lead`, input),

  listQuickReplies: () => request<{ quickReplies: QuickReply[] }>("GET", "/api/crm/quick-replies"),
  createQuickReply: (input: { shortcut: string; content: string }) =>
    request<{ quickReply: QuickReply }>("POST", "/api/crm/quick-replies", input),
  deleteQuickReply: (id: string) => request<{ ok: true }>("DELETE", `/api/crm/quick-replies/${id}`),

  listTeam: () => request<{ members: TeamMember[] }>("GET", "/api/team"),
  searchPatients: (search: string) =>
    request<{ options: { id: string; name: string; phone: string | null }[] }>(
      "GET",
      `/api/patients/options?${new URLSearchParams({ search, limit: "10" })}`,
    ),
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return `+${digits}`
}

export function relativeTime(iso: string | null) {
  if (!iso) return ""
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24 && date.getDate() === new Date().getDate()) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return "ontem"
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(",") + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
