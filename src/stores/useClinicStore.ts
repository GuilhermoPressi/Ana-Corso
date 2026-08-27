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

type ClinicState = {
  profile: ClinicProfile
  update: (patch: Partial<ClinicProfile>) => void
}

export const useClinicStore = create<ClinicState>((set) => ({
  profile: {
    name: "Clínica Ana Corso",
    professional: "Dra. Ana Corso",
    registry: "CRBM 12.345",
    address: "Rua Padre Chagas, 240 · sala 703",
    city: "Porto Alegre · RS",
    phone: "(51) 3333-4455",
    email: "contato@anacorso.com.br",
    instagram: "@clinicaanacorso",
  },

  update: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
}))
