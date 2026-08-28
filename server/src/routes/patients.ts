import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, PatientStatus } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

export function normalizeDigits(val?: string | null): string | null {
  if (!val) return null
  const cleaned = val.replace(/\D/g, "")
  return cleaned.length > 0 ? cleaned : null
}

export function parseUtcBirthDate(dateStr?: string | null): Date | null {
  if (!dateStr || !dateStr.trim()) return null
  const parts = dateStr.trim().split("-")
  if (parts.length !== 3) return null
  const [year, month, day] = parts.map((p) => parseInt(p, 10))
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  return new Date(Date.UTC(year, month - 1, day))
}

const createPatientSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  cpf: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  mainProcedure: z.string().nullable().optional(),
  responsibleProfessional: z.string().nullable().optional(),
  leadSource: z.string().nullable().optional(),
  skinType: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  clinicalNotes: z.string().nullable().optional(),
})

const updatePatientSchema = createPatientSchema.partial().extend({
  status: z.nativeEnum(PatientStatus).optional(),
})

export async function patientRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  // Middleware auxiliary check: Require active clinic
  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica ativa vinculada à sessão." },
      })
    }
    if (request.clinic.status === ClinicStatus.BLOCKED) {
      return reply.status(403).send({
        error: { code: "CLINIC_BLOCKED", message: "Acesso da clínica temporariamente suspenso." },
      })
    }
  })

  // GET /api/patients/options (Lightweight dropdown selector)
  fastify.get("/patients/options", async (request) => {
    const querySchema = z.object({
      search: z.string().optional(),
      limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10), 50) : 20)),
    })

    const { search, limit = 20 } = querySchema.parse(request.query)
    const clinicId = request.clinic!.id

    const whereClause: any = {
      clinicId,
      status: { in: [PatientStatus.ACTIVE, PatientStatus.ATTENTION, PatientStatus.INACTIVE] },
    }

    if (search && search.trim()) {
      const s = search.trim().toLowerCase()
      const digits = normalizeDigits(s)
      whereClause.OR = [
        { name: { contains: s, mode: "insensitive" } },
        ...(digits ? [{ phone: { contains: digits } }, { cpf: { contains: digits } }] : []),
      ]
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        mainProcedure: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    })

    return { options: patients }
  })

  // GET /api/patients (Paginated main list)
  fastify.get("/patients", async (request) => {
    const querySchema = z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      mainProcedure: z.string().optional(),
      page: z.string().optional().transform((v) => (v ? Math.max(parseInt(v, 10), 1) : 1)),
      limit: z.string().optional().transform((v) => (v ? Math.min(parseInt(v, 10), 100) : 25)),
    })

    const { search, status, mainProcedure, page = 1, limit = 25 } = querySchema.parse(request.query)
    const clinicId = request.clinic!.id
    const skip = (page - 1) * limit

    const whereClause: any = { clinicId }

    // Refinement 7: By default, exclude ARCHIVED patients unless explicitly requested
    if (status && status.trim()) {
      const upperStatus = status.trim().toUpperCase()
      if (Object.values(PatientStatus).includes(upperStatus as PatientStatus)) {
        whereClause.status = upperStatus as PatientStatus
      }
    } else {
      whereClause.status = { in: [PatientStatus.ACTIVE, PatientStatus.ATTENTION, PatientStatus.INACTIVE] }
    }

    if (mainProcedure && mainProcedure.trim()) {
      whereClause.mainProcedure = { contains: mainProcedure.trim(), mode: "insensitive" }
    }

    if (search && search.trim()) {
      const s = search.trim().toLowerCase()
      const digits = normalizeDigits(s)
      whereClause.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        ...(digits ? [{ phone: { contains: digits } }, { cpf: { contains: digits } }] : []),
      ]
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where: whereClause }),
      prisma.patient.findMany({
        where: whereClause,
        include: {
          clinicalProfile: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ])

    return {
      items: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  })

  // POST /api/patients (Create Patient)
  fastify.post("/patients", async (request, reply) => {
    const parseResult = createPatientSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const {
      name,
      cpf,
      phone,
      email,
      city,
      birthDate,
      mainProcedure,
      responsibleProfessional,
      leadSource,
      skinType,
      allergies,
      clinicalNotes,
    } = parseResult.data

    const clinicId = request.clinic!.id
    const userId = request.user!.id

    // Refinement 10: Normalize CPF, Phone, Email
    const normalizedCpf = normalizeDigits(cpf)
    const normalizedPhone = normalizeDigits(phone)
    const normalizedEmail = email?.trim().toLowerCase() || null
    const parsedBirthDate = parseUtcBirthDate(birthDate)

    // Check duplicate CPF within the same clinic
    if (normalizedCpf) {
      const existingCpf = await prisma.patient.findUnique({
        where: {
          clinicId_cpf: {
            clinicId,
            cpf: normalizedCpf,
          },
        },
      })

      if (existingCpf) {
        return reply.status(400).send({
          error: {
            code: "PATIENT_CPF_EXISTS",
            message: "Já existe uma paciente cadastrada nesta clínica com este CPF.",
          },
        })
      }
    }

    // Atomic creation
    const { patient } = await prisma.$transaction(async (tx) => {
      const newPatient = await tx.patient.create({
        data: {
          clinicId,
          name: name.trim(),
          cpf: normalizedCpf,
          phone: normalizedPhone,
          email: normalizedEmail,
          city: city?.trim() || null,
          birthDate: parsedBirthDate,
          status: PatientStatus.ACTIVE,
          mainProcedure: mainProcedure?.trim() || null,
          responsibleProfessional: responsibleProfessional?.trim() || request.user!.name,
          leadSource: leadSource?.trim() || null,
          createdByUserId: userId,
          updatedByUserId: userId,
        },
      })

      await tx.patientClinicalProfile.create({
        data: {
          patientId: newPatient.id,
          skinType: skinType?.trim() || null,
          allergies: allergies?.trim() || null,
          clinicalNotes: clinicalNotes?.trim() || null,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PATIENT,
          entityId: newPatient.id,
          action: ClinicActivityAction.PATIENT_CREATED,
        },
      })

      const fullPatient = await tx.patient.findUnique({
        where: { id: newPatient.id },
        include: { clinicalProfile: true },
      })

      return { patient: fullPatient! }
    })

    return reply.status(201).send({ patient })
  })

  // GET /api/patients/:id (Strict tenant isolation)
  fastify.get("/patients/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id

    const patient = await prisma.patient.findFirst({
      where: {
        id,
        clinicId, // Strict Tenant Isolation!
      },
      include: {
        clinicalProfile: true,
      },
    })

    if (!patient) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
      })
    }

    return { patient }
  })

  // PATCH /api/patients/:id (Real Partial Update)
  fastify.patch("/patients/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const existingPatient = await prisma.patient.findFirst({
      where: { id, clinicId },
      include: { clinicalProfile: true },
    })

    if (!existingPatient) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
      })
    }

    const parseResult = updatePatientSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const body = parseResult.data

    const normalizedCpf = body.cpf !== undefined ? normalizeDigits(body.cpf) : existingPatient.cpf
    const normalizedPhone = body.phone !== undefined ? normalizeDigits(body.phone) : existingPatient.phone
    const normalizedEmail = body.email !== undefined ? (body.email?.trim().toLowerCase() || null) : existingPatient.email
    const parsedBirthDate = body.birthDate !== undefined ? parseUtcBirthDate(body.birthDate) : existingPatient.birthDate

    // Check CPF uniqueness if CPF is updated
    if (normalizedCpf && normalizedCpf !== existingPatient.cpf) {
      const duplicateCpf = await prisma.patient.findFirst({
        where: {
          clinicId,
          cpf: normalizedCpf,
          id: { not: id },
        },
      })

      if (duplicateCpf) {
        return reply.status(400).send({
          error: {
            code: "PATIENT_CPF_EXISTS",
            message: "Já existe outra paciente nesta clínica cadastrada com este CPF.",
          },
        })
      }
    }

    // Atomic update
    const updated = await prisma.$transaction(async (tx) => {
      const patientPatch: any = {
        updatedByUserId: userId,
      }

      if (body.name !== undefined) patientPatch.name = body.name.trim()
      if (body.cpf !== undefined) patientPatch.cpf = normalizedCpf
      if (body.phone !== undefined) patientPatch.phone = normalizedPhone
      if (body.email !== undefined) patientPatch.email = normalizedEmail
      if (body.city !== undefined) patientPatch.city = body.city?.trim() || null
      if (body.birthDate !== undefined) patientPatch.birthDate = parsedBirthDate
      if (body.status !== undefined) patientPatch.status = body.status
      if (body.mainProcedure !== undefined) patientPatch.mainProcedure = body.mainProcedure?.trim() || null
      if (body.responsibleProfessional !== undefined) patientPatch.responsibleProfessional = body.responsibleProfessional?.trim() || null
      if (body.leadSource !== undefined) patientPatch.leadSource = body.leadSource?.trim() || null

      await tx.patient.update({
        where: { id },
        data: patientPatch,
      })

      if (
        body.skinType !== undefined ||
        body.allergies !== undefined ||
        body.clinicalNotes !== undefined
      ) {
        const profilePatch: any = {}
        if (body.skinType !== undefined) profilePatch.skinType = body.skinType?.trim() || null
        if (body.allergies !== undefined) profilePatch.allergies = body.allergies?.trim() || null
        if (body.clinicalNotes !== undefined) profilePatch.clinicalNotes = body.clinicalNotes?.trim() || null

        await tx.patientClinicalProfile.upsert({
          where: { patientId: id },
          create: {
            patientId: id,
            ...profilePatch,
          },
          update: profilePatch,
        })
      }

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PATIENT,
          entityId: id,
          action: ClinicActivityAction.PATIENT_UPDATED,
        },
      })

      return tx.patient.findUnique({
        where: { id },
        include: { clinicalProfile: true },
      })
    })

    return { patient: updated }
  })

  // POST /api/patients/:id/archive (Soft Delete)
  fastify.post("/patients/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const patient = await prisma.patient.findFirst({
      where: { id, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
      })
    }

    const archived = await prisma.$transaction(async (tx) => {
      const updated = await tx.patient.update({
        where: { id },
        data: {
          status: PatientStatus.ARCHIVED,
          archivedAt: new Date(),
          updatedByUserId: userId,
        },
        include: { clinicalProfile: true },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PATIENT,
          entityId: id,
          action: ClinicActivityAction.PATIENT_ARCHIVED,
        },
      })

      return updated
    })

    return { patient: archived, message: "Paciente arquivada com sucesso." }
  })

  // POST /api/patients/:id/restore (Restore Archived Patient)
  fastify.post("/patients/:id/restore", async (request, reply) => {
    const { id } = request.params as { id: string }
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const patient = await prisma.patient.findFirst({
      where: { id, clinicId },
    })

    if (!patient) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Paciente não encontrada." },
      })
    }

    const restored = await prisma.$transaction(async (tx) => {
      const updated = await tx.patient.update({
        where: { id },
        data: {
          status: PatientStatus.ACTIVE,
          archivedAt: null,
          updatedByUserId: userId,
        },
        include: { clinicalProfile: true },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.PATIENT,
          entityId: id,
          action: ClinicActivityAction.PATIENT_RESTORED,
        },
      })

      return updated
    })

    return { patient: restored, message: "Paciente restaurada com sucesso." }
  })
}
