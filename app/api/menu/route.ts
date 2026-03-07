import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { addressId } = session.user
        if (!addressId) {
            return NextResponse.json({ error: "No location assigned" }, { status: 400 })
        }

        // Use the employee's timezone for accurate "tomorrow" calculation
        const timezone = session.user.locationTimezone || "Asia/Kolkata"
        const tomorrow = getTomorrowMidnightInTimezone(timezone)

        const menu = await prisma.menu.findUnique({
            where: {
                addressId_date: {
                    addressId,
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
            sideBeverage: menu.sideBeverage,
            notes: menu.notes,
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