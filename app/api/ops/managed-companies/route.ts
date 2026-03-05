import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Returns a list of all companies the user is authorized to manage
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = session.user.role

        if (role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const locations = await prisma.companyAddress.findMany({
            include: {
                company: true
            },
            orderBy: [
                { company: { name: 'asc' } },
                { city: 'asc' }
            ]
        })

        // Map it to a simpler format for the UI
        const companies = locations.map(loc => ({
            id: loc.id,
            name: `${loc.company.name} - ${loc.city}`,
            companyId: loc.companyId,
            companyName: loc.company.name,
            addressCity: loc.city,
            locationTimezone: loc.timezone
        }))

        return NextResponse.json({ companies })

    } catch (error) {
        console.error("[GET /api/ops/managed-companies]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
