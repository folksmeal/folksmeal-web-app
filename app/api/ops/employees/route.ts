import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, getEffectiveAddressId } from "@/lib/auth-helpers"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { apiResponse, apiError, handleApiRequest, parseBody } from "@/lib/api-utils"
import crypto from "crypto"
import { encryptText, decryptText } from "@/lib/encryption"
import { isCompanyAdminFeatureEnabled } from "@/lib/company-admin-features"
import type { MealPreference } from "@/types/employee"

const createEmployeeSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    employeeCode: z.string().min(1, "Employee code is required").max(50),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    defaultPreference: z.enum(["VEG", "NONVEG"]).optional().default("VEG"),
    companyId: z.string().min(1, "Company ID is required"),
    addressId: z.string().min(1, "Location ID is required"),
})

const updateEmployeeSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    employeeCode: z.string().min(1).max(50).optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    password: z.string().min(6).optional(),
    defaultPreference: z.enum(["VEG", "NONVEG"]).optional(),
    addressId: z.string().min(1).optional(),
})

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const adminUser = await requireAdmin()
        if (!adminUser) return apiError("Forbidden", 403)
        if (!(await isCompanyAdminFeatureEnabled(adminUser, "employeeManagement"))) {
            return apiError("Employee management is disabled for this company admin", 403, "FEATURE_DISABLED")
        }

        const { searchParams } = new URL(request.url)
        const queryAddressId = searchParams.get("addressId")
        const effectiveAddressId = queryAddressId || await getEffectiveAddressId(adminUser)

        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
        const skip = (page - 1) * limit
        const search = searchParams.get("search") || ""

        const where = {
            ...(effectiveAddressId ? { addressId: effectiveAddressId } : {}),
            ...(adminUser.role === "ADMIN" && adminUser.companyId ? { companyId: adminUser.companyId } : {}),
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { employeeCode: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } }
                ]
            } : {})
        }

        const [employees, total] = await Promise.all([
            prisma.employee.findMany({
                where,
                include: { company: true, address: true },
                orderBy: { name: "asc" },
                skip,
                take: limit,
            }),
            prisma.employee.count({ where }),
        ])

        return apiResponse({
            employees: employees.map((e: { id: string; name: string; employeeCode: string; email: string | null; defaultPreference: string; companyId: string; addressId: string; company: { name: string }; address: { city: string }; plainPassword: string | null; createdAt: Date }) => ({
                id: e.id,
                name: e.name,
                employeeCode: e.employeeCode,
                email: e.email,
                defaultPreference: e.defaultPreference,
                companyId: e.companyId,
                addressId: e.addressId,
                companyName: e.company.name,
                addressCity: e.address.city,
                password: e.plainPassword ? decryptText(e.plainPassword) : null,
                createdAt: e.createdAt.toISOString(),
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
        const adminUser = await requireAdmin()
        if (!adminUser) return apiError("Forbidden", 403)
        if (!(await isCompanyAdminFeatureEnabled(adminUser, "employeeManagement"))) {
            return apiError("Employee management is disabled for this company admin", 403, "FEATURE_DISABLED")
        }

        const body = await parseBody(request, createEmployeeSchema)
        const { name, employeeCode, email, password, defaultPreference, companyId, addressId } = body

        const [company, address] = await Promise.all([
            prisma.company.findUnique({ where: { id: companyId } }),
            prisma.companyAddress.findUnique({ where: { id: addressId } }),
        ])

        if (!company || !address) {
            return apiError("Company or Location not found", 404)
        }

        if (adminUser.role === "ADMIN" && companyId !== adminUser.companyId) {
            return apiError("Forbidden: Cannot create employee for another company", 403, "FORBIDDEN")
        }

        if (address.companyId !== companyId) {
            return apiError("Location mismatch", 400)
        }

        const actualPassword = (password as string) || crypto.randomBytes(4).toString("hex")
        const hashedPassword = await bcrypt.hash(actualPassword, 12)
        const encryptedPlain = encryptText(actualPassword)

        const employee = await prisma.employee.create({
            data: {
                name,
                employeeCode,
                email: email || null,
                password: hashedPassword,
                plainPassword: encryptedPlain,
                defaultPreference,
                companyId,
                addressId,
            },
        })

        return apiResponse({
            success: true,
            employee: { id: employee.id, name: employee.name, employeeCode: employee.employeeCode },
        })
    })
}

export async function PUT(request: NextRequest) {
    return handleApiRequest(async () => {
        const adminUser = await requireAdmin()
        if (!adminUser) return apiError("Forbidden", 403)
        if (!(await isCompanyAdminFeatureEnabled(adminUser, "employeeManagement"))) {
            return apiError("Employee management is disabled for this company admin", 403, "FEATURE_DISABLED")
        }

        const { id, password, email, ...updateData } = await parseBody(request, updateEmployeeSchema)

        const target = await prisma.employee.findUnique({ where: { id } })
        if (!target) return apiError("Employee not found", 404)

        if (adminUser.role === "ADMIN" && target.companyId !== adminUser.companyId) {
            return apiError("Forbidden: Cannot edit employee of another company", 403, "FORBIDDEN")
        }

        const data: { [key: string]: string | undefined | null | MealPreference } = { ...updateData }

        // Also verify they aren't trying to change the company implicitly via a bad address
        if (updateData.addressId && adminUser.role === "ADMIN") {
            const newAddress = await prisma.companyAddress.findUnique({ where: { id: updateData.addressId } })
            if (newAddress?.companyId !== adminUser.companyId) {
                return apiError("Forbidden: Cannot move employee to another company's location", 403, "FORBIDDEN")
            }
        }
        if (email !== undefined) data.email = email || null

        if (password) {
            data.password = await bcrypt.hash(password as string, 12)
            data.plainPassword = encryptText(password as string)
        }

        const employee = await prisma.employee.update({
            where: { id },
            data,
        })

        return apiResponse({ success: true, employee: { id: employee.id, name: employee.name } })
    })
}

export async function DELETE(request: NextRequest) {
    return handleApiRequest(async () => {
        const adminUser = await requireAdmin()
        if (!adminUser) return apiError("Forbidden", 403)
        if (!(await isCompanyAdminFeatureEnabled(adminUser, "employeeManagement"))) {
            return apiError("Employee management is disabled for this company admin", 403, "FEATURE_DISABLED")
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        if (!id) return apiError("ID required", 400)

        const target = await prisma.employee.findUnique({ where: { id } })
        if (!target) return apiError("Employee not found", 404)

        if (adminUser.role === "ADMIN" && target.companyId !== adminUser.companyId) {
            return apiError("Forbidden: Cannot delete employee of another company", 403, "FORBIDDEN")
        }

        await prisma.employee.delete({ where: { id } })
        return apiResponse({ success: true })
    })
}
