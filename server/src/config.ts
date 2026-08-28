import { z } from "zod"

const envSchema = z.object({
  PORT: z.string().default("3000").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().default("ana-corso-session-secret-change-in-production-32bytes"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
})

export const config = envSchema.parse({
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/saas_ana",
  SESSION_SECRET: process.env.SESSION_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL,
})
