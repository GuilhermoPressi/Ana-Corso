import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Lock, Mail, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/stores/useAuthStore"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState("")
  const { login, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLocalError("")
    clearError()

    const success = await login(email, password)
    setLoading(false)

    if (success) {
      const user = useAuthStore.getState().user
      if (user?.systemRole === "admin") {
        navigate("/admin")
      } else {
        setLocalError("Esta conta não possui privilégios de administrador do sistema.")
      }
    }
  }

  const displayError = localError || error

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-6 text-slate-100">
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative grid size-12 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">
            Painel Administrativo
          </h1>
          <p className="text-xs font-medium text-slate-400">Gestão Global do SaaS Ana Corso</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl text-slate-100 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-display text-xl font-semibold">Login de Administrador</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Acesso exclusivo para contas com perfil systemRole = admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-400">
                {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs text-slate-300">E-mail do Administrador</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@anacorso.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-slate-800 bg-slate-950 pl-9 text-xs text-white focus-visible:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs text-slate-300">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-800 bg-slate-950 pl-9 text-xs text-white focus-visible:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
                disabled={loading}
              >
                {loading ? "Verificando..." : "Acessar Painel de Controle"}
                {!loading && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
