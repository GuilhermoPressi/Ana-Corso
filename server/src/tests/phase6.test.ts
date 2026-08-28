import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { ClinicRole, SystemRole } from "@prisma/client"
import bcrypt from "bcryptjs"

import { buildApp } from "../app.js"
import { prisma } from "../db.js"

describe("Fase 6 - Team, Permissions, Patient Plans, Academy, AI & Notifications", () => {
  const app = buildApp()

  let ownerCookie: string
  let receptionistCookie: string
  let clinicAId: string
  let patientAId: string

  beforeAll(async () => {
    await app.ready()

    // 1. Create Clinic A
    const clinicA = await prisma.clinic.create({
      data: { name: "Clínica Phase6 Alpha", slug: "clinica-p6-alpha" },
    })
    clinicAId = clinicA.id

    const passwordHash = await bcrypt.hash("Password123!", 10)

    // 2. Create Owner User
    const ownerUser = await prisma.user.create({
      data: {
        name: "Dra. Owner Phase6",
        email: "owner.phase6@test.com",
        passwordHash,
        systemRole: SystemRole.USER,
      },
    })

    await prisma.clinicUser.create({
      data: { clinicId: clinicA.id, userId: ownerUser.id, role: ClinicRole.OWNER },
    })

    const loginOwnerRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "owner.phase6@test.com", password: "Password123!" },
    })
    ownerCookie = loginOwnerRes.headers["set-cookie"] as string

    // 3. Create Receptionist User
    const recepUser = await prisma.user.create({
      data: {
        name: "Carla Recepcionista",
        email: "recep.phase6@test.com",
        passwordHash,
        systemRole: SystemRole.USER,
      },
    })

    await prisma.clinicUser.create({
      data: { clinicId: clinicA.id, userId: recepUser.id, role: ClinicRole.RECEPTIONIST },
    })

    const loginRecepRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "recep.phase6@test.com", password: "Password123!" },
    })
    receptionistCookie = loginRecepRes.headers["set-cookie"] as string

    // 4. Create Patient
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        name: "Paciente P6 Teste",
        phone: "51988887777",
      },
    })
    patientAId = patient.id
  })

  afterAll(async () => {
    await prisma.notification.deleteMany()
    await prisma.aIUsage.deleteMany()
    await prisma.aIMessage.deleteMany()
    await prisma.aIConversation.deleteMany()
    await prisma.academyLessonProgress.deleteMany()
    await prisma.academyLesson.deleteMany()
    await prisma.academyModule.deleteMany()
    await prisma.academyCourse.deleteMany()
    await prisma.patientTreatmentPlanItem.deleteMany()
    await prisma.patientTreatmentPlan.deleteMany()
    await prisma.clinicInvitation.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.session.deleteMany()
    await prisma.clinicUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.clinic.deleteMany()
    await app.close()
  })

  describe("Permission Enforcement", () => {
    it("Allows Owner to access Finance API", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/finance/summary",
        headers: { cookie: ownerCookie },
      })
      expect(res.statusCode).toBe(200)
    })

    it("Blocks Receptionist from accessing Finance API with 403 FORBIDDEN", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/finance/summary",
        headers: { cookie: receptionistCookie },
      })
      expect(res.statusCode).toBe(403)
      expect(res.json().error.code).toBe("FORBIDDEN")
    })
  })

  describe("Team Invitations & Member Management", () => {
    let inviteToken: string

    it("Generates invitation token for new team member", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/team/invitations",
        headers: { cookie: ownerCookie },
        payload: {
          email: "novo.profissional@test.com",
          role: "PROFESSIONAL",
        },
      })

      expect(res.statusCode).toBe(201)
      inviteToken = res.json().invitation.inviteToken
      expect(inviteToken).toBeDefined()
    })

    it("Views invitation details by token publicly", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/team/invitations/${inviteToken}`,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().invitation.email).toBe("novo.profissional@test.com")
    })
  })

  describe("Patient Treatment Plans", () => {
    let planId: string

    it("Creates treatment plan with items for patient", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/patients/${patientAId}/plans`,
        headers: { cookie: ownerCookie },
        payload: {
          name: "Plano de Harmonização Global",
          objective: "Restetuturação de terço médio e inferior",
          items: [
            {
              nameSnapshot: "Toxina Botulínica Glabela",
              sessionNumber: 1,
              priceSnapshot: 1800,
            },
          ],
        },
      })

      expect(res.statusCode).toBe(201)
      const plan = res.json().plan
      planId = plan.id
      expect(plan.name).toBe("Plano de Harmonização Global")
      expect(plan.items.length).toBe(1)
    })
  })

  describe("Educational Platform - Academia", () => {
    it("Returns list of published courses and user progress", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/academy/courses",
        headers: { cookie: ownerCookie },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().courses).toBeDefined()
    })
  })

  describe("IA da Especialista & Patient Context", () => {
    let conversationId: string

    it("Starts an AI conversation with patient context", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/ai/conversations",
        headers: { cookie: ownerCookie },
        payload: {
          title: "Consulta sobre toxina",
          patientId: patientAId,
        },
      })

      expect(res.statusCode).toBe(201)
      conversationId = res.json().conversation.id
      expect(conversationId).toBeDefined()
    })

    it("Sends message to AI and receives assistant guidance response", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/ai/conversations/${conversationId}/messages`,
        headers: { cookie: ownerCookie },
        payload: {
          content: "Qual a recomendação de dose para terço superior em paciente jovem?",
        },
      })

      expect(res.statusCode).toBe(201)
      const { userMessage, assistantMessage } = res.json()
      expect(userMessage.content).toContain("terço superior")
      expect(assistantMessage.content).toBeDefined()
      expect(assistantMessage.role).toBe("assistant")
    })
  })

  describe("Notification Center", () => {
    it("Lists notifications and marks unread as read", async () => {
      // Create a test notification
      await prisma.notification.create({
        data: {
          clinicId: clinicAId,
          type: "INVENTORY_LOW",
          title: "Estoque Baixo",
          message: "Toxina 100U está abaixo do estoque mínimo.",
        },
      })

      const getRes = await app.inject({
        method: "GET",
        url: "/api/notifications",
        headers: { cookie: ownerCookie },
      })

      expect(getRes.statusCode).toBe(200)
      expect(getRes.json().unreadCount).toBeGreaterThanOrEqual(1)

      const readRes = await app.inject({
        method: "POST",
        url: "/api/notifications/read-all",
        headers: { cookie: ownerCookie },
      })

      expect(readRes.statusCode).toBe(200)
    })
  })
})
