import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ─── GET /api/menu ─────────────────────────────────────────────────
// Returns tomorrow's menu for the authenticated employee's office.

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { officeId } = session.user as any

        // Tomorrow's date (midnight, no time component)
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        const menu = await prisma.menu.findUnique({
            where: {
                officeId_date: {
                    officeId,
                    date: tomorrow,
                },
            },
        })

        if (!menu) {
            return NextResponse.json({
                date: tomorrow.toISOString(),
                vegItem: null,
                nonvegItem: null,
                available: false,
            })
        }

        return NextResponse.json({
            date: menu.date.toISOString(),
            vegItem: menu.vegItem,
            nonvegItem: menu.nonvegItem,
            available: true,
        })
    } catch (error) {
        console.error("[GET /api/menu]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
