import type { FastifyInstance } from "fastify"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica ativa vinculada à sessão." },
      })
    }
  })

  // GET /api/notifications
  fastify.get("/notifications", async (request) => {
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const notifications = await prisma.notification.findMany({
      where: {
        clinicId,
        OR: [{ userId: null }, { userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    const unreadCount = await prisma.notification.count({
      where: {
        clinicId,
        readAt: null,
        OR: [{ userId: null }, { userId }],
      },
    })

    return { notifications, unreadCount }
  })

  // POST /api/notifications/:id/read
  fastify.post("/notifications/:id/read", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id

    const notification = await prisma.notification.findFirst({
      where: { id, clinicId },
    })

    if (!notification) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Notificação não encontrada." },
      })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })

    return { notification: updated }
  })

  // POST /api/notifications/read-all
  fastify.post("/notifications/read-all", async (request) => {
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    await prisma.notification.updateMany({
      where: {
        clinicId,
        readAt: null,
        OR: [{ userId: null }, { userId }],
      },
      data: { readAt: new Date() },
    })

    return { message: "Todas as notificações foram marcadas como lidas." }
  })
}
