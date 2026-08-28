import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { ClinicRole, SystemRole } from "@prisma/client"
import bcrypt from "bcryptjs"

import { buildApp } from "../app.js"
import { prisma } from "../db.js"

describe("Fase 4 - CRM, Planning, Proposals, Maps & Protocols Integration Tests", () => {
  const app = buildApp()

  let userACookie: string
  let clinicAId: string
  let patientAId: string
  let leadAId: string

  beforeAll(async () => {
    await app.ready()

    // Create Clinic A and User A (OWNER)
    const clinicA = await prisma.clinic.create({
      data: { name: "Clínica Phase4 Alpha", slug: "clinica-p4-alpha" },
    })
    clinicAId = clinicA.id

    const passwordHash = await bcrypt.hash("Password123!", 10)
    const userA = await prisma.user.create({
      data: {
        name: "Dra. Ana Phase4",
        email: "ana.phase4@test.com",
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
      payload: { email: "ana.phase4@test.com", password: "Password123!" },
    })
    const cookiesA = loginARes.headers["set-cookie"]
    userACookie = Array.isArray(cookiesA) ? cookiesA[0] : cookiesA!

    // Create Patient A
    const patientA = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        name: "Paciente P4 Teste",
        phone: "51999991111",
      },
    })
    patientAId = patientA.id
  })

  afterAll(async () => {
    await prisma.protocolStep.deleteMany()
    await prisma.protocol.deleteMany()
    await prisma.catalogProcedure.deleteMany()
    await prisma.procedureMapPoint.deleteMany()
    await prisma.procedureMap.deleteMany()
    await prisma.proposalItem.deleteMany()
    await prisma.proposal.deleteMany()
    await prisma.facialPlanningRegion.deleteMany()
    await prisma.facialPlanning.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.clinicActivityLog.deleteMany()
    await prisma.patientClinicalProfile.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.session.deleteMany()
    await prisma.clinicUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.clinic.deleteMany()
    await app.close()
  })

  describe("CRM Lead & Conversion", () => {
    it("Creates a lead, moves stage, and converts idempotently into a Patient", async () => {
      // 1. Create Lead
      const createRes = await app.inject({
        method: "POST",
        url: "/api/leads",
        headers: { cookie: userACookie },
        payload: {
          name: "Isabela Lead Teste",
          phone: "51988887777",
          interest: "Preenchimento labial",
          source: "Instagram",
          value: 2400,
        },
      })

      expect(createRes.statusCode).toBe(201)
      const lead = createRes.json().lead
      leadAId = lead.id
      expect(lead.stage).toBe("NEW_CONTACT")

      // 2. Move stage (Kanban)
      const moveRes = await app.inject({
        method: "PATCH",
        url: `/api/leads/${leadAId}/stage`,
        headers: { cookie: userACookie },
        payload: { stage: "EVALUATION_SCHEDULED", position: 0 },
      })

      expect(moveRes.statusCode).toBe(200)
      expect(moveRes.json().lead.stage).toBe("EVALUATION_SCHEDULED")

      // 3. Convert Lead to Patient
      const convertRes = await app.inject({
        method: "POST",
        url: `/api/leads/${leadAId}/convert`,
        headers: { cookie: userACookie },
      })

      expect(convertRes.statusCode).toBe(201)
      const { patient, lead: updatedLead } = convertRes.json()
      expect(updatedLead.stage).toBe("WON")
      expect(updatedLead.patientId).toBe(patient.id)
      expect(patient.name).toBe("Isabela Lead Teste")

      // 4. Idempotency re-test: converting again returns existing patient
      const convertAgainRes = await app.inject({
        method: "POST",
        url: `/api/leads/${leadAId}/convert`,
        headers: { cookie: userACookie },
      })

      expect(convertAgainRes.statusCode).toBe(200)
      expect(convertAgainRes.json().patient.id).toBe(patient.id)
    })
  })

  describe("Facial Planning & Proposals", () => {
    it("Creates a facial planning, completes it, and issues a proposal", async () => {
      // 1. Create Facial Planning
      const planRes = await app.inject({
        method: "POST",
        url: `/api/patients/${patientAId}/plannings`,
        headers: { cookie: userACookie },
        payload: {
          title: "Planejamento Rejuvenescimento",
          estimatedValue: 4200,
          regions: [
            {
              treatmentLine: "toxina",
              regionCode: "glabela",
              regionName: "Glabela",
              productName: "Botox 100U",
              quantity: "20",
              unit: "UI",
              depth: "Intramuscular",
              technique: "Puntiforme",
            },
          ],
        },
      })

      expect(planRes.statusCode).toBe(201)
      const planning = planRes.json().planning
      expect(planning.status).toBe("DRAFT")

      // 2. Complete Facial Planning
      const completeRes = await app.inject({
        method: "POST",
        url: `/api/plannings/${planning.id}/complete`,
        headers: { cookie: userACookie },
      })

      expect(completeRes.statusCode).toBe(200)
      expect(completeRes.json().planning.status).toBe("COMPLETED")

      // 3. Create Proposal
      const propRes = await app.inject({
        method: "POST",
        url: "/api/proposals",
        headers: { cookie: userACookie },
        payload: {
          patientId: patientAId,
          facialPlanningId: planning.id,
          title: "Proposta Comercial Toxina + Preenchimento",
          total: 4200,
          items: [
            {
              nameSnapshot: "Toxina Botulínica Glabela",
              quantity: 1,
              unitPrice: 1800,
              totalPrice: 1800,
            },
          ],
        },
      })

      expect(propRes.statusCode).toBe(201)
      expect(propRes.json().proposal.total).toBe("4200.00")
    })
  })

  describe("Procedure Maps (2D & 3D)", () => {
    it("Creates a 3D procedure map with Raycasting coordinates and locks on completion", async () => {
      const mapRes = await app.inject({
        method: "POST",
        url: `/api/patients/${patientAId}/maps`,
        headers: { cookie: userACookie },
        payload: {
          procedureName: "Toxina botulínica 3D",
          mode: "THREE_D",
          points: [
            {
              regionId: "glabela",
              regionName: "Glabela",
              product: "Botox Allergan",
              quantity: "20 UI",
              depth: "Intramuscular",
              technique: "Puntiforme",
              position3dX: 0.05,
              position3dY: 0.42,
              position3dZ: 0.8,
            },
          ],
        },
      })

      expect(mapRes.statusCode).toBe(201)
      const map = mapRes.json().map
      expect(map.mode).toBe("THREE_D")
      expect(map.points[0].position3dX).toBe(0.05)

      // Complete Map
      const completeRes = await app.inject({
        method: "POST",
        url: `/api/maps/${map.id}/complete`,
        headers: { cookie: userACookie },
      })

      expect(completeRes.statusCode).toBe(200)
      expect(completeRes.json().map.status).toBe("COMPLETED")

      // Attempting to delete a point on completed map returns 400 LOCKED
      const deletePtRes = await app.inject({
        method: "DELETE",
        url: `/api/maps/${map.id}/points/${map.points[0].id}`,
        headers: { cookie: userACookie },
      })

      expect(deletePtRes.statusCode).toBe(400)
      expect(deletePtRes.json().error.code).toBe("LOCKED")
    })
  })

  describe("Catalog & Protocols", () => {
    it("Creates catalog procedure and a combo protocol", async () => {
      const catRes = await app.inject({
        method: "POST",
        url: "/api/catalog/procedures",
        headers: { cookie: userACookie },
        payload: {
          name: "Bioestimulador de Colágeno",
          category: "Bioestimulador",
          defaultPrice: 3200,
          estimatedDurationMin: 45,
        },
      })

      expect(catRes.statusCode).toBe(201)

      const protoRes = await app.inject({
        method: "POST",
        url: "/api/protocols",
        headers: { cookie: userACookie },
        payload: {
          name: "Protocolo Firmadora 90D",
          description: "3 sessões com intervalo de 30 dias",
          packagePrice: 7500,
          steps: [
            {
              procedureName: "Bioestimulador",
              label: "Bioestimulador Sessão 1",
              dayOffset: 1,
              listPrice: 3200,
            },
            {
              procedureName: "Bioestimulador",
              label: "Bioestimulador Sessão 2",
              dayOffset: 30,
              listPrice: 3200,
            },
          ],
        },
      })

      expect(protoRes.statusCode).toBe(201)
      expect(protoRes.json().protocol.packagePrice).toBe("7500.00")
    })
  })
})
