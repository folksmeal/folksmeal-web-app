import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = session.user.role as string
        if (role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const sessionUser = session.user
        const { addressId } = sessionUser
        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get("date")

        let targetDate: Date
        if (dateParam) {
            // dateParam is YYYY-MM-DD — always treat as UTC midnight
            targetDate = new Date(dateParam + "T00:00:00.000Z")
        } else {
            const timezone = session.user.locationTimezone || "Asia/Kolkata"
            targetDate = getTomorrowMidnightInTimezone(timezone)
        }

        const selections = await prisma.mealSelection.findMany({
            where: {
                date: targetDate,
                employee: {
                    addressId: addressId,
                },
            },
            include: {
                employee: {
                    include: {
                        company: true,
                        address: true,
                    },
                },
            },
            orderBy: { employee: { name: "asc" } },
        })

        const stats = {
            total: selections.length,
            optedIn: selections.filter((s) => s.status === "OPT_IN").length,
            optedOut: selections.filter((s) => s.status === "OPT_OUT").length,
            vegCount: selections.filter(
                (s) => s.status === "OPT_IN" && s.preference === "VEG"
            ).length,
            nonvegCount: selections.filter(
                (s) => s.status === "OPT_IN" && s.preference === "NONVEG"
            ).length,
        }

        const rows = selections.map((s) => ({
            employeeName: s.employee.name,
            employeeCode: s.employee.employeeCode,
            company: `${s.employee.company.name} - ${s.employee.address.city}`,
            status: s.status,
            preference: s.preference,
            date: s.date.toISOString().split("T")[0],
            updatedAt: s.updatedAt.toISOString(),
        }))

        return NextResponse.json({
            date: targetDate.toISOString().split("T")[0],
            stats,
            rows,
        })
    } catch (error) {
        console.error("[GET /api/ops/selections]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}