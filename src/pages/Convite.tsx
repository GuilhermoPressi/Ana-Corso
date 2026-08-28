import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type InvitationInfo = {
  id: string
  email: string
  role: string
  clinicName: string
  expiresAt: string
}

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchInvitation() {
      if (!token) return
      try {
        const res = await fetch(`/api/team/invitations/${token}`)
        if (res.ok) {
          const data = await res.json()
          setInvitation(data.invitation)
        } else {
          setError("Convite inválido ou expirado.")
        }
      } catch {
        setError("Erro de conexão ao validar convite.")
      } finally {
        setLoading(false)
      }
    }
    fetchInvitation()
  }, [token])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    if (!token || submitting) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/team/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      })

      if (res.ok) {
        toast.success("Convite aceito com sucesso! Faça login com sua conta.")
        navigate("/login")
      } else {
        const data = await res.json()
        toast.error(data.error?.message || "Erro ao aceitar convite.")
      }
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center p-6 bg-background">
        <p className="text-sm text-muted-foreground">Validando convite da equipe...</p>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="grid min-h-screen place-items-center p-6 bg-background">
        <Card className="max-w-md p-6 text-center shadow-lg">
          <CardTitle className="font-display text-lg text-destructive">Convite Indisponível</CardTitle>
          <CardDescription className="mt-2 text-sm">{error || "Este convite é inválido ou já foi utilizado."}</CardDescription>
          <Button className="mt-4" onClick={() => navigate("/login")}>
            Ir para Login
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center p-6 bg-muted/40">
      <Card className="w-full max-w-md border-border/70 py-0 shadow-xl">
        <CardHeader className="p-6 text-center border-b border-border/60">
          <div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UserPlus className="size-6" />
          </div>
          <CardTitle className="font-display text-xl">Convite para a Equipe</CardTitle>
          <CardDescription className="mt-1 text-xs">
            Você foi convidado(a) para fazer parte da clínica <strong className="text-foreground">{invitation.clinicName}</strong> como <strong className="text-primary">{invitation.role}</strong>.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleAccept}>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>E-mail do Convite</Label>
              <Input value={invitation.email} disabled className="bg-muted" />
            </div>

            <div>
              <Label>Seu Nome Completo</Label>
              <Input
                placeholder="Dra. Nome Sobrenome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Crie sua Senha de Acesso</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Processando..." : "Aceitar Convite e Acessar"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
