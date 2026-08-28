import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/stores/useAuthStore"

export function AdminProtectedRoute() {
  const { user, isAuthenticated, isLoading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">Verificando permissões de administrador...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  if (user?.systemRole !== "admin") {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
