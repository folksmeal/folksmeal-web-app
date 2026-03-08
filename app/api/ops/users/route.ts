import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import bcrypt from "bcryptjs"
import { z } from "zod"
import {
    apiResponse,
    apiError,
    handleApiRequest,
    parseBody,
} from "@/lib/api-utils"

const createUserSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

const updateUserSchema = z.object({
    id: z.string().min(1, "User ID is required"),
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
})

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15")))
        const skip = (page - 1) * limit
        const search = searchParams.get("search") || ""

        const where = {
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } }
                ]
            } : {})
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { name: "asc" },
                skip,
                take: limit,
            }),
            prisma.user.count({ where })
        ])

        return apiResponse({
            users: users.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                createdAt: u.createdAt.toISOString(),
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        })
    })
}

export async function POST(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { name, email, password } = await parseBody(request, createUserSchema)

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return apiError("Email already in use", 400, "EMAIL_IN_USE")
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        })

        return apiResponse({
            success: true,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
            },
        })
    })
}

export async function DELETE(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        if (!id) {
            return apiError("User ID is required", 400, "MISSING_ID")
        }

        const targetUser = await prisma.user.findUnique({ where: { id } })
        if (!targetUser) {
            return apiError("User not found", 404, "USER_NOT_FOUND")
        }

        // Prevent deleting the last admin
        const adminCount = await prisma.user.count()
        if (adminCount <= 1) {
            return apiError("Cannot delete the last admin", 400, "LAST_ADMIN")
        }

        await prisma.user.delete({ where: { id } })
        return apiResponse({ success: true })
    })
}

export async function PUT(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { id, name, email, password } = await parseBody(request, updateUserSchema)

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing && existing.id !== id) {
            return apiError("Email already in use", 400, "EMAIL_IN_USE")
        }

        const dataToUpdate: { name: string; email: string; password?: string } = { name, email }

        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, 12)
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: dataToUpdate,
        })

        return apiResponse({
            success: true,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
            },
        })
    })
}
