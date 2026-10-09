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

// ---------------------------------------------------------------------------
// Criptografia simétrica para segredos de integrações (ex.: tokens do Google).
// AES-256-GCM com chave derivada do SESSION_SECRET.
// ---------------------------------------------------------------------------

function secretKey() {
  const secret = process.env.SESSION_SECRET || "ana-corso-session-secret-change-in-production-32bytes"
  return crypto.createHash("sha256").update(`integrations:${secret}`).digest()
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((b) => b.toString("base64url")).join(".")
}

export function decryptSecret(payload: string): string {
  const [iv, tag, data] = payload.split(".").map((part) => Buffer.from(part, "base64url"))
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")
}

/** Assina um payload curto (ex.: `state` do OAuth) com HMAC. */
export function signPayload(payload: string): string {
  const mac = crypto.createHmac("sha256", secretKey()).update(payload).digest("base64url")
  return `${Buffer.from(payload).toString("base64url")}.${mac}`
}

export function verifySignedPayload(token: string): string | null {
  const [body, mac] = token.split(".")
  if (!body || !mac) return null
  const payload = Buffer.from(body, "base64url").toString("utf8")
  const expected = crypto.createHmac("sha256", secretKey()).update(payload).digest("base64url")
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  return payload
}
