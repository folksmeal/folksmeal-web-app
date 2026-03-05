import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Returns a list of all offices the user is authorized to manage
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = session.user.role

        if (role !== "OPS" && role !== "SUPERADMIN" && role !== "ORG_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // SUPERADMIN can see all offices across all companies
        if (role === "SUPERADMIN") {
            const offices = await prisma.office.findMany({
                include: { company: true },
                orderBy: [
                    { company: { name: 'asc' } },
                    { name: 'asc' }
                ]
            })

            return NextResponse.json({ offices })
        }

        // ORG_ADMIN can see all offices within their specific company
        if (role === "ORG_ADMIN") {
            const companyId = session.user.companyId
            const offices = await prisma.office.findMany({
                where: { companyId },
                include: { company: true },
                orderBy: { name: 'asc' }
            })

            return NextResponse.json({ offices })
        }

        // Standard OPS can only see their assigned office
        // Usually they wouldn't even use the switcher, but we return their single office for completeness
        const officeId = session.user.officeId
        const offices = await prisma.office.findMany({
            where: { id: officeId },
            include: { company: true },
        })

        return NextResponse.json({ offices })

    } catch (error) {
        console.error("[GET /api/ops/managed-offices]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
