import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicRole, ClinicStatus, InvitationStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth, requirePermission } from "../middlewares/auth.js"
import { hashToken } from "../utils/crypto.js"

const createInviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.nativeEnum(ClinicRole).optional().default(ClinicRole.PROFESSIONAL),
})

const updateRoleSchema = z.object({
  role: z.nativeEnum(ClinicRole),
})

const acceptInviteSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
})

export async function teamRoutes(fastify: FastifyInstance) {
  // Public route: View invitation details by token
  fastify.get("/team/invitations/:token", async (request, reply) => {
    const { token } = request.params as { token: string }
    const tokenHash = hashToken(token)

    const invitation = await prisma.clinicInvitation.findUnique({
      where: { tokenHash },
      include: {
        clinic: { select: { id: true, name: true, slug: true } },
      },
    })

    if (!invitation || invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Convite inválido, expirado ou revogado." },
      })
    }

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        clinicName: invitation.clinic.name,
        expiresAt: invitation.expiresAt,
      },
    }
  })

  // Public route: Accept invitation & create/link user
  fastify.post("/team/invitations/:token/accept", async (request, reply) => {
    const { token } = request.params as { token: string }
    const tokenHash = hashToken(token)

    const invitation = await prisma.clinicInvitation.findUnique({
      where: { tokenHash },
      include: { clinic: true },
    })

    if (!invitation || invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      return reply.status(400).send({
        error: { code: "INVALID_TOKEN", message: "Convite inválido ou expirado." },
      })
    }

    const parseResult = acceptInviteSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: parseResult.error.errors[0]?.message || "Dados inválidos." },
      })
    }

    const { name, password } = parseResult.data
    const bcrypt = await import("bcryptjs")
    const passwordHash = await bcrypt.hash(password, 10)

    const result = await prisma.$transaction(async (tx) => {
      // Check if user exists
      let user = await tx.user.findUnique({ where: { email: invitation.email } })

      if (!user) {
        user = await tx.user.create({
          data: {
            name: name.trim(),
            email: invitation.email.toLowerCase().trim(),
            passwordHash,
          },
        })
      }

      // Check if already in clinic
      const existingRel = await tx.clinicUser.findUnique({
        where: {
          userId_clinicId: {
            userId: user.id,
            clinicId: invitation.clinicId,
          },
        },
      })

      if (!existingRel) {
        await tx.clinicUser.create({
          data: {
            userId: user.id,
            clinicId: invitation.clinicId,
            role: invitation.role,
          },
        })
      }

      // Mark invitation accepted
      await tx.clinicInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      })

      return user
    })

    return reply.status(201).send({
      message: "Convite aceito com sucesso. Faça login para acessar a clínica.",
      user: { id: result.id, email: result.email, name: result.name },
    })
  })

  // Authenticated routes hook
  fastify.addHook("preHandler", requireAuth)
  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica ativa vinculada à sessão." },
      })
    }
  })

  // GET /api/team - List team members & pending invitations
  fastify.get("/team", async (request) => {
    const clinicId = request.clinic!.id

    const members = await prisma.clinicUser.findMany({
      where: { clinicId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    const invitations = await prisma.clinicInvitation.findMany({
      where: { clinicId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: "desc" },
    })

    return {
      members: members.map((m) => ({
        id: m.user.id,
        clinicUserId: m.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        role: m.role,
        status: m.user.status,
        lastLoginAt: m.user.lastLoginAt,
        joinedAt: m.createdAt,
      })),
      invitations: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        expiresAt: i.expiresAt,
        inviteUrl: `/convite/${i.id}`,
      })),
    }
  })

  // POST /api/team/invitations - Invite new member (requires TEAM_MANAGE)
  fastify.post("/team/invitations", { preHandler: requirePermission("TEAM_MANAGE") }, async (request, reply) => {
    const parseResult = createInviteSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: parseResult.error.errors[0]?.message || "Dados inválidos." },
      })
    }

    const { email, role } = parseResult.data
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const token = crypto.randomUUID()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.clinicInvitation.create({
        data: {
          clinicId,
          email: email.toLowerCase().trim(),
          role,
          tokenHash,
          expiresAt,
          invitedByUserId: userId,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.INVITATION,
          entityId: created.id,
          action: ClinicActivityAction.TEAM_MEMBER_INVITED,
        },
      })

      return created
    })

    return reply.status(201).send({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviteToken: token,
        inviteUrl: `/convite/${token}`,
      },
    })
  })

  // PATCH /api/team/members/:userId - Change member role (requires TEAM_MANAGE)
  fastify.patch("/team/members/:userId", { preHandler: requirePermission("TEAM_MANAGE") }, async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const clinicId = request.clinic!.id
    const currentUserId = request.user!.id

    const parseResult = updateRoleSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: "Função inválida." },
      })
    }

    const { role } = parseResult.data

    const targetRel = await prisma.clinicUser.findUnique({
      where: { userId_clinicId: { userId, clinicId } },
    })

    if (!targetRel) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Membro da equipe não encontrado nesta clínica." },
      })
    }

    // Prevent removing last OWNER
    if (targetRel.role === ClinicRole.OWNER && role !== ClinicRole.OWNER) {
      const ownerCount = await prisma.clinicUser.count({
        where: { clinicId, role: ClinicRole.OWNER },
      })
      if (ownerCount <= 1) {
        return reply.status(400).send({
          error: { code: "OWNER_REQUIRED", message: "A clínica não pode ficar sem um Proprietário (OWNER)." },
        })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.clinicUser.update({
        where: { id: targetRel.id },
        data: { role },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId: currentUserId,
          entityType: ClinicActivityEntityType.TEAM,
          entityId: res.id,
          action: ClinicActivityAction.TEAM_MEMBER_ROLE_CHANGED,
        },
      })

      return res
    })

    return { member: updated }
  })

  // DELETE /api/team/members/:userId - Remove team member (requires TEAM_MANAGE)
  fastify.delete("/team/members/:userId", { preHandler: requirePermission("TEAM_MANAGE") }, async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const clinicId = request.clinic!.id
    const currentUserId = request.user!.id

    const targetRel = await prisma.clinicUser.findUnique({
      where: { userId_clinicId: { userId, clinicId } },
    })

    if (!targetRel) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Membro da equipe não encontrado." },
      })
    }

    // Prevent removing last OWNER
    if (targetRel.role === ClinicRole.OWNER) {
      const ownerCount = await prisma.clinicUser.count({
        where: { clinicId, role: ClinicRole.OWNER },
      })
      if (ownerCount <= 1) {
        return reply.status(400).send({
          error: { code: "OWNER_REQUIRED", message: "A clínica não pode ficar sem um Proprietário (OWNER)." },
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.clinicUser.delete({ where: { id: targetRel.id } })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId: currentUserId,
          entityType: ClinicActivityEntityType.TEAM,
          entityId: userId,
          action: ClinicActivityAction.TEAM_MEMBER_REMOVED,
        },
      })
    })

    return { message: "Membro removido da equipe com sucesso." }
  })
}
