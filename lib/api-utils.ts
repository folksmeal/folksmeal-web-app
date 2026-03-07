import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"

// ─── Response Types ──────────────────────────────────────────────────

export type ApiError = {
    error: string
    code?: string
    details?: unknown
}

// ─── Response Helpers ────────────────────────────────────────────────

export function apiResponse<T>(data: T, status = 200) {
    return NextResponse.json(data, { status })
}

export function apiError(message: string, status = 500, code?: string, details?: unknown) {
    const body: ApiError = { error: message }
    if (code) body.code = code
    if (details) body.details = details
    return NextResponse.json(body, { status })
}

// ─── Body Parsing ────────────────────────────────────────────────────

/**
 * Safely parse JSON body from a request and validate with a Zod schema.
 * Returns the parsed data or throws with a descriptive error.
 */
export async function parseBody<T>(request: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        throw new ApiRequestError("Invalid JSON body", 400, "INVALID_JSON")
    }

    const result = schema.safeParse(body)
    if (!result.success) {
        throw new ApiValidationError(result.error)
    }

    return result.data
}

// ─── Error Classes ───────────────────────────────────────────────────

export class ApiRequestError extends Error {
    public status: number
    public code?: string

    constructor(message: string, status: number = 400, code?: string) {
        super(message)
        this.name = "ApiRequestError"
        this.status = status
        this.code = code
    }
}

export class ApiValidationError extends Error {
    public zodError: z.ZodError

    constructor(zodError: z.ZodError) {
        super("Validation failed")
        this.name = "ApiValidationError"
        this.zodError = zodError
    }
}

// ─── Centralized Error Handler ───────────────────────────────────────

/**
 * Wraps an API route handler with centralized error handling.
 * Catches all known error types and returns appropriate HTTP responses.
 */
export async function handleApiRequest(
    handler: () => Promise<NextResponse>
): Promise<NextResponse> {
    try {
        return await handler()
    } catch (error) {
        console.error("[API_ERROR]", error)

        // Custom request errors (auth, not found, etc.)
        if (error instanceof ApiRequestError) {
            return apiError(error.message, error.status, error.code)
        }

        // Zod validation errors
        if (error instanceof ApiValidationError) {
            return apiError("Validation failed", 400, "VALIDATION_ERROR", error.zodError.format())
        }
        if (error instanceof z.ZodError) {
            return apiError("Validation failed", 400, "VALIDATION_ERROR", error.format())
        }

        // Prisma known errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                const target = (error.meta?.target as string[])?.join(", ") || "field"
                return apiError(`A record with this ${target} already exists`, 409, "DUPLICATE_ENTRY")
            }
            if (error.code === "P2025") {
                return apiError("Record not found", 404, "NOT_FOUND")
            }
            if (error.code === "P2003") {
                return apiError("Related record not found. Check that all referenced IDs exist.", 400, "FOREIGN_KEY_ERROR")
            }
        }

        // Generic unauthorized/forbidden
        if (error instanceof Error) {
            if (error.message === "Unauthorized") return apiError("Unauthorized", 401)
            if (error.message === "Forbidden") return apiError("Forbidden", 403)
        }

        return apiError("Internal server error", 500)
    }
}
