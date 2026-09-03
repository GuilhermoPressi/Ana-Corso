import fastifyCookie from "@fastify/cookie"
import fastifyCors from "@fastify/cors"
import fastifyRateLimit from "@fastify/rate-limit"
import Fastify from "fastify"

import { config } from "./config.js"
import { academyRoutes } from "./routes/academy.js"
import { adminRoutes } from "./routes/admin.js"
import { aiRoutes } from "./routes/ai.js"
import { authRoutes } from "./routes/auth.js"
import { catalogRoutes } from "./routes/catalog.js"
import { clinicRoutes } from "./routes/clinic.js"
import { dashboardRoutes } from "./routes/dashboard.js"
import { financeRoutes } from "./routes/finance.js"
import { healthRoutes } from "./routes/health.js"
import { incidentRoutes } from "./routes/incidents.js"
import { inventoryRoutes } from "./routes/inventory.js"
import { leadRoutes } from "./routes/leads.js"
import { mapRoutes } from "./routes/maps.js"
import { notificationRoutes } from "./routes/notifications.js"
import { patientRoutes } from "./routes/patients.js"
import { photoRoutes } from "./routes/photos.js"
import { planningRoutes } from "./routes/plannings.js"
import { planRoutes } from "./routes/plans.js"
import { postCareRoutes } from "./routes/postcare.js"
import { procedureRoutes } from "./routes/procedures.js"
import { proposalRoutes } from "./routes/proposals.js"
import { recoveryRoutes } from "./routes/recovery.js"
import { scheduleRoutes } from "./routes/schedule.js"
import { teamRoutes } from "./routes/team.js"

export function buildApp() {
  const app = Fastify({
    trustProxy: true,
    bodyLimit: 15 * 1024 * 1024, // 15MB for high-res photo uploads
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
      const allowedOrigins = [
        config.FRONTEND_URL,
        "https://app.anacorso.com.br",
        "http://app.anacorso.com.br",
        "http://179.199.133.252",
      ].filter(Boolean)

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".anacorso.com.br") ||
        origin === "https://anacorso.com.br" ||
        (config.NODE_ENV !== "production" &&
          (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")))

      if (isAllowed) {
        return cb(null, true)
      }
      return cb(new Error("Origem não permitida pelo CORS"), false)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })

  // Cookies
  app.register(fastifyCookie, {
    secret: config.SESSION_SECRET,
    hook: "onRequest",
  })

  // Security Headers Hook
  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff")
    reply.header("X-Frame-Options", "SAMEORIGIN")
    reply.header("X-XSS-Protection", "1; mode=block")
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin")
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if (config.NODE_ENV === "production") {
      reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    }
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
  app.register(clinicRoutes, { prefix: "/api" })
  app.register(teamRoutes, { prefix: "/api" })
  app.register(patientRoutes, { prefix: "/api" })
  app.register(planRoutes, { prefix: "/api" })
  app.register(inventoryRoutes, { prefix: "/api" })
  app.register(scheduleRoutes, { prefix: "/api" })
  app.register(procedureRoutes, { prefix: "/api" })
  app.register(financeRoutes, { prefix: "/api" })
  app.register(dashboardRoutes, { prefix: "/api" })
  app.register(leadRoutes, { prefix: "/api" })
  app.register(planningRoutes, { prefix: "/api" })
  app.register(proposalRoutes, { prefix: "/api" })
  app.register(mapRoutes, { prefix: "/api" })
  app.register(catalogRoutes, { prefix: "/api" })
  app.register(photoRoutes, { prefix: "/api" })
  app.register(incidentRoutes, { prefix: "/api" })
  app.register(postCareRoutes, { prefix: "/api" })
  app.register(recoveryRoutes, { prefix: "/api" })
  app.register(academyRoutes, { prefix: "/api" })
  app.register(aiRoutes, { prefix: "/api" })
  app.register(notificationRoutes, { prefix: "/api" })

  return app
}
