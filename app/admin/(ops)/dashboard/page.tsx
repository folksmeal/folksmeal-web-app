import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"
import { OpsDashboard } from "@/components/ops/ops-dashboard"

import { getEffectiveAddressId } from "@/lib/auth-helpers"

export default async function OpsDashboardPage({ searchParams }: { searchParams: Promise<{ date?: string, status?: string, page?: string }> }) {
    const session = await auth()
    if (!session?.user) return null

    const sessionUser = session.user
    const timezone = (sessionUser.locationTimezone as string) || "Asia/Kolkata"

    const params = await searchParams
    let targetDate: Date;
    if (params.date) {
        targetDate = new Date(`${params.date}T00:00:00Z`);
        if (isNaN(targetDate.getTime())) {
            targetDate = getTomorrowMidnightInTimezone(timezone)
        }
    } else {
        targetDate = getTomorrowMidnightInTimezone(timezone)
    }

    const statusParam = params.status || "all"
    const page = Math.max(1, parseInt(params.page || "1"))
    const limit = 15

    const effectiveAddressId = await getEffectiveAddressId(sessionUser)

    const whereClauseAddress = effectiveAddressId ? { addressId: effectiveAddressId } : {}

    const [selections, allEmployees] = await Promise.all([
        prisma.mealSelection.findMany({
            where: {
                date: targetDate,
                employee: whereClauseAddress,
            },
            include: {
                employee: { include: { company: true, address: true } },
            },
            orderBy: { employee: { name: "asc" } },
        }),
        prisma.employee.findMany({
            where: whereClauseAddress,
            include: { company: true, address: true },
            orderBy: { name: "asc" },
        }),
    ])

    const totalEmployees = allEmployees.length

    const selectionEmployeeIds = new Set(selections.map((s) => s.employeeId))
    const employeesWithoutSelection = allEmployees.filter(
        (e) => !selectionEmployeeIds.has(e.id)
    )

    const stats = {
        total: selections.length,
        optedIn: selections.filter((s) => s.status === "OPT_IN").length,
        optedOut: selections.filter((s) => s.status === "OPT_OUT").length,
        vegCount: selections.filter((s) => s.status === "OPT_IN" && s.preference === "VEG").length,
        nonvegCount: selections.filter((s) => s.status === "OPT_IN" && s.preference === "NONVEG").length,
        totalEmployees,
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
        status: "NO_SELECTION" as const,
        preference: null,
        date: targetDate.toISOString().split("T")[0],
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

    const totalRows = filteredRows.length
    const paginatedRows = filteredRows.slice((page - 1) * limit, page * limit)

    let companyName = "Select Company"
    if (sessionUser.companyName && sessionUser.addressCity) {
        companyName = `${sessionUser.companyName} - ${sessionUser.addressCity}`
    } else if (effectiveAddressId) {
        const address = await prisma.companyAddress.findUnique({
            where: { id: effectiveAddressId },
            include: { company: true }
        })
        if (address) {
            companyName = `${address.company.name} - ${address.city}`
        }
    }

    return (
        <OpsDashboard
            userName={sessionUser.name || "Admin"}
            companyName={companyName}
            initialDate={targetDate.toISOString().split("T")[0]}
            initialRows={paginatedRows}
            totalRows={totalRows}
            initialStats={stats}
            basePath="/admin"
        />
    )
}