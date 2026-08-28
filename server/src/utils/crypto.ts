import crypto from "node:crypto"
import bcrypt from "bcryptjs"

/** Hash a plain text password using bcrypt */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

/** Verify password against hash */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** Generate a secure random token for sessions */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/** Hash token using SHA-256 before storing in database */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}
