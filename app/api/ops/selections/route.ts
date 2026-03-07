import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"
import { apiResponse, apiError, handleApiRequest } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get("date")
        let addressId = (searchParams.get("addressId") || user.addressId) as string | undefined

        if (user.role === "SUPERADMIN" && !addressId) {
            const firstAddress = await prisma.companyAddress.findFirst({
                orderBy: { createdAt: "asc" },
            })
            if (firstAddress) addressId = firstAddress.id
        }

        const whereClauseAddress = addressId ? { addressId } : {}

        let targetDate: Date
        if (dateParam) {
            targetDate = new Date(dateParam + "T00:00:00.000Z")
            if (isNaN(targetDate.getTime())) {
                return apiError("Invalid date format", 400, "INVALID_DATE")
            }
        } else {
            const timezone = (user.locationTimezone as string) || "Asia/Kolkata"
            targetDate = getTomorrowMidnightInTimezone(timezone)
        }

        const [selections, employeesWithoutSelection] = await Promise.all([
            prisma.mealSelection.findMany({
                where: {
                    date: targetDate,
                    employee: whereClauseAddress,
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
                    ...whereClauseAddress,
                    selections: {
                        none: { date: targetDate },
                    },
                },
                include: { company: true, address: true },
                orderBy: { name: "asc" },
            }),
        ])

        const optedIn = selections.filter((s) => s.status === "OPT_IN")
        const optedOut = selections.filter((s) => s.status === "OPT_OUT")

        const stats = {
            total: selections.length,
            optedIn: optedIn.length,
            optedOut: optedOut.length,
            vegCount: optedIn.filter((s) => s.preference === "VEG").length,
            nonvegCount: optedIn.filter((s) => s.preference === "NONVEG").length,
            totalEmployees: selections.length + employeesWithoutSelection.length,
            missingInput: employeesWithoutSelection.length,
        }

        const dateStr = targetDate.toISOString().split("T")[0]

        const selectionRows = selections.map((s) => ({
            employeeName: s.employee.name,
            employeeCode: s.employee.employeeCode,
            company: `${s.employee.company.name} - ${s.employee.address.city}`,
            status: s.status,
            preference: s.preference || null,
            date: dateStr,
            updatedAt: s.updatedAt.toISOString(),
        }))

        const noSelectionRows = employeesWithoutSelection.map((e) => ({
            employeeName: e.name,
            employeeCode: e.employeeCode,
            company: `${e.company.name} - ${e.address.city}`,
            status: "NO_SELECTION" as const,
            preference: null,
            date: dateStr,
            updatedAt: "",
        }))

        return apiResponse({
            date: dateStr,
            stats,
            rows: [...selectionRows, ...noSelectionRows],
        })
    })
}