import { NavLink } from "react-router-dom"
import { Building2, ShieldAlert, Users } from "lucide-react"

import { Logo } from "@/components/layout/Logo"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { navigation, secondaryNavigation, type NavItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/useAuthStore"

const adminNavItems: NavItem[] = [
  { title: "Painel SaaS", url: "/admin", icon: ShieldAlert, ready: true },
  { title: "Usuários do SaaS", url: "/admin/users", icon: Users, ready: true },
  { title: "Clínicas Cadastradas", url: "/admin/clinics", icon: Building2, ready: true },
]

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.url}
      end={item.url === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
          "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive &&
            "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.6)]",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
          <Icon className={cn("size-4 shrink-0 transition-colors", isActive && "text-primary")} />
          <span className="truncate">{item.short ?? item.title}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-auto h-5 rounded-full px-1.5 text-[10px] font-semibold">
              {item.badge}
            </Badge>
          )}
          {!item.badge && !item.ready && (
            <span className="pointer-events-none absolute right-2 rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              em breve
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.systemRole?.toUpperCase() === "ADMIN"

  const clinic = useAuthStore((state) => state.clinic)
  const isReceptionist = clinic?.role === "RECEPTIONIST"

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-5 px-3 py-5">
          {/* Grupo Administrativo para contas SystemRole = ADMIN */}
          {isAdmin && (
            <div className="flex flex-col gap-1 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="size-3" /> Administração SaaS
              </p>
              {adminNavItems.map((item) => (
                <NavRow key={item.url} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          )}

          {navigation.map((group) => {
            const filteredItems = group.items.filter((item) => {
              if (isReceptionist && item.url === "/financeiro") return false
              return true
            })

            if (filteredItems.length === 0) return null

            return (
              <div key={group.label} className="flex flex-col gap-1">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                  {group.label}
                </p>
                {filteredItems.map((item) => (
                  <NavRow key={item.url} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        {secondaryNavigation.map((item) => (
          <NavRow key={item.url} item={item} onNavigate={onNavigate} />
        ))}
        <div className="mt-3 rounded-xl bg-gradient-to-br from-accent to-secondary p-3.5">
          <p className="font-display text-[13px] font-semibold text-accent-foreground">Plano Premium</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            SaaS Ana Corso · Gestão Ativa
          </p>
        </div>
      </div>
    </div>
  )
}
