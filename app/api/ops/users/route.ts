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
import crypto from "crypto"
import { encryptText, decryptText } from "@/lib/encryption"

const createUserSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    role: z.enum(["SUPERADMIN", "ADMIN"]),
    companyId: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
    if (data.role === "ADMIN" && !data.companyId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyId"], message: "Company is required for company admins" })
    }
})

const updateUserSchema = z.object({
    id: z.string().min(1, "User ID is required"),
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    role: z.enum(["SUPERADMIN", "ADMIN"]),
    companyId: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
    if (data.role === "ADMIN" && !data.companyId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyId"], message: "Company is required for company admins" })
    }
})

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user || user.role !== "SUPERADMIN") return apiError("Forbidden", 403)

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
                include: { company: true },
                orderBy: { name: "asc" },
                skip,
                take: limit,
            }),
            prisma.user.count({ where })
        ])

        return apiResponse({
            users: users.map((u: { id: string; name: string; email: string; role: string; companyId: string | null; company: { name: string } | null; plainPassword: string | null; createdAt: Date }) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                companyId: u.companyId,
                companyName: u.company?.name ?? null,
                password: u.plainPassword ? decryptText(u.plainPassword) : null,
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
        if (!user || user.role !== "SUPERADMIN") return apiError("Forbidden", 403)

        const { name, email, password, role, companyId } = await parseBody(request, createUserSchema)

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return apiError("Email already in use", 400, "EMAIL_IN_USE")
        }

        const actualPassword = password || crypto.randomBytes(4).toString("hex")
        const hashedPassword = await bcrypt.hash(actualPassword, 12)
        const encryptedPlain = encryptText(actualPassword)

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                role,
                companyId: role === "ADMIN" ? companyId : null,
                password: hashedPassword,
                plainPassword: encryptedPlain,
            },
        })

        return apiResponse({
            success: true,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                companyId: newUser.companyId,
            },
        })
    })
}

export async function DELETE(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user || user.role !== "SUPERADMIN") return apiError("Forbidden", 403)

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        if (!id) {
            return apiError("User ID is required", 400, "MISSING_ID")
        }

        const targetUser = await prisma.user.findUnique({ where: { id } })
        if (!targetUser) {
            return apiError("User not found", 404, "USER_NOT_FOUND")
        }


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
        if (!user || user.role !== "SUPERADMIN") return apiError("Forbidden", 403)

        const { id, name, email, password, role, companyId } = await parseBody(request, updateUserSchema)

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing && existing.id !== id) {
            return apiError("Email already in use", 400, "EMAIL_IN_USE")
        }

        const dataToUpdate: { name: string; email: string; role: "SUPERADMIN" | "ADMIN"; companyId: string | null; password?: string; plainPassword?: string } = {
            name,
            email,
            role,
            companyId: role === "ADMIN" ? (companyId ?? null) : null
        }

        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, 12)
            dataToUpdate.plainPassword = encryptText(password)
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
                role: updatedUser.role,
                companyId: updatedUser.companyId,
            },
        })
    })
}
