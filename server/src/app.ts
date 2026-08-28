import fastifyCookie from "@fastify/cookie"
import fastifyCors from "@fastify/cors"
import fastifyRateLimit from "@fastify/rate-limit"
import Fastify from "fastify"

import { config } from "./config.js"
import { adminRoutes } from "./routes/admin.js"
import { authRoutes } from "./routes/auth.js"
import { healthRoutes } from "./routes/health.js"

export function buildApp() {
  const app = Fastify({
    // Refinement 8: Fastify trustProxy for Nginx / EasyPanel reverse proxy
    trustProxy: true,
    logger:
      config.NODE_ENV === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true },
            },
          }
        : true,
  })

  // CORS
  app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (
        origin === config.FRONTEND_URL ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return cb(null, true)
      }
      return cb(null, true)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })

  // Cookies
  app.register(fastifyCookie, {
    secret: config.SESSION_SECRET,
    hook: "onRequest",
  })

  // Rate Limiting
  app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
  })

  // Global Error Handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error)

    const statusCode = error.statusCode || 500
    const message =
      statusCode === 500
        ? "Erro interno no servidor."
        : error.message || "Requisição inválida."

    return reply.status(statusCode).send({
      error: {
        code: error.code || "INTERNAL_ERROR",
        message,
      },
    })
  })

  // Register Routes
  app.register(healthRoutes, { prefix: "/api" })
  app.register(authRoutes, { prefix: "/api" })
  app.register(adminRoutes, { prefix: "/api" })

  return app
}
