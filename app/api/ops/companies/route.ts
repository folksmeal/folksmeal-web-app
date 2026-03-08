import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import { z } from "zod"
import {
    apiResponse,
    apiError,
    handleApiRequest,
    ApiRequestError,
} from "@/lib/api-utils"

const createCompanySchema = z.object({
    name: z.string().min(1, "Company name is required").max(100),
    domain: z.string().max(100).optional(),
    icon: z.string().optional(),
})

const createAddressSchema = z.object({
    companyId: z.string().min(1, "Company ID is required"),
    city: z.string().min(1, "City is required").max(100),
    state: z.string().max(100).optional(),
    address: z.string().max(300).optional(),
    cutoffTime: z.string().regex(/^\d{2}:\d{2}$/, "Cutoff time must be HH:MM").optional(),
    timezone: z.string().optional(),
    workingDays: z.array(z.number().int().min(0).max(6)).optional(),
})

const updateCompanySchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    domain: z.string().max(100).optional(),
    icon: z.string().optional(),
})

const updateAddressSchema = z.object({
    id: z.string().min(1),
    city: z.string().min(1).max(100).optional(),
    state: z.string().max(100).optional(),
    address: z.string().max(300).optional(),
    cutoffTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().optional(),
    workingDays: z.array(z.number().int().min(0).max(6)).optional(),
})

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "5")))
        const search = searchParams.get("search")?.trim() || ""
        const skip = (page - 1) * limit

        const where = search
            ? { name: { contains: search, mode: "insensitive" as const } }
            : {}

        const [companies, total] = await Promise.all([
            prisma.company.findMany({
                where,
                include: {
                    addresses: { orderBy: { city: "asc" } },
                    _count: { select: { employees: true } },
                },
                orderBy: { name: "asc" },
                skip,
                take: limit,
            }),
            prisma.company.count({ where })
        ])

        return apiResponse({
            companies: companies.map((c) => ({
                id: c.id,
                name: c.name,
                icon: c.icon,
                domain: c.domain,
                employeeCount: c._count.employees,
                addresses: c.addresses.map((a) => ({
                    id: a.id,
                    city: a.city,
                    state: a.state,
                    address: a.address,
                    cutoffTime: a.cutoffTime,
                    timezone: a.timezone,
                    workingDays: a.workingDays,
                })),
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

        let body: Record<string, unknown>
        try {
            body = await request.json()
        } catch {
            throw new ApiRequestError("Invalid JSON body", 400, "INVALID_JSON")
        }

        const { type } = body

        if (type === "address") {
            const parsed = createAddressSchema.parse(body)
            // Verify the company exists before creating an address
            const company = await prisma.company.findUnique({ where: { id: parsed.companyId } })
            if (!company) {
                return apiError("Company not found", 404, "COMPANY_NOT_FOUND")
            }
            const address = await prisma.companyAddress.create({ data: parsed })
            return apiResponse({ success: true, address })
        }

        const parsed = createCompanySchema.parse(body)
        const company = await prisma.company.create({ data: parsed })
        return apiResponse({ success: true, company })
    })
}

export async function PUT(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        let body: Record<string, unknown>
        try {
            body = await request.json()
        } catch {
            throw new ApiRequestError("Invalid JSON body", 400, "INVALID_JSON")
        }

        const { type } = body

        if (type === "address") {
            const { id, ...data } = updateAddressSchema.parse(body)
            const address = await prisma.companyAddress.update({ where: { id }, data })
            return apiResponse({ success: true, address })
        }

        const { id, ...data } = updateCompanySchema.parse(body)
        const company = await prisma.company.update({ where: { id }, data })
        return apiResponse({ success: true, company })
    })
}

export async function DELETE(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        const type = searchParams.get("type")

        if (!id) {
            return apiError("ID is required", 400, "MISSING_ID")
        }

        if (type === "address") {
            // Check for employees assigned to this address before deletion
            const employeeCount = await prisma.employee.count({ where: { addressId: id } })
            if (employeeCount > 0) {
                return apiError(
                    `Cannot delete: ${employeeCount} employee(s) are assigned to this location. Reassign them first.`,
                    409,
                    "HAS_DEPENDENTS"
                )
            }
            await prisma.companyAddress.delete({ where: { id } })
        } else {
            // Check for employees in this company before deletion
            const employeeCount = await prisma.employee.count({ where: { companyId: id } })
            if (employeeCount > 0) {
                return apiError(
                    `Cannot delete: ${employeeCount} employee(s) belong to this company. Remove them first.`,
                    409,
                    "HAS_DEPENDENTS"
                )
            }
            await prisma.company.delete({ where: { id } })
        }

        return apiResponse({ success: true })
    })
}
