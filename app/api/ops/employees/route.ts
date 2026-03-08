import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, getEffectiveAddressId } from "@/lib/auth-helpers"
import bcrypt from "bcryptjs"
import { z } from "zod"
import {
    apiResponse,
    apiError,
    handleApiRequest,
    parseBody,
} from "@/lib/api-utils"

const createEmployeeSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    employeeCode: z.string().min(1, "Employee code is required").max(50),
    password: z.string().min(6, "Password must be at least 6 characters"),
    defaultPreference: z.enum(["VEG", "NONVEG"]).optional().default("VEG"),
    companyId: z.string().min(1, "Company ID is required"),
    addressId: z.string().min(1, "Location ID is required"),
})

const updateEmployeeSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    employeeCode: z.string().min(1).max(50).optional(),
    password: z.string().min(6).optional(),
    defaultPreference: z.enum(["VEG", "NONVEG"]).optional(),
    addressId: z.string().min(1).optional(),
})

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { searchParams } = new URL(request.url)
        // We still allow a query param override if explicitly requested (e.g. by a future feature), 
        // but default to the session's effective address
        const queryAddressId = searchParams.get("addressId")
        const effectiveAddressId = queryAddressId || await getEffectiveAddressId(user)

        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
        const skip = (page - 1) * limit
        const search = searchParams.get("search") || ""

        const where = {
            ...(effectiveAddressId ? { addressId: effectiveAddressId } : {}),
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { employeeCode: { contains: search, mode: "insensitive" as const } }
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
            employees: employees.map((e) => ({
                id: e.id,
                name: e.name,
                employeeCode: e.employeeCode,
                defaultPreference: e.defaultPreference,
                companyId: e.companyId,
                addressId: e.addressId,
                companyName: e.company.name,
                addressCity: e.address.city,
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
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { name, employeeCode, password, defaultPreference, companyId, addressId } =
            await parseBody(request, createEmployeeSchema)

        // Verify the company and address exist
        const [company, address] = await Promise.all([
            prisma.company.findUnique({ where: { id: companyId } }),
            prisma.companyAddress.findUnique({ where: { id: addressId } }),
        ])

        if (!company) {
            return apiError("Company not found", 404, "COMPANY_NOT_FOUND")
        }
        if (!address) {
            return apiError("Location not found", 404, "ADDRESS_NOT_FOUND")
        }
        if (address.companyId !== companyId) {
            return apiError("Location does not belong to the selected company", 400, "ADDRESS_COMPANY_MISMATCH")
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const employee = await prisma.employee.create({
            data: {
                name,
                employeeCode,
                password: hashedPassword,
                defaultPreference,
                companyId,
                addressId,
            },
        })

        return apiResponse({
            success: true,
            employee: {
                id: employee.id,
                name: employee.name,
                employeeCode: employee.employeeCode,
            },
        })
    })
}

export async function PUT(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { id, password, ...updateData } = await parseBody(request, updateEmployeeSchema)

        const targetEmployee = await prisma.employee.findUnique({ where: { id } })
        if (!targetEmployee) {
            return apiError("Employee not found", 404, "EMPLOYEE_NOT_FOUND")
        }

        const data: Record<string, unknown> = { ...updateData }
        if (password) {
            data.password = await bcrypt.hash(password, 12)
        }

        const employee = await prisma.employee.update({
            where: { id },
            data,
        })

        return apiResponse({
            success: true,
            employee: { id: employee.id, name: employee.name },
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
            return apiError("Employee ID is required", 400, "MISSING_ID")
        }

        const targetEmployee = await prisma.employee.findUnique({ where: { id } })
        if (!targetEmployee) {
            return apiError("Employee not found", 404, "EMPLOYEE_NOT_FOUND")
        }

        await prisma.employee.delete({ where: { id } })
        return apiResponse({ success: true })
    })
}
