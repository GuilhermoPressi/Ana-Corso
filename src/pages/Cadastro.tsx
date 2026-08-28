import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Building2, Lock, Mail, Phone, Sparkles, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/stores/useAuthStore"

export default function Cadastro() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [clinicName, setClinicName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [validationError, setValidationError] = useState("")
  const [loading, setLoading] = useState(false)

  const { register, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError("")
    clearError()

    if (password !== confirmPassword) {
      setValidationError("As senhas não coincidem.")
      return
    }

    if (password.length < 6) {
      setValidationError("A senha deve conter no mínimo 6 caracteres.")
      return
    }

    setLoading(true)
    const success = await register({
      name,
      email,
      phone,
      password,
      clinicName,
    })
    setLoading(false)

    if (success) {
      navigate("/")
    }
  }

  const displayError = validationError || error

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 lg:p-8">
      {/* Glow background accents */}
      <div className="pointer-events-none absolute -left-20 -top-20 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 size-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(316_70%_72%)] shadow-[0_8px_25px_-8px_hsl(335_78%_55%/0.8)]">
            <Sparkles className="size-6 text-white" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
            Criar Conta no Ana Corso
          </h1>
          <p className="text-xs font-medium text-muted-foreground">
            Cadastre sua clínica e comece a utilizar a plataforma em segundos
          </p>
        </div>

        <Card className="glass-panel border-border/80 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-display text-xl font-semibold">Nova Conta</CardTitle>
            <CardDescription className="text-xs">
              Preencha os dados abaixo para configurar seu ambiente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayError && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {displayError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name" className="text-xs">Seu Nome Completo *</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Dra. Mariana Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="clinicName" className="text-xs">Nome da Sua Clínica</Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="clinicName"
                      placeholder="Ex: Clínica Mariana Silva Estética"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email" className="text-xs">E-mail Profissional *</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="mariana@clinica.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone" className="text-xs">WhatsApp / Celular</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="(11) 99999-8888"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs">Senha *</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs">Confirmar Senha *</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 w-full rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)]"
                disabled={loading}
              >
                {loading ? "Criando Conta..." : "Criar minha conta e acessar"}
                {!loading && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-muted-foreground">
              Já possui uma conta cadastrada?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Fazer login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
