import type { FastifyInstance } from "fastify"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"
import {
  buildAuthUrl,
  connectAccount,
  disconnectAccount,
  googleConfig,
  syncUpcoming,
} from "../services/google-calendar.js"
import { signPayload, verifySignedPayload } from "../utils/crypto.js"

const STATE_TTL_MS = 10 * 60 * 1000

export async function integrationRoutes(fastify: FastifyInstance) {
  // Retorno do Google (navegação de topo): identifica o usuário pelo `state` assinado.
  fastify.get("/integrations/google/callback", async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string }
    const { frontendUrl } = googleConfig()
    const back = (status: string, message?: string) => {
      const params = new URLSearchParams({ aba: "integracoes", google: status })
      if (message) params.set("mensagem", message.slice(0, 200))
      return reply.redirect(`${frontendUrl}/configuracoes?${params}`)
    }

    if (error) return back("cancelado")
    const payload = state ? verifySignedPayload(state) : null
    const [userId, expiresAt] = payload?.split(":") ?? []
    if (!userId || !code || Number(expiresAt) < Date.now()) {
      return back("erro", "Link de autorização inválido ou expirado. Tente conectar novamente.")
    }

    try {
      await connectAccount(userId, code)
      return back("conectado")
    } catch (err) {
      request.log.error({ err }, "google calendar connect failed")
      return back("erro", err instanceof Error ? err.message : "Falha ao conectar com o Google.")
    }
  })

  fastify.register(async (authed) => {
    authed.addHook("preHandler", requireAuth)

    authed.get("/integrations/google", async (request) => {
      const account = await prisma.googleCalendarAccount.findUnique({ where: { userId: request.user!.id } })
      const clinicId = request.clinic?.id
      const pending = clinicId
        ? await prisma.scheduleEvent.count({
            where: { clinicId, googleSyncError: { not: null }, startsAt: { gte: new Date() } },
          })
        : 0
      return {
        configured: googleConfig().configured,
        account: account
          ? { email: account.email, connectedAt: account.createdAt, lastError: account.lastError }
          : null,
        failedEvents: pending,
      }
    })

    authed.post("/integrations/google/connect", async (request, reply) => {
      if (!googleConfig().configured) {
        return reply.status(503).send({
          error: {
            code: "GOOGLE_NOT_CONFIGURED",
            message: "A integração com o Google Agenda ainda não foi configurada no servidor (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
          },
        })
      }
      const state = signPayload(`${request.user!.id}:${Date.now() + STATE_TTL_MS}`)
      return { url: buildAuthUrl(state) }
    })

    authed.post("/integrations/google/sync", async (request, reply) => {
      const account = await prisma.googleCalendarAccount.findUnique({ where: { userId: request.user!.id } })
      if (!account || !request.clinic) {
        return reply.status(409).send({ error: { code: "NOT_CONNECTED", message: "Conecte o Google Agenda primeiro." } })
      }
      const result = await syncUpcoming(request.clinic.id)
      return result
    })

    authed.post("/integrations/google/disconnect", async (request) => {
      await disconnectAccount(request.user!.id)
      return { ok: true }
    })
  })
}
