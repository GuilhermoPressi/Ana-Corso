import fastifyCookie from "@fastify/cookie"
import fastifyCors from "@fastify/cors"
import fastifyRateLimit from "@fastify/rate-limit"
import Fastify from "fastify"

import { config } from "./config.js"
import { adminRoutes } from "./routes/admin.js"
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
import { patientRoutes } from "./routes/patients.js"
import { photoRoutes } from "./routes/photos.js"
import { planningRoutes } from "./routes/plannings.js"
import { postCareRoutes } from "./routes/postcare.js"
import { procedureRoutes } from "./routes/procedures.js"
import { proposalRoutes } from "./routes/proposals.js"
import { recoveryRoutes } from "./routes/recovery.js"
import { scheduleRoutes } from "./routes/schedule.js"

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
  app.register(clinicRoutes, { prefix: "/api" })
  app.register(patientRoutes, { prefix: "/api" })
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

  return app
}
