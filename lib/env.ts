import { z } from "zod"

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().optional(),

    // Auth.js (v5 uses AUTH_SECRET, not NEXTAUTH_SECRET)
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
    AUTH_URL: z.string().url().optional(),

    // Cron / automation (optional, but required by protected cron routes)
    CRON_SECRET: z.string().min(16).optional(),

    // App Environment
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format())
    throw new Error("Invalid environment variables")
}

export const env = result.data
