import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import { z } from "zod"

const createCompanySchema = z.object({
    name: z.string().min(1).max(100),
    domain: z.string().max(100).optional(),
})

const createAddressSchema = z.object({
    companyId: z.string(),
    city: z.string().min(1).max(100),
    state: z.string().max(100).optional(),
    address: z.string().max(300).optional(),
    cutoffTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().optional(),
    workingDays: z.array(z.number().int().min(0).max(6)).optional(),
})

const updateCompanySchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(100).optional(),
    domain: z.string().max(100).optional(),
})

const updateAddressSchema = z.object({
    id: z.string(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().max(100).optional(),
    address: z.string().max(300).optional(),
    cutoffTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().optional(),
    workingDays: z.array(z.number().int().min(0).max(6)).optional(),
})

export async function GET() {
    try {
        const user = await requireAdmin()
        if (!user) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const companies = await prisma.company.findMany({
            include: {
                addresses: {
                    orderBy: { city: "asc" },
                },
                _count: { select: { employees: true } },
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json({
            companies: companies.map((c) => ({
                id: c.id,
                name: c.name,
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
        })
    } catch (error) {
        console.error("[GET /api/ops/companies]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAdmin()
        if (!user) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { type } = body

        if (type === "address") {
            const parsed = createAddressSchema.safeParse(body)
            if (!parsed.success) {
                return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 })
            }
            const address = await prisma.companyAddress.create({ data: parsed.data })
            return NextResponse.json({ success: true, address })
        }

        const parsed = createCompanySchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 })
        }
        const company = await prisma.company.create({ data: parsed.data })
        return NextResponse.json({ success: true, company })
    } catch (error) {
        console.error("[POST /api/ops/companies]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await requireAdmin()
        if (!user) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { type } = body

        if (type === "address") {
            const parsed = updateAddressSchema.safeParse(body)
            if (!parsed.success) {
                return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 })
            }
            const { id, ...data } = parsed.data
            const address = await prisma.companyAddress.update({ where: { id }, data })
            return NextResponse.json({ success: true, address })
        }

        const parsed = updateCompanySchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 })
        }
        const { id, ...data } = parsed.data
        const company = await prisma.company.update({ where: { id }, data })
        return NextResponse.json({ success: true, company })
    } catch (error) {
        console.error("[PUT /api/ops/companies]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await requireAdmin()
        if (!user) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        const type = searchParams.get("type")

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 })
        }

        if (type === "address") {
            await prisma.companyAddress.delete({ where: { id } })
        } else {
            await prisma.company.delete({ where: { id } })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[DELETE /api/ops/companies]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
