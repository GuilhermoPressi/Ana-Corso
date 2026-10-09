/**
 * Integração com o Google Agenda (somente envio: app → Google).
 *
 * Cada usuário conecta a própria conta Google (OAuth). Os agendamentos são
 * enviados para a agenda de quem é a profissional do agendamento (ou de quem
 * o criou); se essa pessoa não conectou o Google, vão para a agenda da dona
 * ou administradora da clínica que tiver conectado.
 *
 * As chamadas nunca lançam exceção para quem chama: erros ficam gravados em
 * `schedule_events.google_sync_error` / `google_calendar_accounts.last_error`.
 */
import {
  ClinicRole,
  ScheduleEventKind,
  ScheduleEventStatus,
  type GoogleCalendarAccount,
  type ScheduleEvent,
} from "@prisma/client"
import { config } from "../config.js"
import { prisma } from "../db.js"
import { decryptSecret, encryptSecret } from "../utils/crypto.js"

const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events"]

// Endereços configuráveis apenas para testes locais.
const AUTH_URL = process.env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token"
const REVOKE_URL = process.env.GOOGLE_REVOKE_URL || "https://oauth2.googleapis.com/revoke"
const USERINFO_URL = process.env.GOOGLE_USERINFO_URL || "https://openidconnect.googleapis.com/v1/userinfo"
const CALENDAR_API = process.env.GOOGLE_CALENDAR_API || "https://www.googleapis.com/calendar/v3"

export function googleConfig() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim()
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim()
  const base = (process.env.PUBLIC_API_URL || config.FRONTEND_URL).trim().replace(/\/+$/, "")
  return {
    clientId,
    clientSecret,
    redirectUri: `${base}/api/integrations/google/callback`,
    frontendUrl: config.FRONTEND_URL.replace(/\/+$/, ""),
    configured: Boolean(clientId && clientSecret),
  }
}

export function buildAuthUrl(state: string) {
  const { clientId, redirectUri } = googleConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // Garante refresh_token mesmo se a pessoa já autorizou antes.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  })
  return `${AUTH_URL}?${params}`
}

type TokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  error?: string
  error_description?: string
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(15_000),
  })
  const json = (await res.json().catch(() => ({}))) as TokenResponse
  return { ok: res.ok, json }
}

/** Troca o `code` do OAuth por tokens e grava a conta do usuário. */
export async function connectAccount(userId: string, code: string) {
  const { clientId, clientSecret, redirectUri } = googleConfig()
  const { ok, json } = await tokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })
  if (!ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Falha ao autorizar com o Google.")
  }

  const info = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${json.access_token}` },
    signal: AbortSignal.timeout(15_000),
  })
    .then((r) => r.json() as Promise<{ email?: string }>)
    .catch(() => ({}) as { email?: string })

  const existing = await prisma.googleCalendarAccount.findUnique({ where: { userId } })
  const refreshTokenEnc = json.refresh_token ? encryptSecret(json.refresh_token) : existing?.refreshTokenEnc
  if (!refreshTokenEnc) {
    throw new Error("O Google não devolveu a permissão de acesso contínuo. Tente conectar novamente.")
  }

  const data = {
    email: info.email ?? existing?.email ?? "conta Google",
    refreshTokenEnc,
    accessTokenEnc: encryptSecret(json.access_token),
    accessTokenExpiresAt: new Date(Date.now() + (json.expires_in - 60) * 1000),
    lastError: null,
  }
  return prisma.googleCalendarAccount.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })
}

export async function disconnectAccount(userId: string) {
  const account = await prisma.googleCalendarAccount.findUnique({ where: { userId } })
  if (!account) return
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: decryptSecret(account.refreshTokenEnc) }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    // revogar é cortesia; a conta é removida de qualquer forma
  }
  await prisma.googleCalendarAccount.delete({ where: { userId } })
}

class GoogleAuthError extends Error {}

async function accessTokenFor(account: GoogleCalendarAccount) {
  if (account.accessTokenEnc && account.accessTokenExpiresAt && account.accessTokenExpiresAt > new Date()) {
    return decryptSecret(account.accessTokenEnc)
  }
  const { clientId, clientSecret } = googleConfig()
  const { ok, json } = await tokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: decryptSecret(account.refreshTokenEnc),
    grant_type: "refresh_token",
  })
  if (!ok || !json.access_token) {
    const message =
      json.error === "invalid_grant"
        ? "A autorização do Google expirou ou foi removida. Conecte o Google Agenda novamente."
        : json.error_description || json.error || "Falha ao renovar o acesso ao Google."
    await prisma.googleCalendarAccount.update({ where: { id: account.id }, data: { lastError: message } })
    throw new GoogleAuthError(message)
  }
  await prisma.googleCalendarAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEnc: encryptSecret(json.access_token),
      accessTokenExpiresAt: new Date(Date.now() + (json.expires_in - 60) * 1000),
      lastError: null,
    },
  })
  return json.access_token
}

async function calendarFetch(account: GoogleCalendarAccount, method: string, path: string, body?: unknown) {
  const token = await accessTokenFor(account)
  const res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(account.calendarId)}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  const json = (await res.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null
  return { status: res.status, ok: res.ok, json }
}

/** Conta Google que deve receber o agendamento. */
async function targetAccount(event: ScheduleEvent) {
  const preferredUserId = event.professionalUserId ?? event.createdByUserId
  if (preferredUserId) {
    const own = await prisma.googleCalendarAccount.findUnique({ where: { userId: preferredUserId } })
    if (own) return own
  }
  return prisma.googleCalendarAccount.findFirst({
    where: {
      user: { clinics: { some: { clinicId: event.clinicId, role: { in: [ClinicRole.OWNER, ClinicRole.ADMIN] } } } },
    },
    orderBy: { createdAt: "asc" },
  })
}

const KIND_LABEL: Record<ScheduleEventKind, string> = {
  PROCEDURE: "Atendimento",
  RETURN: "Retorno",
  EVALUATION: "Avaliação",
  COMMERCIAL_CONTACT: "Contato comercial",
  BLOCK: "Bloqueio",
}

function googleEventBody(event: ScheduleEvent, timeZone: string) {
  const end = new Date(event.startsAt.getTime() + event.durationMin * 60_000)
  const title =
    event.patientName && !event.title.includes(event.patientName) ? `${event.title} · ${event.patientName}` : event.title
  const lines = [
    `Tipo: ${KIND_LABEL[event.kind]}`,
    event.patientName ? `Paciente: ${event.patientName}` : null,
    event.professionalName ? `Profissional: ${event.professionalName}` : null,
    event.room ? `Sala: ${event.room}` : null,
    event.value ? `Valor: R$ ${Number(event.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null,
    event.note ? `\n${event.note}` : null,
    "\nAgendado pelo app Ana Corso.",
  ].filter(Boolean)
  return {
    summary: title,
    description: lines.join("\n"),
    location: event.room ?? undefined,
    start: { dateTime: event.startsAt.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
    status: event.status === ScheduleEventStatus.CANCELLED ? "cancelled" : "confirmed",
    extendedProperties: { private: { anaCorsoEventId: event.id } },
  }
}

async function deleteRemote(userId: string, googleEventId: string) {
  const account = await prisma.googleCalendarAccount.findUnique({ where: { userId } })
  if (!account) return
  const res = await calendarFetch(account, "DELETE", `/events/${encodeURIComponent(googleEventId)}`)
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(res.json?.error?.message || `Google respondeu ${res.status}`)
  }
}

