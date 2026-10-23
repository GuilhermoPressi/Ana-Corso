import { useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { InboxNotifier } from "@/components/crm/InboxNotifier"
import { Header } from "@/components/layout/Header"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { DisconnectedBanner } from "@/components/crm/DisconnectedBanner"
import { canAccessPath, homePathFor } from "@/lib/roles"
import { useAuthStore } from "@/stores/useAuthStore"

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = useAuthStore((s) => s.clinicRole)
  const { pathname } = useLocation()

  // Perfis restritos (ex.: Comercial) só abrem as telas liberadas.
  if (!canAccessPath(role, pathname)) return <Navigate to={homePathFor(role)} replace />

  return (
    <div className="flex min-h-screen bg-background">
      <InboxNotifier />
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-[264px] flex-col border-r border-sidebar-border lg:flex">
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[264px]">
        <Header mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <DisconnectedBanner />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
