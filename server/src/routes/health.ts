import type { FastifyInstance } from "fastify"
import { prisma } from "../db.js"

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    return { status: "ok" }
  })

  fastify.get("/health/database", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: "ok", database: "connected" }
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        status: "error",
        database: "disconnected",
      })
    }
  })
}
