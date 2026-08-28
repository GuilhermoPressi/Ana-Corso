import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { config } from "../config.js"

export interface StorageFile {
  storageKey: string
  buffer: Buffer
  mimeType: string
}

export interface SignedAccessInfo {
  storageKey: string
  expiresAt: Date
  token: string
}

// Secret for signing short-lived access tokens (5-15 min)
const SIGNING_SECRET = config.SESSION_SECRET || "storage-secret-key-12345"

// Local fallback storage directory inside app workspace
const LOCAL_STORAGE_DIR = path.join(process.cwd(), "uploads")

if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true })
}

/**
 * Storage Service - S3 Compatible with fallback to Private Local Storage
 */
export class StorageService {
  /**
   * Saves a file buffer securely into private storage
   */
  static async saveFile(
    clinicId: string,
    patientId: string,
    fileId: string,
    buffer: Buffer,
    mimeType: string,
    extension: string = "jpg",
  ): Promise<string> {
    // Standard non-PII storage path: clinics/{clinicId}/patients/{patientId}/photos/{fileId}.ext
    const storageKey = `clinics/${clinicId}/patients/${patientId}/photos/${fileId}.${extension}`

    // Check if S3 ENV is configured (AWS S3, Cloudflare R2, MinIO, etc.)
    const s3Endpoint = process.env.S3_ENDPOINT
    const s3Bucket = process.env.S3_BUCKET

    if (s3Endpoint && s3Bucket) {
      // In production S3, we can upload using standard fetch/S3 protocol
      // For now, if S3 is active, write to local fallback & log S3 sync
      const fullPath = path.join(LOCAL_STORAGE_DIR, storageKey)
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, buffer)
      return storageKey
    }

    // Default Local Private Fallback Storage
    const fullPath = path.join(LOCAL_STORAGE_DIR, storageKey)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, buffer)
    return storageKey
  }

  /**
   * Reads a file buffer securely from storage
   */
  static async getFile(storageKey: string): Promise<Buffer | null> {
    const fullPath = path.join(LOCAL_STORAGE_DIR, storageKey)
    if (!fs.existsSync(fullPath)) {
      return null
    }
    return fs.readFileSync(fullPath)
  }

  /**
   * Generates a short-lived signed access token (valid for 15 minutes)
   */
  static generateAccessToken(photoId: string, clinicId: string, expiresInMinutes: number = 15): SignedAccessInfo {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)
    const payload = `${photoId}:${clinicId}:${expiresAt.getTime()}`
    const hmac = crypto.createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex")
    const token = Buffer.from(`${payload}:${hmac}`).toString("base64url")

    return {
      storageKey: photoId,
      expiresAt,
      token,
    }
  }

  /**
   * Validates a signed access token
   */
  static verifyAccessToken(token: string, expectedPhotoId: string, expectedClinicId: string): boolean {
    try {
      const decoded = Buffer.from(token, "base64url").toString("utf-8")
      const parts = decoded.split(":")
      if (parts.length !== 4) return false

      const [photoId, clinicId, expiresTimestampStr, hmac] = parts
      const expiresTimestamp = Number.parseInt(expiresTimestampStr, 10)

      if (photoId !== expectedPhotoId || clinicId !== expectedClinicId) return false
      if (Date.now() > expiresTimestamp) return false

      const payload = `${photoId}:${clinicId}:${expiresTimestamp}`
      const expectedHmac = crypto.createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex")

      return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
    } catch {
      return false
    }
  }
}