/**
 * Envia o estado atual do agendamento ao Google (cria, atualiza ou remove).
 * Seguro para chamar a qualquer momento; não lança exceção.
 */
export async function syncScheduleEvent(eventId: string) {
  if (!googleConfig().configured) return
  const event = await prisma.scheduleEvent.findUnique({
    where: { id: eventId },
    include: { clinic: { select: { timezone: true } } },
  })
  if (!event) return

  try {
    const removed = event.status === ScheduleEventStatus.CANCELLED
    const account = removed ? null : await targetAccount(event)

    // Saiu da agenda anterior (cancelado ou mudou de profissional).
    if (event.googleEventId && event.googleUserId && (removed || event.googleUserId !== account?.userId)) {
      await deleteRemote(event.googleUserId, event.googleEventId)
      await prisma.scheduleEvent.update({
        where: { id: event.id },
        data: { googleEventId: null, googleUserId: null, googleSyncedAt: new Date(), googleSyncError: null },
      })
      event.googleEventId = null
      event.googleUserId = null
    }
    if (removed || !account) return

    const body = googleEventBody(event, event.clinic.timezone || "America/Sao_Paulo")
    let res = event.googleEventId
      ? await calendarFetch(account, "PATCH", `/events/${encodeURIComponent(event.googleEventId)}`, body)
      : null
    if (!res || res.status === 404 || res.status === 410) {
      res = await calendarFetch(account, "POST", "/events", body)
    }
    if (!res.ok || !res.json?.id) {
      throw new Error(res.json?.error?.message || `Google respondeu ${res.status}`)
    }

    await prisma.scheduleEvent.update({
      where: { id: event.id },
      data: { googleEventId: res.json.id, googleUserId: account.userId, googleSyncedAt: new Date(), googleSyncError: null },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await prisma.scheduleEvent
      .update({ where: { id: event.id }, data: { googleSyncError: message.slice(0, 300) } })
      .catch(() => {})
  }
}

/** Dispara a sincronização sem segurar a resposta da requisição. */
export function queueGoogleSync(...eventIds: (string | null | undefined)[]) {
  if (!googleConfig().configured) return
  for (const id of eventIds) {
    if (id) setImmediate(() => syncScheduleEvent(id).catch(() => {}))
  }
}

/** Envia os agendamentos futuros da clínica que ainda não estão no Google. */
export async function syncUpcoming(clinicId: string) {
  const events = await prisma.scheduleEvent.findMany({
    where: {
      clinicId,
      startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      status: { not: ScheduleEventStatus.CANCELLED },
    },
    select: { id: true },
    orderBy: { startsAt: "asc" },
    take: 500,
  })
  for (const { id } of events) {
    await syncScheduleEvent(id)
  }
  const failed = await prisma.scheduleEvent.count({
    where: { id: { in: events.map((e) => e.id) }, googleSyncError: { not: null } },
  })
  return { total: events.length, failed }
}
