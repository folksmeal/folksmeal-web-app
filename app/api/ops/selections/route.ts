import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"

export async function GET(request: NextRequest) {
    try {
        const user = await requireAdmin()
        if (!user) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { addressId } = user
        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get("date")

        let targetDate: Date
        if (dateParam) {
            targetDate = new Date(dateParam + "T00:00:00.000Z")
        } else {
            const timezone = user.locationTimezone || "Asia/Kolkata"
            targetDate = getTomorrowMidnightInTimezone(timezone)
        }

        const [selections, employeesWithoutSelection] = await Promise.all([
            prisma.mealSelection.findMany({
                where: {
                    date: targetDate,
                    employee: { addressId },
                },
                include: {
                    employee: {
                        include: { company: true, address: true },
                    },
                },
                orderBy: { employee: { name: "asc" } },
            }),
            prisma.employee.findMany({
                where: {
                    addressId,
                    selections: {
                        none: {
                            date: targetDate,
                        },
                    },
                },
                include: { company: true, address: true },
                orderBy: { name: "asc" },
            }),
        ])

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
            totalEmployees: selections.length + employeesWithoutSelection.length,
            missingInput: employeesWithoutSelection.length,
        }

        const selectionRows = selections.map((s) => ({
            employeeName: s.employee.name,
            employeeCode: s.employee.employeeCode,
            company: `${s.employee.company.name} - ${s.employee.address.city}`,
            status: s.status,
            preference: s.preference,
            date: s.date.toISOString().split("T")[0],
            updatedAt: s.updatedAt.toISOString(),
        }))

        const noSelectionRows = employeesWithoutSelection.map((e) => ({
            employeeName: e.name,
            employeeCode: e.employeeCode,
            company: `${e.company.name} - ${e.address.city}`,
            status: "NO_SELECTION",
            preference: null,
            date: targetDate.toISOString().split("T")[0],
            updatedAt: "",
        }))

        return NextResponse.json({
            date: targetDate.toISOString().split("T")[0],
            stats,
            rows: [...selectionRows, ...noSelectionRows],
        })
    } catch (error) {
        console.error("[GET /api/ops/selections]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}