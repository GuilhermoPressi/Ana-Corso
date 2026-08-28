import { useEffect, useState } from "react"
import { CheckCircle, PlayCircle, GraduationCap } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type Lesson = {
  id: string
  title: string
  description?: string | null
  contentType: string
  videoUrl?: string | null
  content?: string | null
  durationMin: number
  progresses: { completedAt?: string | null }[]
}

type Module = {
  id: string
  title: string
  description?: string | null
  lessons: Lesson[]
}

type Course = {
  id: string
  title: string
  slug: string
  description?: string | null
  totalLessons: number
  completedLessons: number
  progressPercent: number
  modules: Module[]
}

export default function Academia() {
  const [courses, setCourses] = useState<Course[]>([])
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)

  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch("/api/academy/courses")
        if (res.ok) {
          const data = await res.json()
          setCourses(data.courses || [])
          if (data.courses?.[0]?.modules?.[0]?.lessons?.[0]) {
            setActiveLesson(data.courses[0].modules[0].lessons[0])
          }
        }
      } catch {
        // ignore
      }
    }
    loadCourses()
  }, [])

  async function toggleProgress(lessonId: string) {
    try {
      const res = await fetch(`/api/academy/lessons/${lessonId}/progress`, {
        method: "POST",
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.completed ? "Aula marcada como concluída!" : "Conclusão desmarcada.")

        // Refresh progress locally
        setCourses((prevCourses) =>
          prevCourses.map((c) => ({
            ...c,
            modules: c.modules.map((m) => ({
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId
                  ? {
                      ...l,
                      progresses: data.completed ? [{ completedAt: new Date().toISOString() }] : [],
                    }
                  : l,
              ),
            })),
          })),
        )
      }
    } catch {
      // ignore
    }
  }

  const mainCourse = courses[0]

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Academia Ana Corso"
        description="Treinamentos clínicos, anatomia aplicada e estratégias de alta performance para harmonização estética."
      />

      {mainCourse ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Player & Conteúdo Principal */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card className="overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)]">
              <div className="relative aspect-video bg-black/90">
                {activeLesson?.videoUrl ? (
                  <iframe
                    src={activeLesson.videoUrl}
                    title={activeLesson.title}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="grid h-full place-items-center p-8 text-center text-white">
                    <div>
                      <PlayCircle className="mx-auto size-12 opacity-60" />
                      <p className="mt-2 text-sm font-semibold">{activeLesson?.title || "Selecione uma aula"}</p>
                      <p className="mt-1 text-xs opacity-75">Vídeo demonstrativo e técnica guiada</p>
                    </div>
                  </div>
                )}
              </div>

              <CardHeader className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="mb-1 text-[10px]">
                      {activeLesson?.durationMin || 10} minutos
                    </Badge>
                    <CardTitle className="font-display text-base">{activeLesson?.title}</CardTitle>
                  </div>

                  {activeLesson && (
                    <Button
                      size="sm"
                      variant={activeLesson.progresses[0]?.completedAt ? "secondary" : "default"}
                      onClick={() => toggleProgress(activeLesson.id)}
                    >
                      <CheckCircle className="mr-1.5 size-4" />
                      {activeLesson.progresses[0]?.completedAt ? "Concluída" : "Marcar Concluída"}
                    </Button>
                  )}
                </div>
                <CardDescription className="mt-2 text-[12px] leading-relaxed">
                  {activeLesson?.description || "Conteúdo técnico e orientação anatômica para procedimentos estéticos."}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Sidebar de Módulos & Aulas */}
          <div className="flex flex-col gap-4">
            <Card className="border-border/70 p-4 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xs font-semibold">{mainCourse.title}</h3>
                  <p className="text-[11px] text-muted-foreground">Progresso do Treinamento</p>
                </div>
                <span className="font-display text-sm font-bold text-primary">{mainCourse.progressPercent}%</span>
              </div>
              <Progress value={mainCourse.progressPercent} className="h-1.5" />
            </Card>

            <div className="flex flex-col gap-3">
              {mainCourse.modules.map((mod) => (
                <Card key={mod.id} className="overflow-hidden border-border/70 py-0 shadow-none">
                  <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
                    <p className="text-[12px] font-semibold">{mod.title}</p>
                  </div>
                  <div className="divide-y divide-border/50">
                    {mod.lessons.map((les) => {
                      const isSelected = activeLesson?.id === les.id
                      const isDone = les.progresses[0]?.completedAt != null
                      return (
                        <button
                          key={les.id}
                          type="button"
                          onClick={() => setActiveLesson(les)}
                          className={`flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-accent/50 ${
                            isSelected ? "bg-accent/80 font-medium" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <PlayCircle className={`size-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="text-[12px] line-clamp-1">{les.title}</span>
                          </div>
                          {isDone && <CheckCircle className="size-3.5 text-success" />}
                        </button>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <GraduationCap className="mx-auto size-10 opacity-40" />
          <p className="mt-3 text-[14px] font-semibold text-foreground">Academia de Treinamento Clínico</p>
          <p className="mt-1 text-[12px]">Os módulos educacionais e vídeos curados serão carregados em breve.</p>
        </Card>
      )}
    </div>
  )
}
