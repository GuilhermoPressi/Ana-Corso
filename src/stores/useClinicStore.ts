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

export const demoClinicProfile: ClinicProfile = {
  name: "Clínica Ana Corso",
  professional: "Dra. Ana Corso",
  registry: "CRBM 12.345",
  address: "Rua Padre Chagas, 240 · sala 703",
  city: "Porto Alegre · RS",
  phone: "(51) 3333-4455",
  email: "contato@anacorso.com.br",
  instagram: "@clinicaanacorso",
}

type ClinicState = {
  profile: ClinicProfile
  update: (patch: Partial<ClinicProfile>) => void
  resetToClean: () => void
  restoreDemo: () => void
}

export const useClinicStore = create<ClinicState>((set) => ({
  profile: cleanClinicProfile,

  update: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
  resetToClean: () => set({ profile: cleanClinicProfile }),
  restoreDemo: () => set({ profile: demoClinicProfile }),
}))

