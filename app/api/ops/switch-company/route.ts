import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Used by SUPERADMIN and ORG_ADMIN to switch their active manageable office context
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = session.user.role

        if (role !== "SUPERADMIN" && role !== "ORG_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { officeId } = body

        if (!officeId) {
            return NextResponse.json({ error: "Office ID is required" }, { status: 400 })
        }

        // Verify the office exists and the user is allowed to switch to it
        const office = await prisma.office.findUnique({
            where: { id: officeId },
            include: { company: true }
        })

        if (!office) {
            return NextResponse.json({ error: "Office not found" }, { status: 404 })
        }

        // Check ORG_ADMIN boundary
        if (role === "ORG_ADMIN") {
            const userCompanyId = session.user.companyId
            if (office.companyId !== userCompanyId) {
                return NextResponse.json({ error: "Cannot switch to an office outside your organization" }, { status: 403 })
            }
        }

        // The actual session update happens via NextAuth's update() method on the client side,
        // which triggers the jwt() callback in lib/auth.ts with the `trigger === "update"` flag.
        // So this API route is mainly for server-side validation before the client calls update().

        return NextResponse.json({
            success: true,
            newOffice: {
                officeId: office.id,
                officeName: office.name,
                companyId: office.companyId,
                companyName: office.company.name,
                officeTimezone: office.timezone
            }
        })

    } catch (error) {
        console.error("[POST /api/ops/switch-company]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
