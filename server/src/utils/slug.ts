import crypto from "node:crypto"
import { prisma } from "../db.js"

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Generate a unique slug for a clinic with random hex suffix fallback */
export async function generateUniqueClinicSlug(name: string): Promise<string> {
  const baseSlug = slugify(name) || "clinica"
  let slug = baseSlug

  const existing = await prisma.clinic.findUnique({ where: { slug } })
  if (!existing) {
    return slug
  }

  const randomSuffix = crypto.randomBytes(3).toString("hex")
  slug = `${baseSlug}-${randomSuffix}`

  return slug
}

/** Helper to generate fallback slug on database unique constraint collision (P2002) */
export function generateFallbackSlug(baseName: string): string {
  const baseSlug = slugify(baseName) || "clinica"
  const randomSuffix = crypto.randomBytes(4).toString("hex")
  return `${baseSlug}-${randomSuffix}`
}
