import type { FastifyReply, FastifyRequest } from "fastify"
import { ClinicStatus, UserStatus } from "@prisma/client"
import { prisma } from "../db.js"
import { hashToken } from "../utils/crypto.js"

export type SafeUser = {
  id: string
  name: string
  email: string
  phone: string | null
  systemRole: string
  status: string
}

export type SafeClinic = {
  id: string
  name: string
  slug: string
  role: string
  status: string
  timezone: string
}

declare module "fastify" {
  interface FastifyRequest {
    user?: SafeUser
    clinic?: SafeClinic
    clinicRole?: string
    sessionToken?: string
  }
}

export async function authenticateSession(request: FastifyRequest, reply: FastifyReply) {
  const token =
    request.cookies.ana_corso_session ||
    (request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.split(" ")[1]
      : undefined)

  if (!token) {
    return reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "Sessão não informada ou expirada." },
    })
  }

  const tokenHash = hashToken(token)

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          clinics: {
            include: {
              clinic: true,
            },
          },
        },
      },
    },
  })

  // Session check with strict expiresAt > now()
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    }
    reply.clearCookie("ana_corso_session", { path: "/" })
    return reply.status(401).send({
      error: { code: "INVALID_SESSION", message: "Sessão inválida ou expirada." },
    })
  }

  const { user } = session

  // Real-time user block check
  if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
    await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {})
    reply.clearCookie("ana_corso_session", { path: "/" })
    return reply.status(403).send({
      error: {
        code: "USER_BLOCKED",
        message: user.blockedReason || "Sua conta foi suspensa temporariamente.",
      },
    })
  }

  // Multi-clinic tenant selection via Header or Cookie
  const targetClinicId =
    (request.headers["x-clinic-id"] as string) || request.cookies.ana_corso_clinic_id

  const userClinicRel =
    user.clinics.find((c) => c.clinicId === targetClinicId && c.clinic.status !== ClinicStatus.BLOCKED) ||
    user.clinics.find((c) => c.clinic.status !== ClinicStatus.BLOCKED) ||
    user.clinics[0]

  // Real-time clinic block check
  if (userClinicRel?.clinic && userClinicRel.clinic.status === ClinicStatus.BLOCKED) {
    return reply.status(403).send({
      error: {
        code: "CLINIC_BLOCKED",
        message: "O acesso da sua clínica está temporariamente suspenso.",
      },
    })
  }

  // Touch last used timestamp asynchronously
  prisma.session
    .update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {})

  request.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    systemRole: user.systemRole,
    status: user.status,
  }

  if (userClinicRel && userClinicRel.clinic) {
    request.clinic = {
      id: userClinicRel.clinic.id,
      name: userClinicRel.clinic.name,
      slug: userClinicRel.clinic.slug,
      role: userClinicRel.role,
      status: userClinicRel.clinic.status,
      timezone: userClinicRel.clinic.timezone || "America/Sao_Paulo",
    }
    request.clinicRole = userClinicRel.role
  }

  request.sessionToken = token
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    await authenticateSession(request, reply)
  }
}

export async function requireActiveUser(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    await authenticateSession(request, reply)
  }
  if (request.user?.status !== UserStatus.ACTIVE) {
    return reply.status(403).send({
      error: { code: "USER_INACTIVE", message: "Conta inativa." },
    })
  }
}

export async function requireSystemAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    await authenticateSession(request, reply)
  }
  if (request.user?.systemRole !== "ADMIN") {
    return reply.status(403).send({
      error: { code: "FORBIDDEN", message: "Acesso restrito aos administradores da plataforma." },
    })
  }
}

import { hasPermission, type Permission } from "../utils/permissions.js"

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      await authenticateSession(request, reply)
    }
    const role = request.clinicRole || "PROFESSIONAL"
    if (!hasPermission(role, permission)) {
      return reply.status(403).send({
        error: { code: "FORBIDDEN", message: "Permissão insuficiente para esta operação." },
      })
    }
  }
}
