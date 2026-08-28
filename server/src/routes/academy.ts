import type { FastifyInstance } from "fastify"
import { AcademyStatus, LessonType } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth, requireSystemAdmin } from "../middlewares/auth.js"

const createCourseSchema = z.object({
  title: z.string().min(2, "Título é obrigatório"),
  slug: z.string().min(2, "Slug é obrigatório"),
  description: z.string().optional().nullable(),
  coverImageKey: z.string().optional().nullable(),
})

export async function academyRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  // GET /api/academy/courses - List courses with user progress
  fastify.get("/academy/courses", async (request) => {
    const userId = request.user!.id

    const courses = await prisma.academyCourse.findMany({
      where: { status: AcademyStatus.PUBLISHED },
      include: {
        modules: {
          orderBy: { position: "asc" },
          include: {
            lessons: {
              where: { status: AcademyStatus.PUBLISHED },
              orderBy: { position: "asc" },
              include: {
                progresses: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
      orderBy: { position: "asc" },
    })

    const withProgress = courses.map((course) => {
      let totalLessons = 0
      let completedLessons = 0

      course.modules.forEach((mod) => {
        mod.lessons.forEach((les) => {
          totalLessons++
          if (les.progresses[0]?.completedAt) {
            completedLessons++
          }
        })
      })

      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

      return {
        ...course,
        totalLessons,
        completedLessons,
        progressPercent,
      }
    })

    return { courses: withProgress }
  })

  // POST /api/academy/lessons/:id/progress - Toggle lesson completion
  fastify.post("/academy/lessons/:id/progress", async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.id

    const lesson = await prisma.academyLesson.findUnique({
      where: { id },
    })

    if (!lesson) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Aula não encontrada." },
      })
    }

    const existing = await prisma.academyLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: id } },
    })

    const isCompleted = existing?.completedAt != null

    const progress = await prisma.academyLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: id } },
      create: {
        userId,
        lessonId: id,
        completedAt: new Date(),
        lastAccessedAt: new Date(),
      },
      update: {
        completedAt: isCompleted ? null : new Date(),
        lastAccessedAt: new Date(),
      },
    })

    return { progress, completed: !isCompleted }
  })

  // POST /api/academy/courses (System Admin Only)
  fastify.post("/academy/courses", { preHandler: requireSystemAdmin }, async (request, reply) => {
    const parseResult = createCourseSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: parseResult.error.errors[0]?.message || "Dados inválidos." },
      })
    }

    const body = parseResult.data

    const course = await prisma.academyCourse.create({
      data: {
        title: body.title.trim(),
        slug: body.slug.toLowerCase().trim(),
        description: body.description?.trim() || null,
        coverImageKey: body.coverImageKey || null,
        status: AcademyStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    })

    return reply.status(201).send({ course })
  })
}
