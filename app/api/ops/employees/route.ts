import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import bcrypt from "bcryptjs"
import { z } from "zod"

const createEmployeeSchema = z.object({
    name: z.string().min(1).max(100),
    employeeCode: z.string().min(1).max(50),
    password: z.string().min(6),
    defaultPreference: z.enum(["VEG", "NONVEG"]).optional(),
    role: z.enum(["EMPLOYEE", "SUPERADMIN"]).optional(),
    companyId: z.string().optional(),
    addressId: z.string().optional(),
})

const updateEmployeeSchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(100).optional(),
    employeeCode: z.string().min(1).max(50).optional(),
    password: z.string().min(6).optional(),
    defaultPreference: z.enum(["VEG", "NONVEG"]).optional(),
    role: z.enum(["EMPLOYEE", "SUPERADMIN"]).optional(),
    addressId: z.string().optional(),
})

export async function GET(request: NextRequest) {
    try {
        const user = await requireAdmin()
        if (!user) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const addressId = searchParams.get("addressId") || user.addressId

        const employees = await prisma.employee.findMany({
            where: { addressId },
            include: { company: true, address: true },
            orderBy: { name: "asc" },
        })

        return NextResponse.json({
            employees: employees.map((e) => ({
                id: e.id,
                name: e.name,
                employeeCode: e.employeeCode,
                defaultPreference: e.defaultPreference,
                role: e.role,
                companyId: e.companyId,
                addressId: e.addressId,
                companyName: e.company.name,
                addressCity: e.address.city,
                createdAt: e.createdAt.toISOString(),
            })),
        })
    } catch (error) {
        console.error("[GET /api/ops/employees]", error)
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
        const parsed = createEmployeeSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 })
        }

        const { name, employeeCode, password, defaultPreference, role, companyId, addressId } = parsed.data

        // Enforce tenant boundary: admin can only create employees for their assigned address
        if (addressId && addressId !== user.addressId) {
            return NextResponse.json({ error: "Cannot create employee for a different location" }, { status: 403 })
        }

        const existing = await prisma.employee.findUnique({ where: { employeeCode } })
        if (existing) {
            return NextResponse.json({ error: "Employee code already exists" }, { status: 409 })
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const employee = await prisma.employee.create({
            data: {
                name,
                employeeCode,
                password: hashedPassword,
                defaultPreference: defaultPreference || "VEG",
                role: role || "EMPLOYEE",
                companyId: companyId || user.companyId,
                addressId: addressId || user.addressId,
            },
        })

        return NextResponse.json({ success: true, employee: { id: employee.id, name: employee.name, employeeCode: employee.employeeCode } })
    } catch (error) {
        console.error("[POST /api/ops/employees]", error)
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
        const parsed = updateEmployeeSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 })
        }

        const { id, password, ...updateData } = parsed.data

        const targetEmployee = await prisma.employee.findUnique({ where: { id } })
        if (!targetEmployee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 })
        }

        // Enforce tenant boundary: admin can only edit employees in their assigned location
        if (targetEmployee.addressId !== user.addressId) {
            return NextResponse.json({ error: "Forbidden: Employee belongs to a different location" }, { status: 403 })
        }

        if (updateData.addressId && updateData.addressId !== user.addressId) {
            return NextResponse.json({ error: "Forbidden: Cannot move employee to a different location" }, { status: 403 })
        }

        const data: Record<string, unknown> = { ...updateData }
        if (password) {
            data.password = await bcrypt.hash(password, 12)
        }

        const employee = await prisma.employee.update({
            where: { id },
            data,
        })

        return NextResponse.json({ success: true, employee: { id: employee.id, name: employee.name } })
    } catch (error) {
        console.error("[PUT /api/ops/employees]", error)
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
        if (!id) {
            return NextResponse.json({ error: "Employee ID required" }, { status: 400 })
        }

        const targetEmployee = await prisma.employee.findUnique({ where: { id } })
        if (!targetEmployee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 })
        }

        // Enforce tenant boundary: admin can only delete employees in their assigned location
        if (targetEmployee.addressId !== user.addressId) {
            return NextResponse.json({ error: "Forbidden: Employee belongs to a different location" }, { status: 403 })
        }

        await prisma.employee.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[DELETE /api/ops/employees]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
