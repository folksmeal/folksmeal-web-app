import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, getEffectiveAddressId } from "@/lib/auth-helpers"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"
import { apiResponse, apiError, handleApiRequest } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get("date")
        const statusParam = searchParams.get("status") || "all"
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15")))

        const queryAddressId = searchParams.get("addressId")
        const effectiveAddressId = queryAddressId || await getEffectiveAddressId(user)

        const whereClauseAddress = {
            ...(effectiveAddressId ? { addressId: effectiveAddressId } : {}),
            ...(user.role === "ADMIN" && user.companyId ? { companyId: user.companyId } : {})
        }

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

        const allRows = [...selectionRows, ...noSelectionRows]

        const filteredRows = allRows.filter((row) => {
            if (statusParam === "all") return true
            if (statusParam === "opted_in") return row.status === "OPT_IN"
            if (statusParam === "opted_out") return row.status === "OPT_OUT"
            if (statusParam === "no_selection") return row.status === "NO_SELECTION"
            return true
        })

        const total = filteredRows.length
        const totalPages = Math.ceil(total / limit)
        const paginatedRows = filteredRows.slice((page - 1) * limit, page * limit)

        return apiResponse({
            date: dateStr,
            stats,
            rows: paginatedRows,
            pagination: {
                total,
                page,
                limit,
                totalPages,
            }
        })
    })
}