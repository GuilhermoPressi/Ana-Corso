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
  clinics: AuthClinic[]
  clinicRole: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  initialize: () => Promise<void>
  switchClinic: (clinicId: string) => Promise<void>
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  clinic: null,
  clinics: [],
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
          clinics: data.clinics || [],
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
          clinics: [],
          clinicRole: null,
          isAuthenticated: false,
          isLoading: false,
        })
      }
    } catch {
      set({
        user: null,
        clinic: null,
        clinics: [],
        clinicRole: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  switchClinic: async (clinicId: string) => {
    try {
      // Set header or cookie x-clinic-id
      document.cookie = `ana_corso_clinic_id=${clinicId}; path=/; max-age=${30 * 24 * 60 * 60}`
      await get().initialize()
      window.location.reload()
    } catch {
      // ignore
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

      const contentType = response.headers.get("content-type") || ""
      let data: any = null

      if (contentType.includes("application/json")) {
        try {
          data = await response.json()
        } catch {
          data = null
        }
      }

      if (!response.ok) {
        const errorMsg =
          data?.error?.message ||
          "Não foi possível conectar ao servidor. Tente novamente em alguns instantes."
        set({ error: errorMsg })
        return false
      }

      if (!data || !data.user) {
        set({ error: "Não foi possível conectar ao servidor. Tente novamente em alguns instantes." })
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
    } catch {
      set({ error: "Não foi possível conectar ao servidor. Tente novamente em alguns instantes." })
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

      const contentType = response.headers.get("content-type") || ""
      let data: any = null

      if (contentType.includes("application/json")) {
        try {
          data = await response.json()
        } catch {
          data = null
        }
      }

      if (!response.ok) {
        const errorMsg =
          data?.error?.message ||
          "Não foi possível conectar ao servidor. Tente novamente em alguns instantes."
        set({ error: errorMsg })
        return false
      }

      if (!data || !data.user) {
        set({ error: "Não foi possível conectar ao servidor. Tente novamente em alguns instantes." })
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
    } catch {
      set({ error: "Não foi possível conectar ao servidor. Tente novamente em alguns instantes." })
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
