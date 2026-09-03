import { useState } from "react"
import { Outlet } from "react-router-dom"

import { Header } from "@/components/layout/Header"
import { SidebarNav } from "@/components/layout/SidebarNav"

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-[264px] flex-col border-r border-sidebar-border lg:flex">
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[264px]">
        <Header mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
