/**
 * Cliente HTTP da Evolution API (v2).
 *
 * A plataforma usa um único servidor Evolution (EVOLUTION_API_URL + chave
 * global EVOLUTION_API_KEY) e cria uma instância por clínica. As chamadas
 * nunca lançam exceção: devolvem `{ ok: false, error }` para que as rotas
 * decidam como responder ao usuário.
 */

export const EVOLUTION_WEBHOOK_EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
] as const

export type EvolutionResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }

export function evolutionConfig() {
  const baseUrl = (process.env.EVOLUTION_API_URL || "").trim().replace(/\/+$/, "")
  const apiKey = (process.env.EVOLUTION_API_KEY || "").trim()
  return { baseUrl, apiKey, configured: Boolean(baseUrl && apiKey) }
}

async function evoFetch<T = any>(
  method: "GET" | "POST" | "DELETE" | "PUT",
  path: string,
  body?: unknown,
  timeoutMs = 20_000,
): Promise<EvolutionResult<T>> {
  const { baseUrl, apiKey, configured } = evolutionConfig()
  if (!configured) {
    return { ok: false, status: 0, error: "Evolution API não configurada no servidor." }
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await res.text()
    let json: any = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }

    if (!res.ok) {
      const raw = json?.response?.message ?? json?.message ?? json?.error ?? text
      const message = Array.isArray(raw) ? raw.flat().join(", ") : String(raw || `HTTP ${res.status}`)
      return { ok: false, status: res.status, error: message.slice(0, 500) }
    }
    return { ok: true, data: json as T }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, status: 0, error: `Falha ao contatar a Evolution API: ${message}` }
  }
}

const enc = encodeURIComponent

function webhookPayload(url: string) {
  return {
    enabled: true,
    url,
    byEvents: false,
    base64: true,
    events: [...EVOLUTION_WEBHOOK_EVENTS],
  }
}

export type EvolutionQr = { base64: string | null; pairingCode: string | null }

function extractQr(data: any): EvolutionQr {
  const source = data?.qrcode ?? data
  const base64 = typeof source?.base64 === "string" && source.base64 ? source.base64 : null
  const pairingCode = typeof source?.pairingCode === "string" ? source.pairingCode : null
  return { base64, pairingCode }
}

export const evolution = {
  async createInstance(instanceName: string, webhookUrl: string) {
    const res = await evoFetch("POST", "/instance/create", {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      groupsIgnore: true,
      webhook: webhookPayload(webhookUrl),
    })
    if (!res.ok) return res
    return { ok: true as const, data: extractQr(res.data) }
  },

  setWebhook(instanceName: string, webhookUrl: string) {
    return evoFetch("POST", `/webhook/set/${enc(instanceName)}`, { webhook: webhookPayload(webhookUrl) })
  },

  async connect(instanceName: string) {
    const res = await evoFetch("GET", `/instance/connect/${enc(instanceName)}`)
    if (!res.ok) return res
    return { ok: true as const, data: extractQr(res.data) }
  },

  async connectionState(instanceName: string) {
    const res = await evoFetch<any>("GET", `/instance/connectionState/${enc(instanceName)}`)
    if (!res.ok) return res
    const state = String(res.data?.instance?.state ?? res.data?.state ?? "close")
    return { ok: true as const, data: { state } }
  },

  /** Número e nome do perfil conectado (formatos v2.0 e v2.2+). */
  async instanceInfo(instanceName: string) {
    const res = await evoFetch<any>("GET", `/instance/fetchInstances?instanceName=${enc(instanceName)}`)
    if (!res.ok) return res
    const list = Array.isArray(res.data) ? res.data : [res.data]
    const item = list.find(Boolean) ?? {}
    const inst = item.instance ?? item
    const ownerJid: string = inst.ownerJid ?? inst.owner ?? ""
    return {
      ok: true as const,
      data: {
        phoneNumber: ownerJid ? ownerJid.split("@")[0].split(":")[0] : null,
        profileName: (inst.profileName as string | undefined) ?? null,
      },
    }
  },

  logout(instanceName: string) {
    return evoFetch("DELETE", `/instance/logout/${enc(instanceName)}`)
  },

  async sendText(instanceName: string, number: string, text: string) {
    const res = await evoFetch<any>("POST", `/message/sendText/${enc(instanceName)}`, { number, text })
    if (!res.ok) return res
    return { ok: true as const, data: { externalId: (res.data?.key?.id as string | undefined) ?? null } }
  },

  async sendMedia(
    instanceName: string,
    input: {
      number: string
      mediatype: "image" | "video" | "document"
      mimetype: string
      base64: string
      fileName: string
      caption?: string
    },
  ) {
    const res = await evoFetch<any>(
      "POST",
      `/message/sendMedia/${enc(instanceName)}`,
      {
        number: input.number,
        mediatype: input.mediatype,
        mimetype: input.mimetype,
        media: input.base64,
        fileName: input.fileName,
        caption: input.caption || undefined,
      },
      60_000,
    )
    if (!res.ok) return res
    return { ok: true as const, data: { externalId: (res.data?.key?.id as string | undefined) ?? null } }
  },

  async sendAudio(instanceName: string, number: string, base64: string) {
    const res = await evoFetch<any>(
      "POST",
      `/message/sendWhatsAppAudio/${enc(instanceName)}`,
      { number, audio: base64 },
      60_000,
    )
    if (!res.ok) return res
    return { ok: true as const, data: { externalId: (res.data?.key?.id as string | undefined) ?? null } }
  },

  async downloadMedia(instanceName: string, messageId: string) {
    const res = await evoFetch<any>(
      "POST",
      `/chat/getBase64FromMediaMessage/${enc(instanceName)}`,
      { message: { key: { id: messageId } }, convertToMp4: false },
      60_000,
    )
    if (!res.ok) return res
    const base64 = typeof res.data?.base64 === "string" ? res.data.base64 : null
    if (!base64) return { ok: false as const, status: 0, error: "Mídia indisponível." }
    return { ok: true as const, data: { base64, mimetype: (res.data?.mimetype as string | undefined) ?? null } }
  },

  markAsRead(instanceName: string, items: { remoteJid: string; id: string }[]) {
    return evoFetch("POST", `/chat/markMessageAsRead/${enc(instanceName)}`, {
      readMessages: items.map((item) => ({ remoteJid: item.remoteJid, fromMe: false, id: item.id })),
    })
  },

  async profilePicture(instanceName: string, number: string) {
    const res = await evoFetch<any>("POST", `/chat/fetchProfilePictureUrl/${enc(instanceName)}`, { number }, 10_000)
    if (!res.ok) return null
    return (res.data?.profilePictureUrl as string | undefined) ?? null
  },
}
