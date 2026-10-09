import { create } from "zustand"

import { crmApi, type CrmTag, type TagColor } from "@/lib/crm-api"

type TagState = {
  tags: CrmTag[]
  loaded: boolean
  load: () => Promise<void>
  create: (name: string, color: TagColor) => Promise<CrmTag>
  update: (id: string, patch: { name?: string; color?: TagColor }) => Promise<CrmTag>
  remove: (id: string) => Promise<void>
}

/** Etiquetas da clínica, compartilhadas entre Conversas e Contatos. */
export const useTagStore = create<TagState>((set) => ({
  tags: [],
  loaded: false,

  load: async () => {
    const { tags } = await crmApi.listTags()
    set({ tags, loaded: true })
  },

  create: async (name, color) => {
    const { tag } = await crmApi.createTag({ name, color })
    set((state) => ({ tags: [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) }))
    return tag
  },

  update: async (id, patch) => {
    const { tag } = await crmApi.updateTag(id, patch)
    set((state) => ({
      tags: state.tags
        .map((t) => (t.id === id ? { ...t, ...tag } : t))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    return tag
  },

  remove: async (id) => {
    await crmApi.deleteTag(id)
    set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }))
  },
}))
