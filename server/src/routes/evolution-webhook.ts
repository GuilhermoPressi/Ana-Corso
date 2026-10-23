import type { FastifyInstance } from "fastify"
import { prisma } from "../db.js"
import { processEvolutionEvent } from "../services/crm-inbox.js"
import { parseSaleEvent, processSaleEvent } from "../services/crm-automations.js"

/**
 * Webhook público chamado pela Evolution API.
 *
 * Cada instância recebe uma URL com um token aleatório próprio
 * (/api/webhooks/evolution/:token), que identifica a clínica e funciona como
 * segredo. Respondemos 200 imediatamente e processamos em seguida para não
 * segurar a Evolution enquanto baixamos mídia.
 */
export async function evolutionWebhookRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/webhooks/evolution/:token",
    { config: { rateLimit: false } },
    async (request, reply) => {
      const { token } = request.params as { token: string }
      const instance = await prisma.whatsAppInstance.findUnique({ where: { webhookToken: token } })
      if (!instance) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Webhook desconhecido." } })
      }

      const payload = request.body as any
      const payloadInstance = typeof payload?.instance === "string" ? payload.instance : null
      if (payloadInstance && payloadInstance !== instance.instanceName) {
        return reply.status(403).send({ error: { code: "FORBIDDEN", message: "Instância não confere." } })
      }

      setImmediate(() => {
        processEvolutionEvent(instance, payload).catch((err) => {
          request.log.error({ err, event: payload?.event, instance: instance.instanceName }, "evolution webhook failed")
        })
      })

      return reply.send({ ok: true })
    },
  )

  /**
   * Webhook de vendas (Hotmart, Kiwify ou formato genérico). O token da URL
   * identifica a clínica (Configurações do CRM → Automações).
   */
  fastify.post(
    "/webhooks/sales/:token",
    { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { token } = request.params as { token: string }
      const settings = await prisma.crmAutomationSettings.findUnique({ where: { salesWebhookToken: token } })
      if (!settings) {
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Webhook desconhecido." } })
      }
      const event = parseSaleEvent(request.body)
      if (!event) return reply.send({ ok: true, ignored: true, reason: "Payload sem dados de contato." })
      try {
        const result = await processSaleEvent(settings.clinicId, event)
        return reply.send(result)
      } catch (err) {
        request.log.error({ err, platform: event.platform }, "sales webhook failed")
        return reply.status(500).send({ error: { code: "INTERNAL", message: "Falha ao processar a venda." } })
      }
    },
  )
}
