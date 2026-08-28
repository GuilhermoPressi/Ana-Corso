import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/stores/useAuthStore"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    clearError()

    const success = await login(email, password)
    setLoading(false)
    if (success) {
      navigate("/")
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 lg:p-8">
      {/* Glow background accents */}
      <div className="pointer-events-none absolute -left-20 -top-20 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 size-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(316_70%_72%)] shadow-[0_8px_25px_-8px_hsl(335_78%_55%/0.8)]">
            <Sparkles className="size-6 text-white" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
            Ana Corso
          </h1>
          <p className="text-xs font-medium text-muted-foreground">SaaS de Gestão para Clínicas de Estética</p>
        </div>

        <Card className="glass-panel border-border/80 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-display text-xl font-semibold">Acesse sua conta</CardTitle>
            <CardDescription className="text-xs">
              Entre com suas credenciais para gerenciar sua clínica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="dra.marisa@clinica.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs">Senha</Label>
                  <button
                    type="button"
                    onClick={() => alert("Para recuperar sua senha, entre em contato com o administrador.")}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar na plataforma"}
                {!loading && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-muted-foreground">
              Ainda não possui uma conta?{" "}
              <Link to="/cadastro" className="font-semibold text-primary hover:underline">
                Criar conta para minha clínica
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} Ana Corso. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
