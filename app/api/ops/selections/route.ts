import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Returns all meal selections for a date + aggregate counts.
// Query params: ?date=YYYY-MM-DD (defaults to tomorrow)
// Requires: role = OPS

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if ((session.user as { role: string }).role !== "OPS") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }


        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get("date")

        let targetDate: Date
        if (dateParam) {
            targetDate = new Date(dateParam + "T00:00:00.000Z")
        } else {
            targetDate = new Date()
            targetDate.setDate(targetDate.getDate() + 1)
        }
        targetDate.setHours(0, 0, 0, 0)


        const selections = await prisma.mealSelection.findMany({
            where: { date: targetDate },
            include: {
                employee: {
                    include: { office: true },
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
            office: s.employee.office.name,
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
