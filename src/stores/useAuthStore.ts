import { create } from "zustand"
import { useClinicStore } from "./useClinicStore"

export type AuthUser = {
  id: string
  name: string
  email: string
  phone: string | null
  systemRole: string
  status: string
}

export type AuthClinic = {
  id: string
  name: string
  slug: string
  role: string
}

type AuthState = {
  user: AuthUser | null
  clinic: AuthClinic | null
  clinicRole: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  register: (data: {
    name: string
    email: string
    phone?: string
    password: string
    clinicName?: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  clinic: null,
  clinicRole: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch("/api/auth/me", {
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        set({
          user: data.user,
          clinic: data.clinic,
          clinicRole: data.clinic?.role || null,
          isAuthenticated: true,
          isLoading: false,
        })
        if (data.clinic) {
          useClinicStore.getState().update({
            name: data.clinic.name,
            professional: data.user.name,
            email: data.user.email,
          })
        }
      } else {
        set({
          user: null,
          clinic: null,
          clinicRole: null,
          isAuthenticated: false,
          isLoading: false,
        })
      }
    } catch {
      set({
        user: null,
        clinic: null,
        clinicRole: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        set({ error: data.error?.message || "Falha na autenticação." })
        return false
      }

      set({
        user: data.user,
        clinic: data.clinic,
        clinicRole: data.clinic?.role || null,
        isAuthenticated: true,
        error: null,
      })

      if (data.clinic) {
        useClinicStore.getState().update({
          name: data.clinic.name,
          professional: data.user.name,
          email: data.user.email,
        })
      }

      return true
    } catch (err: any) {
      set({ error: err.message || "Erro de conexão com o servidor." })
      return false
    }
  },

  register: async (formData) => {
    set({ error: null })
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        set({ error: data.error?.message || "Falha no cadastro." })
        return false
      }

      set({
        user: data.user,
        clinic: data.clinic,
        clinicRole: data.clinic?.role || null,
        isAuthenticated: true,
        error: null,
      })

      if (data.clinic) {
        useClinicStore.getState().update({
          name: data.clinic.name,
          professional: data.user.name,
          email: data.user.email,
        })
      }

      return true
    } catch (err: any) {
      set({ error: err.message || "Erro de conexão com o servidor." })
      return false
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Ignore network errors on logout
    }
    set({
      user: null,
      clinic: null,
      clinicRole: null,
      isAuthenticated: false,
      error: null,
    })
  },

  clearError: () => set({ error: null }),
}))
