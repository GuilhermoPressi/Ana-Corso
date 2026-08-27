import { useLocation } from "react-router-dom"
import { Bell, Menu, Plus, Search } from "lucide-react"

import { QuickReferenceSheet } from "@/components/clinical/QuickReferenceSheet"
import { Logo } from "@/components/layout/Logo"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

export function Header({ mobileOpen, onMobileOpenChange }: {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}) {
  const { pathname } = useLocation()
  const current = findNavItem(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl lg:px-8">
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <SidebarNav onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>

      <Logo className="lg:hidden" showWordmark={false} />

      <div className="hidden min-w-0 flex-1 flex-col lg:flex">
        <h1 className="truncate font-display text-[15px] font-semibold leading-tight">
          {current?.title ?? "Ana Corso"}
        </h1>
        <p className="text-[11px] text-muted-foreground">Clínica Ana Corso · Porto Alegre</p>
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

        <Button size="sm" className="hidden rounded-full shadow-[0_8px_20px_-10px_hsl(335_78%_55%/0.9)] lg:inline-flex">
          <Plus /> Novo atendimento
        </Button>

        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notificações">
          <Bell />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-muted">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/12 text-[11px] font-semibold text-primary">AC</AvatarFallback>
              </Avatar>
              <span className="hidden whitespace-nowrap text-[13px] font-medium 2xl:block">Dra. Ana Corso</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-[13px] font-semibold">Dra. Ana Corso</p>
              <p className="text-xs text-muted-foreground">CRBM 12.345 · Biomédica esteta</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Meu perfil</DropdownMenuItem>
            <DropdownMenuItem>Equipe e permissões</DropdownMenuItem>
            <DropdownMenuItem>Assinatura</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
