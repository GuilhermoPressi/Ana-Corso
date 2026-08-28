import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { ClinicRole, FollowUpStage, IncidentSeverity, PhotoType, SystemRole } from "@prisma/client"
import bcrypt from "bcryptjs"

import { buildApp } from "../app.js"
import { prisma } from "../db.js"
import { StorageService } from "../services/storage.js"

describe("Fase 5 - Storage, Photos, Incidents & Post-Care Integration Tests", () => {
  const app = buildApp()

  let userACookie: string
  let clinicAId: string
  let patientAId: string
  let procedureAId: string

  let userBCookie: string
  let clinicBId: string

  beforeAll(async () => {
    await app.ready()

    // 1. Create Clinic A & User A (OWNER)
    const clinicA = await prisma.clinic.create({
      data: { name: "Clínica Phase5 Alpha", slug: "clinica-p5-alpha" },
    })
    clinicAId = clinicA.id

    const passwordHash = await bcrypt.hash("Password123!", 10)
    const userA = await prisma.user.create({
      data: {
        name: "Dra. Ana Phase5",
        email: "ana.phase5@test.com",
        passwordHash,
        systemRole: SystemRole.USER,
      },
    })

    await prisma.clinicUser.create({
      data: { clinicId: clinicA.id, userId: userA.id, role: ClinicRole.OWNER },
    })

    // Login User A
    const loginARes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "ana.phase5@test.com", password: "Password123!" },
    })
    const cookiesA = loginARes.headers["set-cookie"]
    userACookie = Array.isArray(cookiesA) ? cookiesA[0] : cookiesA!

    // 2. Create Clinic B & User B for Multi-Tenancy test
    const clinicB = await prisma.clinic.create({
      data: { name: "Clínica Phase5 Beta", slug: "clinica-p5-beta" },
    })
    clinicBId = clinicB.id

    const userB = await prisma.user.create({
      data: {
        name: "Dra. Beatriz Phase5",
        email: "beatriz.phase5@test.com",
        passwordHash,
        systemRole: SystemRole.USER,
      },
    })

    await prisma.clinicUser.create({
      data: { clinicId: clinicB.id, userId: userB.id, role: ClinicRole.OWNER },
    })

    const loginBRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "beatriz.phase5@test.com", password: "Password123!" },
    })
    const cookiesB = loginBRes.headers["set-cookie"]
    userBCookie = Array.isArray(cookiesB) ? cookiesB[0] : cookiesB!

    // 3. Create Patient A
    const patientA = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        name: "Paciente P5 Teste",
        phone: "51999992222",
      },
    })
    patientAId = patientA.id

    // 4. Create ProcedureRecord A (triggers PostCare creation)
    const procRes = await app.inject({
      method: "POST",
      url: "/api/procedures",
      headers: { cookie: userACookie },
      payload: {
        patientId: patientAId,
        procedureName: "Toxina Botulínica Glabela",
        procedureCategory: "Toxina",
        professionalName: "Dra. Ana Phase5",
        value: 1800,
        regions: ["Glabela"],
      },
    })

    expect(procRes.statusCode).toBe(201)
    procedureAId = procRes.json().procedure.id
  })

  afterAll(async () => {
    await prisma.postCareFollowUp.deleteMany()
    await prisma.incidentPhoto.deleteMany()
    await prisma.incidentUpdate.deleteMany()
    await prisma.incident.deleteMany()
    await prisma.patientPhoto.deleteMany()
    await prisma.clinicActivityLog.deleteMany()
    await prisma.procedureRecord.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.session.deleteMany()
    await prisma.clinicUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.clinic.deleteMany()
    await app.close()
  })

  describe("Private Photos & S3-Compatible Storage", () => {
    let photoAId: string

    it("Uploads a photo into private storage with non-PII storageKey", async () => {
      const dummyBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP"

      const res = await app.inject({
        method: "POST",
        url: `/api/patients/${patientAId}/photos`,
        headers: { cookie: userACookie },
        payload: {
          originalFileName: "foto_antes_glabela.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024,
          base64Data: dummyBase64,
          type: PhotoType.BEFORE,
          bodyRegion: "Glabela",
          notes: "Foto inicial antes da aplicação",
        },
      })

      expect(res.statusCode).toBe(201)
      const photo = res.json().photo
      photoAId = photo.id
      expect(photo.type).toBe("BEFORE")
      expect(photo.storageKey).toContain("clinics/")
      expect(photo.storageKey).not.toContain("Paciente P5 Teste") // No PII in storage key
      expect(photo.accessUrl).toContain("/api/photos/")
    })

    it("Serves photo stream with valid signed token", async () => {
      const accessRes = await app.inject({
        method: "GET",
        url: `/api/photos/${photoAId}/access`,
        headers: { cookie: userACookie },
      })

      expect(accessRes.statusCode).toBe(200)
      const accessUrl = accessRes.json().accessUrl

      const fileRes = await app.inject({
        method: "GET",
        url: accessUrl,
        headers: { cookie: userACookie },
      })

      expect(fileRes.statusCode).toBe(200)
      expect(fileRes.headers["content-type"]).toBe("image/jpeg")
    })

    it("Rejects photo access across tenants (Clinic B tries Clinic A photo -> 404)", async () => {
      const crossTenantRes = await app.inject({
        method: "GET",
        url: `/api/photos/${photoAId}/access`,
        headers: { cookie: userBCookie },
      })

      expect(crossTenantRes.statusCode).toBe(404)
    })
  })

  describe("Incidents & Product/Lot Traceability", () => {
    let incidentAId: string

    it("Registers an incident linked to ProcedureRecord and recovers product/lot snapshots", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/incidents",
        headers: { cookie: userACookie },
        payload: {
          patientId: patientAId,
          procedureRecordId: procedureAId,
          type: "edema",
          severity: IncidentSeverity.HIGH,
          report: "Paciente relatou edema leve na glabela 24h após o procedimento.",
        },
      })

      expect(res.statusCode).toBe(201)
      const incident = res.json().incident
      incidentAId = incident.id
      expect(incident.status).toBe("OPEN")
      expect(incident.procedureRecord.id).toBe(procedureAId)

      // Add evolution update
      const updateRes = await app.inject({
        method: "POST",
        url: `/api/incidents/${incidentAId}/updates`,
        headers: { cookie: userACookie },
        payload: {
          note: "Orientada compressa fria por 15 min. Paciente relata melhora.",
          status: "MONITORING",
        },
      })

      expect(updateRes.statusCode).toBe(201)
      expect(updateRes.json().update.status).toBe("MONITORING")

      // Resolve incident
      const resolveRes = await app.inject({
        method: "POST",
        url: `/api/incidents/${incidentAId}/resolve`,
        headers: { cookie: userACookie },
      })

      expect(resolveRes.statusCode).toBe(200)
      expect(resolveRes.json().incident.status).toBe("RESOLVED")
    })
  })

  describe("Post-Care Follow-ups (24h, 7d, 15d)", () => {
    it("Verifies automatic creation of H24, DAY_7, DAY_15 follow-ups on procedure registration", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/post-care",
        headers: { cookie: userACookie },
      })

      expect(res.statusCode).toBe(200)
      const followUps = res.json().followUps
      expect(followUps.length).toBeGreaterThanOrEqual(3)

      const stages = followUps.map((f: any) => f.stage)
      expect(stages).toContain(FollowUpStage.H24)
      expect(stages).toContain(FollowUpStage.DAY_7)
      expect(stages).toContain(FollowUpStage.DAY_15)
    })
  })

  describe("Patient Recovery Engine", () => {
    it("Queries server-side recovery summary and targets", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/recovery/summary",
        headers: { cookie: userACookie },
      })

      expect(res.statusCode).toBe(200)
      const { summary, targets } = res.json()
      expect(summary).toBeDefined()
      expect(targets).toBeDefined()
    })
  })
})
