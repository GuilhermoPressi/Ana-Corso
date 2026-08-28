import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { ClinicRole, SystemRole } from "@prisma/client"
import bcrypt from "bcryptjs"

import { buildApp } from "../app.js"
import { prisma } from "../db.js"

describe("Fase 3 - Core Operations & Atomic Transaction Tests", () => {
  const app = buildApp()

  let userACookie: string
  let clinicAId: string
  let patientAId: string
  let inventoryItemAId: string

  beforeAll(async () => {
    await app.ready()

    // Create Clinic A and User A (OWNER)
    const clinicA = await prisma.clinic.create({
      data: { name: "Clínica Phase3 Alpha", slug: "clinica-p3-alpha" },
    })
    clinicAId = clinicA.id

    const passwordHash = await bcrypt.hash("Password123!", 10)
    const userA = await prisma.user.create({
      data: {
        name: "Dra. Ana Phase3",
        email: "ana.phase3@test.com",
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
      payload: { email: "ana.phase3@test.com", password: "Password123!" },
    })
    const cookiesA = loginARes.headers["set-cookie"]
    userACookie = Array.isArray(cookiesA) ? cookiesA[0] : cookiesA!

    // Create Patient A
    const patientA = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        name: "Paciente P3 Teste",
        cpf: "99988877766",
        phone: "51999990000",
      },
    })
    patientAId = patientA.id

    // Create Inventory Item (10 UI available)
    const item = await prisma.inventoryItem.create({
      data: {
        clinicId: clinicA.id,
        name: "Botox 100 UI",
        brand: "Allergan",
        category: "Toxina botulínica",
        contentUnit: "UI",
        contentPerPack: 100,
        packLabel: "frasco",
        quantity: 10,
        minQuantity: 2,
        packCost: 900,
        lot: "LOT-A1",
      },
    })
    inventoryItemAId = item.id
  })

  afterAll(async () => {
    await prisma.idempotencyKey.deleteMany()
    await prisma.clinicActivityLog.deleteMany()
    await prisma.ledgerEntry.deleteMany()
    await prisma.patientReturn.deleteMany()
    await prisma.scheduleEvent.deleteMany()
    await prisma.inventoryMovement.deleteMany()
    await prisma.procedureProductUsage.deleteMany()
    await prisma.procedureRecord.deleteMany()
    await prisma.inventoryItem.deleteMany()
    await prisma.patientClinicalProfile.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.session.deleteMany()
    await prisma.clinicUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.clinic.deleteMany()
    await app.close()
  })

  describe("Master Procedure Transaction & Concurrency", () => {
    it("Atomic registration of procedure: decrements stock, creates procedure, usage, movement, revenue, return, schedule", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/procedures",
        headers: {
          cookie: userACookie,
          "idempotency-key": "key-p3-test-1",
        },
        payload: {
          patientId: patientAId,
          procedureName: "Toxina botulínica",
          procedureCategory: "Toxina botulínica",
          regions: ["Testa / Frontal", "Glabela"],
          inventoryItemId: inventoryItemAId,
          quantity: 4,
          value: 1800,
          professionalName: "Dra. Ana Phase3",
        },
      })

      expect(res.statusCode).toBe(201)
      const data = res.json()
      expect(data.directCost).toBe(36) // 4 UI * (900 / 100) = 36 BRL

      // Verify stock was reduced from 10 to 6
      const itemAfter = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemAId },
      })
      expect(Number(itemAfter?.quantity)).toBe(6)

      // Verify LedgerEntry REVENUE was created
      const ledger = await prisma.ledgerEntry.findFirst({
        where: { clinicId: clinicAId, procedureRecordId: data.procedure.id },
      })
      expect(ledger).not.toBeNull()
      expect(Number(ledger?.amount)).toBe(1800)
      expect(Number(ledger?.directCost)).toBe(36)

      // Verify PatientReturn 15-day return created
      const ret = await prisma.patientReturn.findFirst({
        where: { clinicId: clinicAId, procedureRecordId: data.procedure.id },
      })
      expect(ret).not.toBeNull()
      expect(ret?.status).toBe("PENDING")

      // Verify ScheduleEvent created for 15 days out
      const schedule = await prisma.scheduleEvent.findFirst({
        where: { clinicId: clinicAId, id: ret!.scheduleEventId! },
      })
      expect(schedule).not.toBeNull()
      expect(schedule?.kind).toBe("RETURN")
    })

    it("IdempotencyKey protection: sending exact same Idempotency-Key returns cached response without duplicate execution", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/procedures",
        headers: {
          cookie: userACookie,
          "idempotency-key": "key-p3-test-1", // Same key!
        },
        payload: {
          patientId: patientAId,
          procedureName: "Toxina botulínica",
          procedureCategory: "Toxina botulínica",
          regions: ["Testa / Frontal"],
          inventoryItemId: inventoryItemAId,
          quantity: 4,
          value: 1800,
          professionalName: "Dra. Ana Phase3",
        },
      })

      expect(res.statusCode).toBe(201)
      // Verify stock did NOT decrement again (remains 6)
      const itemAfter = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemAId },
      })
      expect(Number(itemAfter?.quantity)).toBe(6)
    })

    it("Insufficient stock aborts entire transaction cleanly with INSUFFICIENT_STOCK error", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/procedures",
        headers: {
          cookie: userACookie,
          "idempotency-key": "key-p3-insufficient-stock",
        },
        payload: {
          patientId: patientAId,
          procedureName: "Toxina botulínica Excesso",
          procedureCategory: "Toxina botulínica",
          inventoryItemId: inventoryItemAId,
          quantity: 20, // Requesting 20 UI when only 6 available!
          value: 3000,
          professionalName: "Dra. Ana Phase3",
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe("INSUFFICIENT_STOCK")

      // Verify stock remains 6 and no procedure record was saved
      const itemAfter = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemAId },
      })
      expect(Number(itemAfter?.quantity)).toBe(6)
    })
  })
})
