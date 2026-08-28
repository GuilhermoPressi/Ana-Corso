import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { ClinicRole, SystemRole } from "@prisma/client"
import bcrypt from "bcryptjs"

import { buildApp } from "../app.js"
import { prisma } from "../db.js"

describe("Fase 2 - Multi-Tenancy & Clinical Persistence Tests", () => {
  const app = buildApp()

  let userACookie: string
  let userBCookie: string
  let adminOnlyCookie: string

  let userAId: string
  let userBId: string
  let adminOnlyUserId: string

  let clinicAId: string
  let clinicBId: string

  let patientAId: string
  let patientBId: string

  beforeAll(async () => {
    await app.ready()

    // Create Clinic A and User A (OWNER)
    const clinicA = await prisma.clinic.create({
      data: { name: "Clínica Alpha", slug: "clinica-alpha-test" },
    })
    clinicAId = clinicA.id

    const passwordHash = await bcrypt.hash("Password123!", 10)
    const userA = await prisma.user.create({
      data: {
        name: "Dra. User Alpha",
        email: "user.alpha@test.com",
        passwordHash,
        systemRole: SystemRole.USER,
      },
    })
    userAId = userA.id

    await prisma.clinicUser.create({
      data: { clinicId: clinicA.id, userId: userA.id, role: ClinicRole.OWNER },
    })

    // Create Clinic B and User B (OWNER)
    const clinicB = await prisma.clinic.create({
      data: { name: "Clínica Beta", slug: "clinica-beta-test" },
    })
    clinicBId = clinicB.id

    const userB = await prisma.user.create({
      data: {
        name: "Dr. User Beta",
        email: "user.beta@test.com",
        passwordHash,
        systemRole: SystemRole.USER,
      },
    })
    userBId = userB.id

    await prisma.clinicUser.create({
      data: { clinicId: clinicB.id, userId: userB.id, role: ClinicRole.OWNER },
    })

    // Create System Admin user WITHOUT clinic membership
    const adminUser = await prisma.user.create({
      data: {
        name: "Global Admin",
        email: "global.admin@test.com",
        passwordHash,
        systemRole: SystemRole.ADMIN,
      },
    })
    adminOnlyUserId = adminUser.id

    // Login User A
    const loginARes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "user.alpha@test.com", password: "Password123!" },
    })
    const cookiesA = loginARes.headers["set-cookie"]
    userACookie = Array.isArray(cookiesA) ? cookiesA[0] : cookiesA!

    // Login User B
    const loginBRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "user.beta@test.com", password: "Password123!" },
    })
    const cookiesB = loginBRes.headers["set-cookie"]
    userBCookie = Array.isArray(cookiesB) ? cookiesB[0] : cookiesB!

    // Login Global Admin
    const loginAdminRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "global.admin@test.com", password: "Password123!" },
    })
    const cookiesAdmin = loginAdminRes.headers["set-cookie"]
    adminOnlyCookie = Array.isArray(cookiesAdmin) ? cookiesAdmin[0] : cookiesAdmin!
  })

  afterAll(async () => {
    // Cleanup
    await prisma.clinicActivityLog.deleteMany()
    await prisma.patientClinicalProfile.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.session.deleteMany()
    await prisma.clinicUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.clinic.deleteMany()
    await app.close()
  })

  describe("Clinic API (/api/clinic)", () => {
    it("User A gets Clinic A profile", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/clinic",
        headers: { cookie: userACookie },
      })
      expect(res.statusCode).toBe(200)
      const data = res.json()
      expect(data.clinic.id).toBe(clinicAId)
      expect(data.clinic.name).toBe("Clínica Alpha")
    })

    it("User A updates Clinic A profile and verifies slug stability", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/api/clinic",
        headers: { cookie: userACookie },
        payload: {
          name: "Instituto Alpha Renovado",
          phone: "(51) 99999-1111",
        },
      })
      expect(res.statusCode).toBe(200)
      const data = res.json()
      expect(data.clinic.name).toBe("Instituto Alpha Renovado")
      expect(data.clinic.slug).toBe("clinica-alpha-test") // Refinement 6: Slug MUST NOT change!
    })
  })

  describe("Patients CRUD & Multi-Tenant Isolation", () => {
    it("User A creates Patient A in Clinic A", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/patients",
        headers: { cookie: userACookie },
        payload: {
          name: "Mariana Alpha",
          cpf: "123.456.789-01",
          phone: "(51) 98888-1111",
          email: "mariana.alpha@gmail.com",
          mainProcedure: "Toxina Botulínica",
        },
      })
      expect(res.statusCode).toBe(201)
      const data = res.json()
      expect(data.patient.name).toBe("Mariana Alpha")
      expect(data.patient.cpf).toBe("12345678901") // Refinement 10: Normalized digits
      expect(data.patient.clinicId).toBe(clinicAId)
      patientAId = data.patient.id
    })

    it("User A cannot create duplicate CPF in Clinic A (returns PATIENT_CPF_EXISTS)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/patients",
        headers: { cookie: userACookie },
        payload: {
          name: "Mariana Duplicada",
          cpf: "12345678901", // Same digits
          phone: "(51) 97777-2222",
        },
      })
      expect(res.statusCode).toBe(400)
      const data = res.json()
      expect(data.error.code).toBe("PATIENT_CPF_EXISTS") // Refinement 5
    })

    it("User B can create Patient B with the same CPF in Clinic B (tenant unique check)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/patients",
        headers: { cookie: userBCookie },
        payload: {
          name: "Beatriz Beta",
          cpf: "123.456.789-01", // Same CPF, different clinic
          phone: "(51) 96666-3333",
        },
      })
      expect(res.statusCode).toBe(201)
      const data = res.json()
      expect(data.patient.name).toBe("Beatriz Beta")
      expect(data.patient.clinicId).toBe(clinicBId)
      patientBId = data.patient.id
    })

    it("User A lists only Patient A, User B lists only Patient B", async () => {
      const resA = await app.inject({
        method: "GET",
        url: "/api/patients",
        headers: { cookie: userACookie },
      })
      expect(resA.statusCode).toBe(200)
      const dataA = resA.json()
      expect(dataA.items.length).toBe(1)
      expect(dataA.items[0].id).toBe(patientAId)

      const resB = await app.inject({
        method: "GET",
        url: "/api/patients",
        headers: { cookie: userBCookie },
      })
      expect(resB.statusCode).toBe(200)
      const dataB = resB.json()
      expect(dataB.items.length).toBe(1)
      expect(dataB.items[0].id).toBe(patientBId)
    })

    it("User A trying GET /api/patients/PatientB_ID returns strictly 404 NOT_FOUND", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/patients/${patientBId}`,
        headers: { cookie: userACookie },
      })
      expect(res.statusCode).toBe(404)
      expect(res.json().error.code).toBe("NOT_FOUND")
    })

    it("Global System Admin without clinic membership trying GET /api/patients/PatientA_ID returns strictly 404 NOT_FOUND", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/patients/${patientAId}`,
        headers: { cookie: adminOnlyCookie },
      })
      expect(res.statusCode).toBe(404)
      expect(res.json().error.code).toBe("NOT_FOUND") // Refinement 17 & 29: Admin cannot bypass tenant check!
    })

    it("Archive and Restore flow for Patient A", async () => {
      // Archive Patient A
      const archiveRes = await app.inject({
        method: "POST",
        url: `/api/patients/${patientAId}/archive`,
        headers: { cookie: userACookie },
      })
      expect(archiveRes.statusCode).toBe(200)
      expect(archiveRes.json().patient.status).toBe("ARCHIVED")

      // Default GET /api/patients excludes archived
      const listDefaultRes = await app.inject({
        method: "GET",
        url: "/api/patients",
        headers: { cookie: userACookie },
      })
      expect(listDefaultRes.json().items.length).toBe(0) // Excluded by default!

      // Explicit GET /api/patients?status=ARCHIVED returns patient
      const listArchivedRes = await app.inject({
        method: "GET",
        url: "/api/patients?status=ARCHIVED",
        headers: { cookie: userACookie },
      })
      expect(listArchivedRes.json().items.length).toBe(1)

      // Restore Patient A
      const restoreRes = await app.inject({
        method: "POST",
        url: `/api/patients/${patientAId}/restore`,
        headers: { cookie: userACookie },
      })
      expect(restoreRes.statusCode).toBe(200)
      expect(restoreRes.json().patient.status).toBe("ACTIVE")
    })
  })
})
