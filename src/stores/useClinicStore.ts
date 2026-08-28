import { create } from "zustand"

/** Dados da clínica usados em documentos, propostas e conteúdo. */
export type ClinicProfile = {
  name: string
  professional: string
  registry: string
  address: string
  city: string
  phone: string
  email: string
  instagram: string
}

export const cleanClinicProfile: ClinicProfile = {
  name: "Minha Clínica",
  professional: "Dra. Profissional",
  registry: "CRBM 00.000",
  address: "Endereço da Clínica",
  city: "Sua Cidade · UF",
  phone: "(00) 00000-0000",
  email: "contato@minhaclinica.com.br",
  instagram: "@minhaclinica",
}

type ClinicState = {
  profile: ClinicProfile
  loading: boolean
  error: string | null

  fetchProfile: () => Promise<void>
  update: (patch: Partial<ClinicProfile>) => Promise<boolean>
  setLocalProfile: (patch: Partial<ClinicProfile>) => void
}

export const useClinicStore = create<ClinicState>((set, get) => ({
  profile: cleanClinicProfile,
  loading: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch("/api/clinic")
      if (res.ok) {
        const data = await res.json()
        const c = data.clinic
        if (c) {
          set({
            profile: {
              name: c.name || "Minha Clínica",
              professional: c.professionalName || "Dra. Profissional",
              registry: c.professionalRegistry || "CRBM 00.000",
              address: c.address || "",
              city: c.city || "",
              phone: c.phone || "",
              email: c.email || "",
              instagram: c.instagram || "",
            },
            loading: false,
          })
        }
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  update: async (patch) => {
    const current = get().profile
    const updatedLocal = { ...current, ...patch }
    set({ profile: updatedLocal, loading: true, error: null })

    try {
      const res = await fetch("/api/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: patch.name,
          professionalName: patch.professional,
          professionalRegistry: patch.registry,
          address: patch.address,
          city: patch.city,
          phone: patch.phone,
          email: patch.email,
          instagram: patch.instagram,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        set({ error: data.error?.message || "Erro ao atualizar clínica.", loading: false })
        return false
      }

      set({ loading: false, error: null })
      return true
    } catch (err: any) {
      set({ error: err.message || "Erro de conexão.", loading: false })
      return false
    }
  },

  setLocalProfile: (patch) =>
    set((state) => ({ profile: { ...state.profile, ...patch } })),
}))
