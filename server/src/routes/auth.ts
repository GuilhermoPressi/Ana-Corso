import type { FastifyInstance } from "fastify"
import { ClinicRole, ClinicStatus, LoginEventType, SystemRole, UserStatus } from "@prisma/client"
import { z } from "zod"
import { config } from "../config.js"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"
import { generateSessionToken, hashPassword, hashToken, verifyPassword } from "../utils/crypto.js"
import { generateFallbackSlug, generateUniqueClinicSlug } from "../utils/slug.js"

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  clinicName: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
})

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post("/auth/register", async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const { name, email, phone, password, clinicName } = parseResult.data
    // 5. Email Normalization
    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return reply.status(400).send({
        error: { code: "EMAIL_EXISTS", message: "Este e-mail já está cadastrado no sistema." },
      })
    }

    const passwordHash = await hashPassword(password)
    const resolvedClinicName = clinicName?.trim() || `Clínica ${name.split(" ")[0]}`
    let slug = await generateUniqueClinicSlug(resolvedClinicName)

    const rawToken = generateSessionToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days session

    let createdResult

    // 4. ATOMIC TRANSACTION: User + Clinic + ClinicUser OWNER + Session in single transaction
    try {
      createdResult = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            phone: phone?.trim() || null,
            passwordHash,
            systemRole: SystemRole.USER,
            status: UserStatus.ACTIVE,
          },
        })

        const newClinic = await tx.clinic.create({
          data: {
            name: resolvedClinicName,
            slug,
            status: ClinicStatus.ACTIVE,
          },
        })

        const newClinicUser = await tx.clinicUser.create({
          data: {
            clinicId: newClinic.id,
            userId: newUser.id,
            role: ClinicRole.OWNER,
          },
        })

        const newSession = await tx.session.create({
          data: {
            userId: newUser.id,
            tokenHash,
            expiresAt,
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"] || null,
          },
        })

        await tx.loginEvent.create({
          data: {
            userId: newUser.id,
            event: LoginEventType.REGISTER,
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"] || null,
          },
        })

        return { user: newUser, clinic: newClinic, clinicUser: newClinicUser, session: newSession }
      })
    } catch (err: any) {
      // 3. Concurrency Slug Collision Fallback handling
      if (err.code === "P2002" && err.meta?.target?.includes("slug")) {
        slug = generateFallbackSlug(resolvedClinicName)
        createdResult = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: name.trim(),
              email: normalizedEmail,
              phone: phone?.trim() || null,
              passwordHash,
              systemRole: SystemRole.USER,
              status: UserStatus.ACTIVE,
            },
          })

          const newClinic = await tx.clinic.create({
            data: {
              name: resolvedClinicName,
              slug,
              status: ClinicStatus.ACTIVE,
            },
          })

          const newClinicUser = await tx.clinicUser.create({
            data: {
              clinicId: newClinic.id,
              userId: newUser.id,
              role: ClinicRole.OWNER,
            },
          })

          const newSession = await tx.session.create({
            data: {
              userId: newUser.id,
              tokenHash,
              expiresAt,
              ipAddress: request.ip,
              userAgent: request.headers["user-agent"] || null,
            },
          })

          return { user: newUser, clinic: newClinic, clinicUser: newClinicUser, session: newSession }
        })
      } else {
        throw err
      }
    }

    const { user, clinic, clinicUser } = createdResult

    reply.setCookie("ana_corso_session", rawToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    })

    return reply.status(201).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        systemRole: user.systemRole,
        status: user.status,
      },
      clinic: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        role: clinicUser.role,
      },
    })
  })

  // POST /api/auth/login
  fastify.post("/auth/login", async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "E-mail e senha são obrigatórios.",
        },
      })
    }

    const { email, password } = parseResult.data
    const normalizedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        clinics: {
          include: {
            clinic: true,
          },
        },
      },
    })

    if (!user) {
      await prisma.loginEvent.create({
        data: {
          event: LoginEventType.LOGIN_FAILED,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] || null,
        },
      })
      return reply.status(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." },
      })
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      await prisma.loginEvent.create({
        data: {
          userId: user.id,
          event: LoginEventType.LOGIN_FAILED,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] || null,
        },
      })
      return reply.status(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." },
      })
    }

    // Real-time blocked user check
    if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
      await prisma.loginEvent.create({
        data: {
          userId: user.id,
          event: LoginEventType.LOGIN_FAILED_BLOCKED,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] || null,
        },
      })
      return reply.status(403).send({
        error: {
          code: "USER_BLOCKED",
          message: user.blockedReason || "Sua conta está temporariamente suspensa.",
        },
      })
    }

    // Touch last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const rawToken = generateSessionToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] || null,
      },
    })

    await prisma.loginEvent.create({
      data: {
        userId: user.id,
        event: LoginEventType.LOGIN_SUCCESS,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"] || null,
      },
    })

    reply.setCookie("ana_corso_session", rawToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    })

    const primaryClinicRel = user.clinics[0]

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        systemRole: user.systemRole,
        status: user.status,
      },
      clinic: primaryClinicRel
        ? {
            id: primaryClinicRel.clinic.id,
            name: primaryClinicRel.clinic.name,
            slug: primaryClinicRel.clinic.slug,
            role: primaryClinicRel.role,
          }
        : null,
    }
  })

  // POST /api/auth/logout
  fastify.post("/auth/logout", async (request, reply) => {
    const rawToken =
      request.cookies.ana_corso_session ||
      (request.headers.authorization?.startsWith("Bearer ")
        ? request.headers.authorization.split(" ")[1]
        : undefined)

    if (rawToken) {
      const tokenHash = hashToken(rawToken)
      const session = await prisma.session.findUnique({ where: { tokenHash } })
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
        await prisma.loginEvent.create({
          data: {
            userId: session.userId,
            event: LoginEventType.LOGOUT,
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"] || null,
          },
        })
      }
    }

    reply.clearCookie("ana_corso_session", { path: "/" })
    return { status: "ok", message: "Sessão encerrada com sucesso." }
  })

  // GET /api/auth/me
  fastify.get("/auth/me", { preHandler: [requireAuth] }, async (request) => {
    return {
      user: request.user,
      clinic: request.clinic || null,
    }
  })

  // 9. Neutral Forgot-Password Endpoint (does not leak email existence)
  fastify.post("/auth/forgot-password", async (request) => {
    const bodySchema = z.object({ email: z.string().email() })
    const parseResult = bodySchema.safeParse(request.body)
    if (!parseResult.success) {
      return {
        status: "ok",
        message: "Se existir uma conta cadastrada com este e-mail, enviaremos as instruções de recuperação.",
      }
    }

    // Always return neutral success message
    return {
      status: "ok",
      message: "Se existir uma conta cadastrada com este e-mail, enviaremos as instruções de recuperação.",
    }
  })

  // POST /api/auth/reset-password
  fastify.post("/auth/reset-password", async (_request, reply) => {
    return reply.status(400).send({
      error: { code: "NOT_CONFIGURED", message: "Recuperação de senha via e-mail aguardando configuração de SMTP." },
    })
  })
}
