import { Link, useLocation, useNavigate } from "react-router-dom"
import { Building2, LogOut, Menu, Plus, Search, ShieldAlert } from "lucide-react"

import { NotificationCenter } from "@/components/layout/NotificationCenter"
import { QuickReferenceSheet } from "@/components/clinical/QuickReferenceSheet"
import { Logo } from "@/components/layout/Logo"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { findNavItem } from "@/lib/navigation"
import { useAuthStore } from "@/stores/useAuthStore"
import { useClinicStore } from "@/stores/useClinicStore"

function getInitials(name: string): string {
  if (!name) return "AC"
  const parts = name.replace(/^Dra?\.\s*/i, "").trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Header({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const current = findNavItem(pathname)
  const profile = useClinicStore((state) => state.profile)
  const { user, clinic, clinics, switchClinic, logout } = useAuthStore()

  const displayName = user?.name || profile.professional || "Usuário"
  const displayClinic = clinic?.name || profile.name
  const isAdmin = user?.systemRole?.toUpperCase() === "ADMIN"

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl lg:px-8">
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col h-full">
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <SidebarNav onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>

      <Logo className="lg:hidden" showWordmark={false} />

      <div className="hidden min-w-0 flex-1 flex-col lg:flex">
        <h1 className="truncate font-display text-[15px] font-semibold leading-tight flex items-center gap-2">
          {current?.title ?? displayClinic}
          {isAdmin && (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]">
              <ShieldAlert className="size-3 mr-1" /> SaaS Admin
            </Badge>
          )}
        </h1>
        <p className="text-[11px] text-muted-foreground">
          {displayClinic} · {profile.city || "Estética Avançada"}
        </p>
      </div>

      <div className="relative ml-auto hidden w-full max-w-[240px] shrink md:block xl:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente, procedimento..."
          className="h-9 rounded-full border-border/70 bg-muted/50 pl-9 text-[13px] shadow-none focus-visible:bg-background"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
        <QuickReferenceSheet />

        <Button size="sm" asChild className="hidden rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)] lg:inline-flex">
          <Link to="/agenda">
            <Plus /> Novo atendimento
          </Link>
        </Button>

        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-muted">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden whitespace-nowrap text-[13px] font-medium 2xl:block">{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="text-[13px] font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || profile.email}</p>
              <p className="mt-1 text-[11px] text-primary font-medium">{displayClinic}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {clinics.length > 1 && (
              <>
                <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Alternar Clínica
                </DropdownMenuLabel>
                {clinics.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => switchClinic(c.id)}
                    className={c.id === clinic?.id ? "font-bold text-primary" : ""}
                  >
                    <Building2 className="size-4 mr-2" />
                    <span className="truncate">{c.name}</span>
                    {c.id === clinic?.id && <span className="ml-auto text-xs font-semibold">✓</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to="/configuracoes">Configurações da Clínica</Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/admin" className="font-semibold text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="size-4 mr-2" /> Painel de Controle SaaS
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4 mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
