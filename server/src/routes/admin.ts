import type { FastifyInstance } from "fastify"
import { AdminAuditAction, AuditActorType, SystemRole, UserStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireSystemAdmin } from "../middlewares/auth.js"

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireSystemAdmin)

  // GET /api/admin/stats
  fastify.get("/admin/stats", async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [totalUsers, activeUsers, blockedUsers, totalClinics, newUsersLast7Days] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        prisma.user.count({ where: { status: UserStatus.BLOCKED } }),
        prisma.clinic.count(),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      ])

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      totalClinics,
      newUsersLast7Days,
    }
  })

  // GET /api/admin/users
  fastify.get("/admin/users", async (request) => {
    const querySchema = z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
      limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    })

    const { search, status, page = 1, limit = 20 } = querySchema.parse(request.query)
    const skip = (page - 1) * limit

    const whereClause: any = {}

    if (status && status !== "all") {
      whereClause.status = status.toUpperCase()
    }

    if (search && search.trim()) {
      const s = search.trim().toLowerCase()
      whereClause.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        { phone: { contains: s, mode: "insensitive" } },
      ]
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          systemRole: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          blockedAt: true,
          blockedReason: true,
          clinics: {
            select: {
              role: true,
              clinic: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ])

    return {
      users: users.map((u) => ({
        ...u,
        clinic: u.clinics[0]?.clinic || null,
        clinicRole: u.clinics[0]?.role || null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  })

  // GET /api/admin/users/:id
  fastify.get("/admin/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        systemRole: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        blockedAt: true,
        blockedReason: true,
        clinics: {
          include: {
            clinic: true,
          },
        },
        sessions: {
          where: { expiresAt: { gt: new Date() } },
          select: {
            id: true,
            createdAt: true,
            lastUsedAt: true,
            ipAddress: true,
            userAgent: true,
          },
        },
        loginEvents: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!user) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Usuário não encontrado." } })
    }

    return { user }
  })

  // POST /api/admin/users/:id/block
  fastify.post("/admin/users/:id/block", async (request, reply) => {
    const { id } = request.params as { id: string }
    const bodySchema = z.object({ reason: z.string().optional() })
    const { reason } = bodySchema.parse(request.body || {})

    const adminUser = request.user!

    // Refinement 10: Admin cannot block themselves
    if (adminUser.id === id) {
      return reply.status(400).send({
        error: { code: "INVALID_ACTION", message: "Você não pode bloquear sua própria conta de administrador." },
      })
    }

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Usuário não encontrado." } })
    }

    // Refinement 11: Protect Last System Admin
    if (targetUser.systemRole === SystemRole.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { systemRole: SystemRole.ADMIN, status: UserStatus.ACTIVE },
      })
      if (adminCount <= 1) {
        return reply.status(400).send({
          error: {
            code: "LAST_ADMIN_PROTECTED",
            message: "Operação negada: Este é o único administrador ativo do sistema.",
          },
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: UserStatus.BLOCKED,
          blockedAt: new Date(),
          blockedReason: reason?.trim() || "Bloqueado pelo administrador do sistema.",
        },
      })

      await tx.session.deleteMany({ where: { userId: id } })

      await tx.adminAuditLog.create({
        data: {
          actorType: AuditActorType.ADMIN,
          adminUserId: adminUser.id,
          targetUserId: id,
          action: AdminAuditAction.USER_BLOCKED,
          metadata: { reason: reason || null },
        },
      })
    })

    return { status: "ok", message: `Usuário ${targetUser.email} bloqueado com sucesso.` }
  })

  // POST /api/admin/users/:id/unblock
  fastify.post("/admin/users/:id/unblock", async (request, reply) => {
    const { id } = request.params as { id: string }
    const adminUser = request.user!

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) {
      return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Usuário não encontrado." } })
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          status: UserStatus.ACTIVE,
          blockedAt: null,
          blockedReason: null,
        },
      })

      await tx.adminAuditLog.create({
        data: {
          actorType: AuditActorType.ADMIN,
          adminUserId: adminUser.id,
          targetUserId: id,
          action: AdminAuditAction.USER_UNBLOCKED,
        },
      })
    })

    return { status: "ok", message: `Usuário ${targetUser.email} desbloqueado com sucesso.` }
  })

  // POST /api/admin/users/:id/revoke-sessions
  fastify.post("/admin/users/:id/revoke-sessions", async (request, reply) => {
    const { id } = request.params as { id: string }
    const adminUser = request.user!

    // Refinement 10: Admin cannot revoke their own session through this management UI
    if (adminUser.id === id) {
      return reply.status(400).send({
        error: { code: "INVALID_ACTION", message: "Você não pode revogar sua própria sessão ativa nesta tela. Use o botão Sair." },
      })
    }

    const count = await prisma.session.deleteMany({ where: { userId: id } })

    await prisma.adminAuditLog.create({
      data: {
        actorType: AuditActorType.ADMIN,
        adminUserId: adminUser.id,
        targetUserId: id,
        action: AdminAuditAction.SESSIONS_REVOKED,
        metadata: { revokedCount: count.count },
      },
    })

    return { status: "ok", message: `${count.count} sessões revogadas com sucesso.` }
  })

  // GET /api/admin/clinics
  fastify.get("/admin/clinics", async () => {
    const clinics = await prisma.clinic.findMany({
      include: {
        users: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return {
      clinics: clinics.map((c) => {
        const ownerRel = c.users.find((u) => u.role === "OWNER") || c.users[0]
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          status: c.status,
          createdAt: c.createdAt,
          usersCount: c.users.length,
          owner: ownerRel ? ownerRel.user : null,
        }
      }),
    }
  })
}
